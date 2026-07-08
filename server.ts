import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // JSON middleware
  app.use(express.json());

  // Store active Web frontend connections
  const webClients = new Set<WebSocket>();
  // Store active physical phone connections
  // Key is custom ID, value is client info
  const phoneClients = new Map<string, {
    ws: WebSocket;
    id: string;
    name: string;
    ip: string;
    width?: number;
    height?: number;
    sdkInt?: number;
  }>();

  // Helper to generate IDs
  let nextClientId = 1;
  const generateId = () => `device_${nextClientId++}_${Math.random().toString(36).substring(2, 6)}`;

  // Send message to all connected browsers
  const broadcastToWeb = (msg: any) => {
    const dataStr = JSON.stringify(msg);
    webClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(dataStr);
      }
    });
  };

  // Setup WebSocket Server on the main Express server
  // This handles browser clients and optional custom phone connections via port 3000
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

    if (pathname === '/api/ws/web' || pathname === '/api/ws/phone') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = req.url || '';
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').replace(/^.*:/, '');

    if (url.includes('/api/ws/web')) {
      // 1. Browser client connected
      webClients.add(ws);
      console.log(`[Web Studio] Browser UI connected from ${ip}`);

      // Send the current list of connected physical devices
      const devices = Array.from(phoneClients.values()).map(p => ({
        id: p.id,
        name: p.name,
        ip: p.ip,
        width: p.width,
        height: p.height,
        sdkInt: p.sdkInt
      }));
      ws.send(JSON.stringify({ type: 'device_list', devices }));

      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString());
          
          if (msg.type === 'run_on_phone') {
            const { targetDeviceId, code, name } = msg;
            console.log(`[Web Studio] Command 'run' received for device: ${targetDeviceId}`);

            // Send standard Auto.js VS Code run payload
            const payload = JSON.stringify({
              type: 'command',
              cmd: 'run',
              code: code,
              name: name || 'remote_script.js'
            });

            if (targetDeviceId === 'all') {
              phoneClients.forEach(p => {
                if (p.ws.readyState === WebSocket.OPEN) p.ws.send(payload);
              });
            } else {
              const target = phoneClients.get(targetDeviceId);
              if (target && target.ws.readyState === WebSocket.OPEN) {
                target.ws.send(payload);
              }
            }
          } else if (msg.type === 'stop_on_phone') {
            const { targetDeviceId, name } = msg;
            console.log(`[Web Studio] Command 'stop' received for device: ${targetDeviceId}`);

            const payload = JSON.stringify({
              type: 'command',
              cmd: 'stop',
              name: name || 'remote_script.js'
            });

            if (targetDeviceId === 'all') {
              phoneClients.forEach(p => {
                if (p.ws.readyState === WebSocket.OPEN) p.ws.send(payload);
              });
            } else {
              const target = phoneClients.get(targetDeviceId);
              if (target && target.ws.readyState === WebSocket.OPEN) {
                target.ws.send(payload);
              }
            }
          }
        } catch (err) {
          console.error('[Web Studio] Error parsing message from Web client:', err);
        }
      });

      ws.on('close', () => {
        webClients.delete(ws);
        console.log(`[Web Studio] Browser UI disconnected`);
      });

    } else if (url.includes('/api/ws/phone')) {
      // 2. Custom Phone client connected directly on port 3000
      handlePhoneConnection(ws, ip);
    }
  });

  // Common handler for physical phone connection
  function handlePhoneConnection(ws: WebSocket, ip: string) {
    const id = generateId();
    let name = `安卓手机 (${ip})`;
    let detailsRegistered = false;

    console.log(`[Remote Phone] Device initiating connection from ${ip}`);

    // Standard Auto.js extension response
    const sendHelloResponse = () => {
      ws.send(JSON.stringify({ type: 'hello', data: 'ok' }));
    };

    ws.on('message', (message) => {
      try {
        const rawText = message.toString();
        // Support potential non-JSON or raw text logs if any client uses that
        let msg: any;
        try {
          msg = JSON.parse(rawText);
        } catch {
          // If it's pure text log, treat it as custom log message
          broadcastToWeb({
            type: 'phone_log',
            deviceId: id,
            logType: 'log',
            text: rawText
          });
          return;
        }

        // 1. Handle Hello / Handshake from Auto.js app
        if (msg.type === 'hello') {
          const data = msg.data || {};
          name = data.device_name || `手机-${id.slice(-4)}`;
          const width = data.width || 1080;
          const height = data.height || 2400;
          const sdkInt = data.sdkInt || 29;

          phoneClients.set(id, {
            ws,
            id,
            name,
            ip,
            width,
            height,
            sdkInt
          });
          detailsRegistered = true;

          sendHelloResponse();

          // Notify browser frontends
          broadcastToWeb({
            type: 'device_connected',
            device: { id, name, ip, width, height, sdkInt }
          });
          console.log(`[Remote Phone] Device successfully verified: ${name} [${ip}]`);
          return;
        }

        // If the client connected but didn't send 'hello' yet, register it anyway
        if (!detailsRegistered) {
          phoneClients.set(id, { ws, id, name, ip });
          detailsRegistered = true;
          broadcastToWeb({
            type: 'device_connected',
            device: { id, name, ip }
          });
        }

        // 2. Handle standard logs sent back from Auto.js
        if (msg.type === 'log') {
          const text = msg.log || msg.data || msg.text || '';
          const logType = msg.log_type || msg.level || 'log'; // info, warn, error, log
          broadcastToWeb({
            type: 'phone_log',
            deviceId: id,
            deviceName: name,
            logType: logType,
            text: String(text)
          });
        }
      } catch (err) {
        console.error('[Remote Phone] Error processing device message:', err);
      }
    });

    ws.on('close', () => {
      if (phoneClients.has(id)) {
        phoneClients.delete(id);
        broadcastToWeb({
          type: 'device_disconnected',
          id
        });
        console.log(`[Remote Phone] Device disconnected: ${name}`);
      }
    });

    ws.on('error', (err) => {
      console.error(`[Remote Phone] WebSocket Error on device ${name}:`, err);
    });
  }

  // 3. Spawning secondary WebSocket server on port 9375 (The standard Auto.js extension port)
  // This lets the user connect using standard "Connect to Computer" in Auto.js app on phone!
  try {
    const standardAutoJsWss = new WebSocketServer({ port: 9375 });
    standardAutoJsWss.on('connection', (ws: WebSocket, req) => {
      const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').replace(/^.*:/, '');
      handlePhoneConnection(ws, ip);
    });
    console.log(`[Auto.js Extension Server] Listening on standard port ws://0.0.0.0:9375 for direct physical phone connections!`);
  } catch (err: any) {
    console.warn(`[Auto.js Extension Server] Could not start server on port 9375 (e.g., in cloud container). This is normal in cloud mode:`, err.message);
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      connectedPhonesCount: phoneClients.size,
      connectedWebClientsCount: webClients.size
    });
  });

  app.get('/api/system-ips', (req, res) => {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    
    res.json({ ips: ips.length > 0 ? ips : ['127.0.0.1'] });
  });

  // --- ADB (Android Debug Bridge) USB DIRECT INTERACTIVE CONTROL APIS ---
  // Helper to execute commands in shell
  const runAdbCommand = (cmd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
        } else {
          resolve(stdout);
        }
      });
    });
  };

  // 1. Check if ADB is available on local computer
  app.get('/api/adb/status', async (req, res) => {
    try {
      await runAdbCommand('adb version');
      res.json({ available: true });
    } catch (err: any) {
      res.json({ available: false, error: 'ADB is not installed or not in PATH' });
    }
  });

  // 2. List USB-connected ADB devices
  app.get('/api/adb/devices', async (req, res) => {
    try {
      const output = await runAdbCommand('adb devices');
      const lines = output.split('\n');
      const devices: Array<{ id: string; name: string; status: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const id = parts[0];
          const status = parts[1]; // device, unauthorized, offline etc.
          
          // Try to get model or friendly name of device
          let modelName = 'Android Device';
          try {
            const modelOut = await runAdbCommand(`adb -s ${id} shell getprop ro.product.model`);
            if (modelOut.trim()) modelName = modelOut.trim();
          } catch {
            // Ignore if we can't fetch model name (e.g. unauthorized)
          }

          devices.push({ id, name: modelName, status });
        }
      }

      res.json({ devices });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list adb devices', details: err.message });
    }
  });

  // 3. Setup USB Reverse Port Forwarding (Automates Auto.js or Browser connectivity over USB cable)
  app.post('/api/adb/reverse', async (req, res) => {
    try {
      // Setup port reverse forward for Auto.js (9375) and development server (3000)
      await runAdbCommand('adb reverse tcp:9375 tcp:9375');
      try {
        await runAdbCommand('adb reverse tcp:3000 tcp:3000');
      } catch {
        // Some older ADB versions might warn, ignore
      }
      res.json({ status: 'ok', message: 'ADB reverse port forwarding established successfully. Your physical phone can now connect to http://127.0.0.1:3000 and ws://127.0.0.1:9375!' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to establish ADB reverse port forwarding', details: err.message });
    }
  });

  // 4. Perform direct action via ADB input (tap, swipe, text, keyevent, shell)
  app.post('/api/adb/action', async (req, res) => {
    const { deviceId, action, x, y, x1, y1, x2, y2, duration, text, key, cmd } = req.body;
    const targetFlag = deviceId ? `-s ${deviceId}` : '';

    try {
      let result = '';
      if (action === 'tap') {
        result = await runAdbCommand(`adb ${targetFlag} shell input tap ${x} ${y}`);
      } else if (action === 'swipe') {
        const d = duration || 300;
        result = await runAdbCommand(`adb ${targetFlag} shell input swipe ${x1} ${y1} ${x2} ${y2} ${d}`);
      } else if (action === 'text') {
        // Escape space or use percent-encoding/replacement to avoid shell space issues
        const formattedText = String(text).replace(/\s/g, '%s');
        result = await runAdbCommand(`adb ${targetFlag} shell input text "${formattedText}"`);
      } else if (action === 'keyevent') {
        result = await runAdbCommand(`adb ${targetFlag} shell input keyevent ${key}`);
      } else if (action === 'shell') {
        result = await runAdbCommand(`adb ${targetFlag} shell "${cmd}"`);
      } else {
        return res.status(400).json({ error: 'Unknown adb action' });
      }

      res.json({ status: 'ok', result: result.trim() });
    } catch (err: any) {
      res.status(500).json({ error: 'ADB input action failed', details: err.message });
    }
  });

  // 5. Screencap - capture current physical screen of USB-connected phone
  app.get('/api/adb/screencap', async (req, res) => {
    const { deviceId } = req.query;
    const targetFlag = deviceId ? `-s ${deviceId}` : '';
    
    const phoneTempPath = '/sdcard/studio_screencap.png';
    const localTempFile = path.join(os.tmpdir(), `screencap_${deviceId || 'device'}_${Date.now()}.png`);

    try {
      // Step 1: Capture on device
      await runAdbCommand(`adb ${targetFlag} shell screencap -p ${phoneTempPath}`);
      // Step 2: Pull to server temp directory
      await runAdbCommand(`adb ${targetFlag} pull ${phoneTempPath} "${localTempFile}"`);
      // Step 3: Remove from device
      try {
        await runAdbCommand(`adb ${targetFlag} shell rm ${phoneTempPath}`);
      } catch {
        // Non-blocking
      }

      // Step 4: Send the file
      res.sendFile(localTempFile, (err) => {
        // Clean up temp local file
        try {
          fs.unlinkSync(localTempFile);
        } catch {
          // Ignore clean-up error
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to capture physical screen over USB', details: err.message });
    }
  });

  // Vite development vs production static middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Listen
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Web Studio Server] Running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Web Studio Server] Failed to start:', err);
});
