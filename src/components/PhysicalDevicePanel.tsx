import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Smartphone, Play, Square, Activity, HelpCircle, CheckCircle, RefreshCw, AlertCircle, Usb, Send, CornerDownLeft, RefreshCcw } from 'lucide-react';

interface PhysicalDevice {
  id: string;
  name: string;
  ip: string;
  width?: number;
  height?: number;
  sdkInt?: number;
}

interface AdbDevice {
  id: string;
  name: string;
  status: string;
}

interface PhysicalDevicePanelProps {
  connectedPhones: PhysicalDevice[];
  activePhoneId: string;
  onSelectPhone: (id: string) => void;
  onRunScriptOnPhone: () => void;
  onStopScriptOnPhone: () => void;
  isPhoneRunning: boolean;
}

export const PhysicalDevicePanel: React.FC<PhysicalDevicePanelProps> = ({
  connectedPhones,
  activePhoneId,
  onSelectPhone,
  onRunScriptOnPhone,
  onStopScriptOnPhone,
  isPhoneRunning,
}) => {
  // Mode selection: 'wifi' (standard Auto.js server) or 'usb' (ADB controls)
  const [panelMode, setPanelMode] = useState<'wifi' | 'usb'>('wifi');
  
  // Wi-Fi Mode States
  const [computerIps, setComputerIps] = useState<string[]>([]);
  const [isLoadingIps, setIsLoadingIps] = useState(false);

  // USB/ADB Mode States
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null);
  const [adbDevices, setAdbDevices] = useState<AdbDevice[]>([]);
  const [selectedAdbDeviceId, setSelectedAdbDeviceId] = useState<string>('');
  const [isLoadingAdb, setIsLoadingAdb] = useState(false);
  const [adbActionOutput, setAdbActionOutput] = useState<string>('');
  const [reverseStatus, setReverseStatus] = useState<{ success?: boolean; msg?: string } | null>(null);

  // USB Screen Mirror States
  const [screenUrl, setScreenUrl] = useState<string>('');
  const [isScreenLoading, setIsScreenLoading] = useState(false);
  const [autoRefreshScreen, setAutoRefreshScreen] = useState(false);
  const [phoneWidth, setPhoneWidth] = useState(1080);
  const [phoneHeight, setPhoneHeight] = useState(2400);

  // Form Inputs
  const [inputText, setInputText] = useState('');
  const [customShell, setCustomShell] = useState('');
  const screenImgRef = useRef<HTMLImageElement>(null);
  const autoRefreshIntervalRef = useRef<any>(null);

  // Fetch local network IPs of the computer
  const fetchIps = async () => {
    setIsLoadingIps(true);
    try {
      const res = await fetch('/api/system-ips');
      const data = await res.json();
      if (data && Array.isArray(data.ips)) {
        setComputerIps(data.ips);
      }
    } catch (err) {
      console.error('Failed to load system IPs:', err);
      setComputerIps(['127.0.0.1']);
    } finally {
      setIsLoadingIps(false);
    }
  };

  // Check ADB availability and fetch devices
  const checkAdbStatus = async () => {
    setIsLoadingAdb(true);
    try {
      const statusRes = await fetch('/api/adb/status');
      const statusData = await statusRes.json();
      setAdbAvailable(!!statusData.available);

      if (statusData.available) {
        const devicesRes = await fetch('/api/adb/devices');
        const devicesData = await devicesRes.json();
        const devicesList = devicesData.devices || [];
        setAdbDevices(devicesList);
        
        if (devicesList.length > 0 && !selectedAdbDeviceId) {
          setSelectedAdbDeviceId(devicesList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to check ADB status:', err);
      setAdbAvailable(false);
    } finally {
      setIsLoadingAdb(false);
    }
  };

  // Establish USB Reverse Port Forwarding
  const handleAdbReverse = async () => {
    try {
      setReverseStatus(null);
      const res = await fetch('/api/adb/reverse', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setReverseStatus({ success: true, msg: data.message });
      } else {
        setReverseStatus({ success: false, msg: data.details || '反向代理建立失败' });
      }
    } catch (err: any) {
      setReverseStatus({ success: false, msg: err.message || '网络连接错误' });
    }
  };

  // Capture Screenshot of USB connected phone
  const handleRefreshScreen = () => {
    if (!selectedAdbDeviceId || isScreenLoading) return;
    setIsScreenLoading(true);
    
    // Create direct URL to screencap endpoint with cache buster
    const url = `/api/adb/screencap?deviceId=${selectedAdbDeviceId}&t=${Date.now()}`;
    
    // Pre-load image to avoid visual flickering
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setScreenUrl(url);
      setIsScreenLoading(false);
    };
    img.onerror = () => {
      setIsScreenLoading(false);
    };
  };

  // Perform ADB Direct Control Action
  const runAdbAction = async (payload: any) => {
    if (!selectedAdbDeviceId) return;
    try {
      const res = await fetch('/api/adb/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedAdbDeviceId, ...payload })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        if (payload.action === 'shell') {
          setAdbActionOutput(data.result || '命令执行完成，无输出。');
        }
        // Small delay to let physical UI update, then capture new screenshot
        setTimeout(handleRefreshScreen, 400);
      } else {
        console.error('ADB action error:', data.error);
      }
    } catch (err) {
      console.error('ADB network action error:', err);
    }
  };

  // Handle click coordinates mapping on screenshot to send Tap event to physical phone
  const handleScreenClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!screenImgRef.current || !selectedAdbDeviceId) return;
    
    const rect = screenImgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Calculate percentage coordinates
    const pctX = clickX / rect.width;
    const pctY = clickY / rect.height;
    
    // Map to physical phone pixel coordinates
    const targetX = Math.round(pctX * phoneWidth);
    const targetY = Math.round(pctY * phoneHeight);

    // Run ADB Tap Action
    runAdbAction({ action: 'tap', x: targetX, y: targetY });
  };

  // Hook up screen refresh interval
  useEffect(() => {
    if (autoRefreshScreen && selectedAdbDeviceId) {
      handleRefreshScreen();
      autoRefreshIntervalRef.current = setInterval(handleRefreshScreen, 3000);
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefreshScreen, selectedAdbDeviceId]);

  // Initial loads
  useEffect(() => {
    if (panelMode === 'wifi') {
      fetchIps();
    } else {
      checkAdbStatus();
    }
  }, [panelMode]);

  const selectedDevice = connectedPhones.find(p => p.id === activePhoneId);

  return (
    <div className="w-full flex flex-col gap-4 select-none h-full overflow-y-auto pr-1 scrollbar-thin">
      
      {/* Mode Switches: Wi-Fi vs USB */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
        <button
          onClick={() => setPanelMode('wifi')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            panelMode === 'wifi'
              ? 'bg-slate-800 text-blue-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wifi size={13} />
          <span>Wi-Fi 局域网</span>
        </button>
        <button
          onClick={() => setPanelMode('usb')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            panelMode === 'usb'
              ? 'bg-slate-800 text-blue-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Usb size={13} />
          <span>USB (ADB) 直连</span>
        </button>
      </div>

      {/* --- Wi-Fi LAN Panel Mode --- */}
      {panelMode === 'wifi' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className={connectedPhones.length > 0 ? 'text-emerald-400' : 'text-slate-500'} />
                <h3 className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  物理真机连接
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${connectedPhones.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[10px] text-slate-400 font-semibold">
                  {connectedPhones.length > 0 ? `已连接 ${connectedPhones.length} 台手机` : '无手机连接'}
                </span>
              </div>
            </div>

            {connectedPhones.length > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-emerald-300">
                <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <p className="font-semibold">连接成功！可以直接真机执行</p>
                  <p className="text-[10px] text-emerald-400/80 mt-0.5">
                    真机上的 <code>log()</code> 和 <code>toast()</code> 将实时回传至本 Studio 控制台。
                  </p>
                </div>
              </div>
            )}
          </div>

          {connectedPhones.length === 0 ? (
            /* Detailed Step-by-Step Connection Onboarding */
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col gap-3.5">
              <div className="flex items-center gap-1.5 border-b border-slate-850 pb-2">
                <HelpCircle size={14} className="text-blue-400" />
                <span className="text-xs font-bold text-slate-200">局域网物理连接引导</span>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-slate-300 border border-slate-700">1</span>
                  <div>
                    <p className="font-semibold text-slate-200">连接相同 Wi-Fi</p>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      确保你的电脑和安卓手机连接的是同个局域网。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-slate-300 border border-slate-700">2</span>
                  <div>
                    <p className="font-semibold text-slate-200">获取电脑局域网 IP</p>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 mt-1.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-medium">电脑 IP 列表:</span>
                        <button
                          onClick={fetchIps}
                          disabled={isLoadingIps}
                          className="p-0.5 text-slate-400 hover:text-slate-200 disabled:opacity-40"
                          title="刷新 IP"
                        >
                          <RefreshCw size={10} className={isLoadingIps ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-0.5 font-mono text-[10px] text-blue-400 font-bold">
                        {computerIps.map((ip, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <Wifi size={10} className="text-slate-600" />
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-slate-300 border border-slate-700">3</span>
                  <div>
                    <p className="font-semibold text-slate-200">手机 Auto.js 连接电脑</p>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      在手机上打开 <strong>Auto.js App</strong>，侧边栏菜单点击 <strong>"连接电脑"</strong>，输入上方任意一个 IP 地址并确认。
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-2.5 flex items-center gap-1.5 text-[9px] text-slate-500 font-medium">
                <AlertCircle size={12} className="text-slate-600 shrink-0" />
                <span>连接完成后，此面板将自动显示你的设备。</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">选择执行设备</label>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  <label className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="phoneDevice"
                        checked={activePhoneId === 'all'}
                        onChange={() => onSelectPhone('all')}
                        className="accent-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-200">所有连接的真机</span>
                        <p className="text-[9px] text-slate-500">群发同步执行脚本</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono font-bold">ALL</span>
                  </label>

                  {connectedPhones.map((phone) => (
                    <label
                      key={phone.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer hover:border-blue-500/50 transition-colors ${
                        activePhoneId === phone.id
                          ? 'bg-blue-950/20 border-blue-500/60'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="phoneDevice"
                          checked={activePhoneId === phone.id}
                          onChange={() => onSelectPhone(phone.id)}
                          className="accent-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200">{phone.name}</span>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">IP: {phone.ip}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center gap-4 text-center">
                {isPhoneRunning ? (
                  <>
                    <div className="relative">
                      <span className="absolute inline-flex h-14 w-14 rounded-full bg-emerald-500/10 animate-ping" />
                      <div className="relative h-12 w-12 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center shadow-lg">
                        <Activity className="text-emerald-400 animate-pulse" size={20} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        真机脚本运行中
                      </p>
                      <p className="text-[10px] text-slate-500">
                        执行对象: {selectedDevice ? selectedDevice.name : '所有真机'}
                      </p>
                    </div>
                    <button
                      onClick={onStopScriptOnPhone}
                      className="w-full flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-lg shadow-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Square size={12} fill="currentColor" />
                      <span>停止真机运行</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 shadow-md">
                      <Smartphone size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">真机环境已就绪</p>
                      <p className="text-[10px] text-slate-500">
                        点击下方按钮将直接把编辑器脚本传送到手机执行！
                      </p>
                    </div>
                    <button
                      onClick={onRunScriptOnPhone}
                      className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-lg shadow-blue-950/30 transition-colors cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>在真机上运行脚本</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- USB ADB Mode --- */}
      {panelMode === 'usb' && (
        <div className="flex flex-col gap-4">
          
          {/* Status Indicator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">ADB 状态检测</span>
              <button
                onClick={checkAdbStatus}
                disabled={isLoadingAdb}
                className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-40"
              >
                <RefreshCw size={11} className={isLoadingAdb ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {adbAvailable === null ? (
              <p className="text-xs text-slate-400">正在检测本地 ADB 环境...</p>
            ) : adbAvailable ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-lg">
                <CheckCircle size={14} className="shrink-0" />
                <span>ADB 运行环境就绪</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg text-xs text-rose-300">
                <div className="flex items-start gap-1.5 font-semibold">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                  <span>未检测到本地 ADB 命令行工具</span>
                </div>
                <p className="text-[10px] text-rose-400/80 leading-normal">
                  本地运行此项目时，请确保你的电脑上安装了 <code>adb</code> 并添加到了系统环境变量中。
                </p>
              </div>
            )}
          </div>

          {/* Device Setup & Interactive Dashboard */}
          {adbAvailable && (
            <div className="flex flex-col gap-4 animate-fade-in">
              
              {/* Select Device Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">选择 USB 设备</span>
                {adbDevices.length === 0 ? (
                  <div className="text-center py-4 bg-slate-900/40 rounded-lg border border-dashed border-slate-800">
                    <Smartphone size={20} className="mx-auto text-slate-600 mb-1.5" />
                    <p className="text-[11px] text-slate-400">未检测到 USB 连接设备</p>
                    <p className="text-[9px] text-slate-500 mt-0.5 px-2">请使用数据线连手机，开启 "USB 调试" 模式并允许信任</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {adbDevices.map(dev => (
                      <button
                        key={dev.id}
                        onClick={() => setSelectedAdbDeviceId(dev.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                          selectedAdbDeviceId === dev.id
                            ? 'bg-blue-950/20 border-blue-500/60 text-blue-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Smartphone size={14} className={dev.status === 'device' ? 'text-emerald-400' : 'text-slate-500'} />
                          <div>
                            <span className="text-xs font-bold block truncate max-w-[160px]">{dev.name}</span>
                            <span className="text-[9px] font-mono text-slate-500 block">ID: {dev.id}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                          dev.status === 'device' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {dev.status === 'device' ? '已授权' : '未授权'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct ADB Tools Dashboard */}
              {selectedAdbDeviceId && (
                <div className="flex flex-col gap-4">
                  
                  {/* USB Reverse Tool */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">一键免 Wi-Fi 反向代理</h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                        配置 USB 端口映射，让手机上的 Auto.js APP 能够直接通过 USB 线自动连接到本 Studio，彻底告别局域网 IP 手工输入！
                      </p>
                    </div>

                    <button
                      onClick={handleAdbReverse}
                      className="w-full flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCcw size={13} />
                      <span>配置 USB 反向代理 (adb reverse)</span>
                    </button>

                    {reverseStatus && (
                      <div className={`p-2.5 rounded-lg text-[10px] leading-relaxed flex items-start gap-1.5 ${
                        reverseStatus.success ? 'bg-emerald-950/20 border border-emerald-900 text-emerald-300' : 'bg-rose-950/20 border border-rose-900 text-rose-300'
                      }`}>
                        {reverseStatus.success ? <CheckCircle size={12} className="shrink-0 mt-0.5" /> : <AlertCircle size={12} className="shrink-0 mt-0.5" />}
                        <span>{reverseStatus.msg}</span>
                      </div>
                    )}
                  </div>

                  {/* USB Interaction & Screen Control */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200">物理屏幕互动控制 (USB 投屏)</h4>
                      <div className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoRefreshScreen}
                            onChange={(e) => setAutoRefreshScreen(e.target.checked)}
                            className="accent-blue-500 cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-400 font-medium">自动刷新</span>
                        </label>
                        <button
                          onClick={handleRefreshScreen}
                          disabled={isScreenLoading}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-40"
                          title="手动截图"
                        >
                          <RefreshCw size={11} className={isScreenLoading ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>

                    {/* Screenshot Screen Container */}
                    <div className="relative border border-slate-850 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden min-h-[220px] select-none group">
                      {screenUrl ? (
                        <div className="relative max-w-full">
                          <img
                            ref={screenImgRef}
                            src={screenUrl}
                            alt="Android Screen"
                            onClick={handleScreenClick}
                            className="max-h-[300px] object-contain mx-auto cursor-crosshair rounded-lg select-none"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-400 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                            点击即可对真机执行 Tap
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-6 flex flex-col items-center gap-2">
                          <Smartphone size={24} className="text-slate-700" />
                          <span className="text-[11px] text-slate-400 font-semibold">屏幕未捕获</span>
                          <p className="text-[9px] text-slate-500 max-w-[180px] leading-relaxed">
                            点击右上方按钮，或开启自动刷新，即可从物理真机获取实时屏幕镜像并进行鼠标交互！
                          </p>
                        </div>
                      )}

                      {isScreenLoading && (
                        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                          <RefreshCw size={16} className="text-blue-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Resolution configs */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] text-slate-500 font-bold uppercase">机型物理宽度</label>
                        <input
                          type="number"
                          value={phoneWidth}
                          onChange={(e) => setPhoneWidth(Number(e.target.value))}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-mono font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] text-slate-500 font-bold uppercase">机型物理高度</label>
                        <input
                          type="number"
                          value={phoneHeight}
                          onChange={(e) => setPhoneHeight(Number(e.target.value))}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-mono font-semibold"
                        />
                      </div>
                    </div>

                    {/* Action buttons (Android Keys) */}
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      <button
                        onClick={() => runAdbAction({ action: 'keyevent', key: 4 })}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg py-1.5 text-[10px] font-bold text-slate-300 transition-all cursor-pointer text-center"
                        title="Back Key"
                      >
                        返回键
                      </button>
                      <button
                        onClick={() => runAdbAction({ action: 'keyevent', key: 3 })}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg py-1.5 text-[10px] font-bold text-slate-300 transition-all cursor-pointer text-center"
                        title="Home Key"
                      >
                        主页键
                      </button>
                      <button
                        onClick={() => runAdbAction({ action: 'keyevent', key: 187 })}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg py-1.5 text-[10px] font-bold text-slate-300 transition-all cursor-pointer text-center"
                        title="Recents Menu"
                      >
                        多任务
                      </button>
                      <button
                        onClick={() => runAdbAction({ action: 'keyevent', key: 26 })}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg py-1.5 text-[10px] font-bold text-slate-300 transition-all cursor-pointer text-center"
                        title="Power Button"
                      >
                        电源键
                      </button>
                    </div>
                  </div>

                  {/* ADB TextInput Tool */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">远程文字输入</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="在此输入文本发送至真机聚焦位置..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (runAdbAction({ action: 'text', text: inputText }), setInputText(''))}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:border-blue-500/50 outline-none"
                      />
                      <button
                        onClick={() => {
                          runAdbAction({ action: 'text', text: inputText });
                          setInputText('');
                        }}
                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>

                  {/* ADB Custom Shell Terminal */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">远程 ADB Shell 执行终端</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="例: pm list packages -3 或 input tap 500 500"
                        value={customShell}
                        onChange={(e) => setCustomShell(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (runAdbAction({ action: 'shell', cmd: customShell }), setCustomShell(''))}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500/50 outline-none"
                      />
                      <button
                        onClick={() => {
                          runAdbAction({ action: 'shell', cmd: customShell });
                          setCustomShell('');
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <CornerDownLeft size={13} />
                      </button>
                    </div>
                    {adbActionOutput && (
                      <div className="mt-1.5 bg-slate-900/60 border border-slate-850 rounded-lg p-2 max-h-32 overflow-y-auto font-mono text-[9px] text-slate-400 whitespace-pre-wrap select-text scrollbar-thin">
                        {adbActionOutput}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* Guidelines manual */}
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-2">
              <HelpCircle size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-200">ADB 开通及安装指南</span>
            </div>
            
            <div className="space-y-3 text-[11px] text-slate-400 leading-normal">
              <div>
                <p className="font-semibold text-slate-300">1. 本地电脑安装 ADB</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  • <strong>Windows:</strong> 建议使用 Scoop/Chocolatey 安装或下载官方 SDK Platform-tools 解压并添加 PATH。<br />
                  • <strong>macOS:</strong> 终端执行 <code>brew install android-platform-tools</code> 即可。<br />
                  • <strong>Linux:</strong> 执行 <code>sudo apt install adb</code> 安装。
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-300">2. 手机端开启 USB 调试</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  进入手机设置 -&gt; 关于手机 -&gt; 连续点击 "版本号/编译号" 7次激活开发者选项。进入设置 -&gt; 系统/附加设置 -&gt; <strong>开发者选项</strong> -&gt; 开启 <strong>"USB 调试"</strong>（部分系统如小米需一并开启 <strong>"USB 调试(安全设置/模拟点击)"</strong> 才能接收模拟控制）。
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-300">3. 授权连接</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  用数据线连接手机和电脑，手机端将弹出 "允许 USB 调试吗？"，务必勾选 <strong>"一律允许使用这台计算机进行调试"</strong> 并点击确定。
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
