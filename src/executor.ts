import { SimulatedDevice } from './types';

export interface ExecutorCallbacks {
  onLog: (type: 'log' | 'info' | 'warn' | 'error' | 'toast', text: string) => void;
  onToast: (text: string) => void;
  onShowConsole: () => void;
  onHideConsole: () => void;
  onClearConsole: () => void;
  onDialog: (metadata: {
    type: 'confirm' | 'input' | 'singleChoice' | 'alert';
    title: string;
    message?: string;
    defaultValue?: string;
    items?: string[];
  }) => Promise<any>;
  onFinish: () => void;
}

export class ScriptExecutor {
  private activeTimers: any[] = [];
  private isAborted = false;

  constructor(private callbacks: ExecutorCallbacks, private device: SimulatedDevice) {}

  public abort() {
    this.isAborted = true;
    // Clear all registered timers
    this.activeTimers.forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
    this.activeTimers = [];
    this.callbacks.onLog('warn', '脚本运行被用户手动停止。');
    this.callbacks.onFinish();
  }

  public async execute(transpiledCode: string) {
    this.isAborted = false;
    this.callbacks.onLog('info', '开始运行脚本...');

    // 1. Create a mock environment
    const sandbox: Record<string, any> = {
      // Globals
      log: (msg: any) => {
        if (this.isAborted) return;
        this.callbacks.onLog('log', String(msg));
      },
      toast: (msg: any) => {
        if (this.isAborted) return;
        this.callbacks.onLog('toast', `[Toast] ${String(msg)}`);
        this.callbacks.onToast(String(msg));
      },
      sleep: (ms: number) => {
        return new Promise<void>((resolve) => {
          if (this.isAborted) return;
          const timer = setTimeout(() => {
            // Remove timer from active list
            this.activeTimers = this.activeTimers.filter(t => t !== timer);
            resolve();
          }, ms);
          this.activeTimers.push(timer);
        });
      },
      exit: () => {
        this.abort();
        throw new Error('ScriptExit');
      },

      // setTimeout / setInterval wrappers
      setTimeout: (handler: Function, delay: number) => {
        const timer = setTimeout(() => {
          if (this.isAborted) return;
          this.activeTimers = this.activeTimers.filter(t => t !== timer);
          handler();
        }, delay);
        this.activeTimers.push(timer);
        return timer;
      },
      setInterval: (handler: Function, period: number) => {
        const timer = setInterval(() => {
          if (this.isAborted) return;
          handler();
        }, period);
        this.activeTimers.push(timer);
        return timer;
      },
      clearTimeout: (id: any) => {
        clearTimeout(id);
        this.activeTimers = this.activeTimers.filter(t => t !== id);
      },
      clearInterval: (id: any) => {
        clearInterval(id);
        this.activeTimers = this.activeTimers.filter(t => t !== id);
      },

      // Device
      device: {
        width: this.device.width,
        height: this.device.height,
        brand: this.device.brand,
        model: this.device.model,
        buildId: 'OPM1.171019.011',
        board: 'universal',
        product: 'autojs_simulator',
        bootloader: 'unknown',
        hardware: 'qcom',
        fingerprint: 'xiaomi/mi11/generic:8.0.0/OPM1.171019.011',
        sdkInt: this.device.sdkInt,
        getBattery: () => this.device.battery,
        getIMEI: () => '863452039481235',
        getAndroidId: () => 'ad394ba02194fe',
        getMacAddress: () => '7C:25:0D:82:11:A4'
      },

      // Console
      console: {
        log: (msg: any) => this.callbacks.onLog('log', String(msg)),
        info: (msg: any) => this.callbacks.onLog('info', String(msg)),
        warn: (msg: any) => this.callbacks.onLog('warn', String(msg)),
        error: (msg: any) => this.callbacks.onLog('error', String(msg)),
        show: () => this.callbacks.onShowConsole(),
        hide: () => this.callbacks.onHideConsole(),
        clear: () => this.callbacks.onClearConsole()
      },

      // Dialogs
      confirm: (titleOrMsg: string, msg?: string) => {
        if (this.isAborted) return Promise.resolve(false);
        const title = msg ? titleOrMsg : '确认';
        const message = msg ? msg : titleOrMsg;
        return this.callbacks.onDialog({ type: 'confirm', title, message });
      },
      alert: (titleOrMsg: string, msg?: string) => {
        if (this.isAborted) return Promise.resolve();
        const title = msg ? titleOrMsg : '提示';
        const message = msg ? msg : titleOrMsg;
        return this.callbacks.onDialog({ type: 'alert', title, message });
      },
      dialogs: {
        input: (title: string, defaultValue?: string) => {
          if (this.isAborted) return Promise.resolve('');
          return this.callbacks.onDialog({ type: 'input', title, defaultValue: defaultValue || '' });
        },
        singleChoice: (title: string, items: string[], _defaultIndex?: number) => {
          if (this.isAborted) return Promise.resolve(-1);
          return this.callbacks.onDialog({ type: 'singleChoice', title, items });
        }
      },

      // HTTP request simulator
      http: {
        get: async (url: string) => {
          if (this.isAborted) return { statusCode: 500, statusMessage: 'Aborted', body: { string: () => '' } };
          this.callbacks.onLog('info', `[HTTP GET] 发起网络请求: ${url}`);
          await new Promise(r => setTimeout(r, 1000)); // simulate latency
          
          let bodyText = `<html>\\n<head><title>Baidu Search</title></head>\\n<body>\\n<h1>百度一下，你就知道</h1>\\n<div id="wrapper">Auto.js Simulator fetch mockup successful!</div>\\n</body>\\n</html>`;
          if (url.includes('api') || url.includes('json')) {
            bodyText = JSON.stringify({ status: 'ok', data: { brand: this.device.brand, model: this.device.model } }, null, 2);
          }

          return {
            statusCode: 200,
            statusMessage: 'OK',
            body: {
              string: () => bodyText
            }
          };
        },
        post: async (url: string, data: any) => {
          if (this.isAborted) return { statusCode: 500, statusMessage: 'Aborted', body: { string: () => '' } };
          this.callbacks.onLog('info', `[HTTP POST] 发起网络请求: ${url}, 数据: ${JSON.stringify(data)}`);
          await new Promise(r => setTimeout(r, 1200)); // simulate latency
          return {
            statusCode: 200,
            statusMessage: 'OK',
            body: {
              string: () => JSON.stringify({
                status: 'success',
                url,
                received: data,
                timestamp: Date.now()
              }, null, 2)
            }
          };
        }
      }
    };

    // 2. Wrap code and execute inside sandbox
    const argNames = Object.keys(sandbox);
    const argValues = Object.values(sandbox);

    const asyncFunctionCode = `
      try {
        ${transpiledCode}
      } catch (err) {
        if (err.message !== 'ScriptExit') {
          throw err;
        }
      }
    `;

    try {
      // Create executable constructor
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const runner = new AsyncFunction(...argNames, asyncFunctionCode);
      
      // Execute
      await runner(...argValues);
      
      if (!this.isAborted) {
        this.callbacks.onLog('info', '脚本运行结束。');
        this.callbacks.onFinish();
      }
    } catch (err: any) {
      if (err.message !== 'ScriptExit') {
        this.callbacks.onLog('error', `脚本运行出错: ${err.message || err}`);
        console.error(err);
      }
      this.callbacks.onFinish();
    }
  }
}
