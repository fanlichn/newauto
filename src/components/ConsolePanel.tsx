import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2, Copy, Check } from 'lucide-react';
import { ConsoleMessage } from '../types';

interface ConsolePanelProps {
  logs: ConsoleMessage[];
  onClearLogs: () => void;
  activeFileName: string | null;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs, onClearLogs, activeFileName }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Auto-scroll on logs update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const text = logs
      .map(log => {
        const time = log.timestamp.toTimeString().split(' ')[0];
        return `[${time}] [${log.type.toUpperCase()}] ${log.text}`;
      })
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl h-full flex flex-col overflow-hidden shadow-inner font-mono text-xs">
      {/* Console Header */}
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-850 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-400" />
          <span className="font-semibold text-slate-200 tracking-wide">终端输出</span>
          {activeFileName && (
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-sans">
              {activeFileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-console-copy"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            title="复制全部日志"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          <button
            id="btn-console-clear"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            title="清空控制台"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 p-4 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic text-center py-8">
            终端空。点击“执行脚本”开始输出运行日志...
          </div>
        ) : (
          logs.map((log) => {
            const timeStr = log.timestamp.toTimeString().split(' ')[0];

            let textClass = 'text-slate-100';
            let prefixColor = 'text-slate-500';

            switch (log.type) {
              case 'info':
                textClass = 'text-blue-400';
                prefixColor = 'text-blue-600';
                break;
              case 'warn':
                textClass = 'text-amber-400';
                prefixColor = 'text-amber-600';
                break;
              case 'error':
                textClass = 'text-rose-400 font-semibold';
                prefixColor = 'text-rose-600';
                break;
              case 'toast':
                textClass = 'text-emerald-400';
                prefixColor = 'text-emerald-600';
                break;
            }

            return (
              <div key={log.id} id={`log-${log.id}`} className="flex items-start gap-1.5 whitespace-pre-wrap leading-relaxed break-all">
                <span className={`${prefixColor} select-none`}>[{timeStr}]</span>
                <span className={`${prefixColor} select-none uppercase font-semibold text-[10px] scale-90 -ml-0.5`}>
                  [{log.type}]
                </span>
                <span className={textClass}>{log.text}</span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
