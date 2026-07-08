import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, Battery, Signal, Settings, Cpu, Smartphone, Play, Square } from 'lucide-react';
import { SimulatedDevice } from '../types';

interface DeviceMockupProps {
  isRunning: boolean;
  toastMessage: string | null;
  activeDialog: {
    type: 'confirm' | 'input' | 'singleChoice' | 'alert';
    title: string;
    message?: string;
    defaultValue?: string;
    items?: string[];
  } | null;
  onDialogResponse: (response: any) => void;
  deviceInfo: SimulatedDevice;
  onUpdateDeviceInfo: (info: SimulatedDevice) => void;
  onRunActiveScript: () => void;
  onStopActiveScript: () => void;
}

export const DeviceMockup: React.FC<DeviceMockupProps> = ({
  isRunning,
  toastMessage,
  activeDialog,
  onDialogResponse,
  deviceInfo,
  onUpdateDeviceInfo,
  onRunActiveScript,
  onStopActiveScript
}) => {
  const [time, setTime] = useState('10:45');
  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConfig, setShowConfig] = useState(false);

  // Update clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hrs}:${mins}`);
    };
    updateClock();
    const id = setInterval(updateClock, 60000);
    return () => clearInterval(id);
  }, []);

  // Sync input values when activeDialog inputs change
  useEffect(() => {
    if (activeDialog?.type === 'input') {
      setInputValue(activeDialog.defaultValue || '');
    } else if (activeDialog?.type === 'singleChoice') {
      setSelectedIndex(0);
    }
  }, [activeDialog]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Phone Shell */}
      <div className="relative w-[280px] h-[550px] bg-slate-950 border-[10px] border-slate-800 rounded-[36px] shadow-2xl shadow-black/50 overflow-hidden flex flex-col select-none">
        {/* Notch / Camera Speaker */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-900 rounded-full mb-1" />
          <div className="w-2.5 h-2.5 bg-slate-950 rounded-full border border-slate-850 absolute right-6 top-1.5" />
        </div>

        {/* Screen Status Bar */}
        <div className="h-7 pt-1 px-5 flex items-center justify-between text-[11px] font-medium text-slate-300 z-40 bg-slate-900">
          <span>{time}</span>
          <div className="flex items-center gap-1">
            <Signal size={11} className="text-slate-300" />
            <Wifi size={11} className="text-slate-300" />
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] scale-90">{deviceInfo.battery}%</span>
              <Battery size={13} className="text-slate-300" />
            </div>
          </div>
        </div>

        {/* Screen Content Viewport */}
        <div className="flex-1 bg-slate-900 relative p-4 flex flex-col overflow-hidden">
          {/* Main Visual/Interface */}
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Toolbar inside Screen */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <Cpu size={14} className="text-blue-500" />
                <span className="text-xs font-semibold tracking-wide text-slate-100">Auto.js Engine</span>
              </div>
              <button
                id="btn-toggle-phone-config"
                onClick={() => setShowConfig(!showConfig)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition-colors"
              >
                <Settings size={13} />
              </button>
            </div>

            {/* Simulated Workspace Screen Body */}
            <div className="flex-1 flex flex-col items-center justify-center relative py-4">
              <AnimatePresence mode="wait">
                {showConfig ? (
                  /* Phone Settings Form */
                  <motion.div
                    key="config"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full bg-slate-850/95 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs text-slate-300"
                  >
                    <div className="font-semibold text-slate-100 flex items-center gap-1 border-b border-slate-850 pb-1">
                      <Settings size={12} />
                      <span>模拟设备参数</span>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase">品牌 / 型号</label>
                        <div className="grid grid-cols-2 gap-1 mt-0.5">
                          <input
                            id="input-phone-brand"
                            type="text"
                            value={deviceInfo.brand}
                            onChange={(e) => onUpdateDeviceInfo({ ...deviceInfo, brand: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 outline-none focus:border-blue-500"
                          />
                          <input
                            id="input-phone-model"
                            type="text"
                            value={deviceInfo.model}
                            onChange={(e) => onUpdateDeviceInfo({ ...deviceInfo, model: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase">屏幕分辨率</label>
                        <div className="grid grid-cols-2 gap-1 mt-0.5">
                          <input
                            id="input-phone-width"
                            type="number"
                            value={deviceInfo.width}
                            onChange={(e) => onUpdateDeviceInfo({ ...deviceInfo, width: parseInt(e.target.value) || 1080 })}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 outline-none focus:border-blue-500 text-[11px]"
                          />
                          <input
                            id="input-phone-height"
                            type="number"
                            value={deviceInfo.height}
                            onChange={(e) => onUpdateDeviceInfo({ ...deviceInfo, height: parseInt(e.target.value) || 2400 })}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 outline-none focus:border-blue-500 text-[11px]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase">电量 (%)</label>
                          <input
                            id="input-phone-battery"
                            type="range"
                            min="1"
                            max="100"
                            value={deviceInfo.battery}
                            onChange={(e) => onUpdateDeviceInfo({ ...deviceInfo, battery: parseInt(e.target.value) })}
                            className="w-full accent-blue-500 mt-1 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase">Android API</label>
                          <input
                            id="input-phone-sdk"
                            type="number"
                            value={deviceInfo.sdkInt}
                            onChange={(e) => onUpdateDeviceInfo({ ...deviceInfo, sdkInt: parseInt(e.target.value) || 29 })}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      id="btn-close-phone-config"
                      onClick={() => setShowConfig(false)}
                      className="w-full bg-blue-600 hover:bg-blue-500 font-medium py-1 rounded text-white text-center shadow-md transition-colors cursor-pointer"
                    >
                      保存设置
                    </button>
                  </motion.div>
                ) : isRunning ? (
                  /* Active Running Mode with radar spinner */
                  <motion.div
                    key="running"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="relative">
                      {/* Radar rings */}
                      <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10 animate-ping" />
                      <span className="absolute inline-flex h-16 w-16 rounded-full bg-emerald-500/20 animate-pulse" />
                      <div className="relative h-16 w-16 rounded-full bg-slate-800 border-2 border-emerald-500/60 flex items-center justify-center">
                        <Cpu className="text-emerald-400 animate-pulse" size={24} />
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-emerald-400 tracking-wide flex items-center gap-1.5 justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        脚本正在执行中...
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        线程: Thread-Main ({deviceInfo.brand})
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  /* Idle Mode with execution launchers */
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shadow-lg">
                      <Smartphone size={24} className="text-blue-400" />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-semibold text-slate-200">引擎当前处于闲置状态</p>
                      <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto leading-normal">
                        选择左侧文件夹中的脚本，点击下方的“运行”按钮开始调试。
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Action Bar under Screen Viewport */}
            <div className="border-t border-slate-800/60 pt-2.5 flex items-center justify-center gap-2">
              {isRunning ? (
                <button
                  id="btn-phone-stop"
                  onClick={onStopActiveScript}
                  className="flex items-center gap-1 bg-rose-600/90 hover:bg-rose-500 text-white font-medium text-xs px-4 py-2 rounded-full shadow-lg transition-colors cursor-pointer"
                >
                  <Square size={11} fill="currentColor" />
                  <span>停止运行</span>
                </button>
              ) : (
                <button
                  id="btn-phone-run"
                  onClick={onRunActiveScript}
                  disabled={showConfig}
                  className={`flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-5 py-2.5 rounded-full shadow-lg transition-colors cursor-pointer ${
                    showConfig ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Play size={11} fill="currentColor" />
                  <span>执行脚本</span>
                </button>
              )}
            </div>
          </div>

          {/* Dialog Modals overlaying on the simulated Android screen (Material-style) */}
          <AnimatePresence>
            {activeDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 z-50 flex items-end p-2.5"
              >
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="w-full bg-slate-850 rounded-2xl p-4 space-y-4 shadow-2xl border border-slate-800 text-xs"
                >
                  {/* Dialog Header */}
                  <div>
                    <h5 className="font-semibold text-slate-100 text-[13px]">{activeDialog.title}</h5>
                    {activeDialog.message && (
                      <p className="text-slate-300 mt-1.5 leading-normal text-[11px]">{activeDialog.message}</p>
                    )}
                  </div>

                  {/* Input dialog type */}
                  {activeDialog.type === 'input' && (
                    <input
                      id="dialog-input-box"
                      type="text"
                      autoFocus
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-slate-100"
                    />
                  )}

                  {/* Single Choice Radio-list type */}
                  {activeDialog.type === 'singleChoice' && activeDialog.items && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {activeDialog.items.map((item, idx) => (
                        <label
                          key={idx}
                          id={`dialog-radio-lbl-${idx}`}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="dialogChoice"
                            checked={selectedIndex === idx}
                            onChange={() => setSelectedIndex(idx)}
                            className="accent-blue-500 cursor-pointer"
                          />
                          <span className="text-slate-300 font-medium">{item}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {/* Only show cancel for input, confirm and singleChoice */}
                    {activeDialog.type !== 'alert' && (
                      <button
                        id="btn-dialog-cancel"
                        onClick={() => {
                          if (activeDialog.type === 'confirm') onDialogResponse(false);
                          else if (activeDialog.type === 'input') onDialogResponse('');
                          else onDialogResponse(-1);
                        }}
                        className="px-4 py-2 font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                    )}
                    <button
                      id="btn-dialog-ok"
                      onClick={() => {
                        if (activeDialog.type === 'alert') onDialogResponse(null);
                        else if (activeDialog.type === 'confirm') onDialogResponse(true);
                        else if (activeDialog.type === 'input') onDialogResponse(inputValue);
                        else onDialogResponse(selectedIndex);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg shadow-md transition-colors cursor-pointer"
                    >
                      确定
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Android Toast Message Pop-up inside Screen bottom */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-800/95 border border-slate-700 text-slate-100 font-medium text-[11px] px-4 py-2 rounded-full shadow-lg z-50 text-center max-w-[200px] leading-snug backdrop-blur-sm"
              >
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Physical Home Indicator bar bottom */}
        <div className="h-5 bg-slate-950 flex justify-center items-center z-40">
          <div className="w-24 h-1 bg-slate-700/80 rounded-full" />
        </div>
      </div>
    </div>
  );
};
