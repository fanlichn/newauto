import { useState, useRef, useEffect } from 'react';
import { Play, Square, Save, RotateCcw, FileText, Code, ChevronLeft, ChevronRight } from 'lucide-react';
import { FileExplorer } from './components/FileExplorer';
import { DocViewer } from './components/DocViewer';
import { DeviceMockup } from './components/DeviceMockup';
import { ConsolePanel } from './components/ConsolePanel';
import { initialFiles } from './samples';
import { transpileScript } from './transpiler';
import { ScriptExecutor } from './executor';
import { FileNode, ConsoleMessage, SimulatedDevice } from './types';

export default function App() {
  // Navigation & Sidebars
  const [activeTab, setActiveTab] = useState<'files' | 'docs'>('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // File System State
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [activeFilePath, setActiveFilePath] = useState<string | null>('/JavaScript/HelloWorld.js');
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [isModified, setIsModified] = useState(false);

  // Terminal Console Logs State
  const [logs, setLogs] = useState<ConsoleMessage[]>([]);
  const [isConsoleVisible, setIsConsoleVisible] = useState(true);

  // Simulated Device State
  const [deviceInfo, setDeviceInfo] = useState<SimulatedDevice>({
    width: 1080,
    height: 2400,
    brand: 'Xiaomi',
    model: 'Mi 11',
    battery: 85,
    sdkInt: 29,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Script Runner Executor State
  const [isRunning, setIsRunning] = useState(false);
  const [activeDialog, setActiveDialog] = useState<any>(null);
  const dialogResolverRef = useRef<((value: any) => void) | null>(null);
  const executorRef = useRef<ScriptExecutor | null>(null);

  // Helper to load file content on initial render or active file change
  useEffect(() => {
    if (activeFilePath) {
      const node = findFileNode(files, activeFilePath);
      if (node && node.type === 'file') {
        setActiveFileContent(node.content || '');
        setIsModified(false);
      }
    }
  }, [activeFilePath]);

  // Find a node inside tree by path
  const findFileNode = (tree: FileNode[], path: string): FileNode | null => {
    for (const node of tree) {
      if (node.path === path) return node;
      if (node.type === 'directory' && node.children) {
        const found = findFileNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // Select file handler
  const handleSelectFile = (path: string) => {
    // Auto-save previous if modified?
    if (isModified && activeFilePath) {
      if (confirm('当前文件已修改，是否保存？')) {
        handleSaveFile();
      }
    }
    setActiveFilePath(path);
  };

  // Save active file content back to files tree
  const handleSaveFile = () => {
    if (!activeFilePath) return;
    const updated = updateFileNodeContent(files, activeFilePath, activeFileContent);
    setFiles(updated);
    setIsModified(false);
    addLog('info', `文件已保存: ${activeFilePath}`);
  };

  const updateFileNodeContent = (tree: FileNode[], path: string, content: string): FileNode[] => {
    return tree.map(node => {
      if (node.path === path) {
        return { ...node, content };
      }
      if (node.type === 'directory' && node.children) {
        return { ...node, children: updateFileNodeContent(node.children, path, content) };
      }
      return node;
    });
  };

  // Re-load default template file
  const handleResetFile = () => {
    if (!activeFilePath) return;
    if (confirm('确定要重置当前文件为默认示例吗？所有的修改都将丢失！')) {
      const originalNode = findFileNode(initialFiles, activeFilePath);
      if (originalNode) {
        setActiveFileContent(originalNode.content || '');
        setIsModified(false);
        addLog('info', `已重置文件: ${activeFilePath}`);
      }
    }
  };

  // Create new file
  const handleCreateFile = (parentPath: string, name: string) => {
    const newPath = (parentPath === '' ? '/' : parentPath + '/') + name;
    const newFile: FileNode = {
      name,
      path: newPath,
      type: 'file',
      content: `// 新建 Auto.js 脚本\nlog("运行新建脚本: ${name}");\ntoast("你好，Auto.js!");\n`,
    };

    if (parentPath === '') {
      setFiles([...files, newFile]);
    } else {
      setFiles(insertNodeIntoTree(files, parentPath, newFile));
    }
    setActiveFilePath(newPath);
    addLog('info', `创建了新脚本: ${newPath}`);
  };

  // Create new folder
  const handleCreateFolder = (parentPath: string, name: string) => {
    const newPath = (parentPath === '' ? '/' : parentPath + '/') + name;
    const newDir: FileNode = {
      name,
      path: newPath,
      type: 'directory',
      children: [],
    };

    if (parentPath === '') {
      setFiles([...files, newDir]);
    } else {
      setFiles(insertNodeIntoTree(files, parentPath, newDir));
    }
    addLog('info', `创建了新文件夹: ${newPath}`);
  };

  const insertNodeIntoTree = (tree: FileNode[], parentPath: string, nodeToInsert: FileNode): FileNode[] => {
    return tree.map(node => {
      if (node.path === parentPath && node.type === 'directory') {
        return { ...node, children: [...(node.children || []), nodeToInsert] };
      }
      if (node.type === 'directory' && node.children) {
        return { ...node, children: insertNodeIntoTree(node.children, parentPath, nodeToInsert) };
      }
      return node;
    });
  };

  // Delete node
  const handleDeleteNode = (path: string) => {
    setFiles(removeNodeFromTree(files, path));
    if (activeFilePath === path) {
      setActiveFilePath(null);
      setActiveFileContent('');
    }
    addLog('warn', `删除了项: ${path}`);
  };

  const removeNodeFromTree = (tree: FileNode[], path: string): FileNode[] => {
    return tree
      .filter(node => node.path !== path)
      .map(node => {
        if (node.type === 'directory' && node.children) {
          return { ...node, children: removeNodeFromTree(node.children, path) };
        }
        return node;
      });
  };

  // Log helper
  const addLog = (type: 'log' | 'info' | 'warn' | 'error' | 'toast', text: string) => {
    const newLog: ConsoleMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      type,
      text,
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Show dynamic Toast helper
  const triggerToast = (text: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(text);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Run Script Trigger
  const handleRunScript = async () => {
    if (isRunning) {
      handleStopScript();
      return;
    }

    // Auto-save if modified before running
    if (isModified && activeFilePath) {
      handleSaveFile();
    }

    // Clear logs and prepare
    setLogs([]);
    setIsRunning(true);
    setIsConsoleVisible(true);
    setActiveDialog(null);

    // Transpile the code
    const transpiled = transpileScript(activeFileContent);

    // Create Executor and run
    const executor = new ScriptExecutor(
      {
        onLog: (type, text) => addLog(type, text),
        onToast: (text) => triggerToast(text),
        onShowConsole: () => setIsConsoleVisible(true),
        onHideConsole: () => setIsConsoleVisible(false),
        onClearConsole: () => setLogs([]),
        onDialog: (metadata) => {
          return new Promise(resolve => {
            dialogResolverRef.current = resolve;
            setActiveDialog(metadata);
          });
        },
        onFinish: () => {
          setIsRunning(false);
          setActiveDialog(null);
          dialogResolverRef.current = null;
        },
      },
      deviceInfo
    );

    executorRef.current = executor;
    await executor.execute(transpiled);
  };

  // Stop script execution
  const handleStopScript = () => {
    if (executorRef.current) {
      executorRef.current.abort();
      executorRef.current = null;
    }
  };

  // Dialog option responder
  const handleDialogResponse = (response: any) => {
    if (dialogResolverRef.current) {
      dialogResolverRef.current(response);
      dialogResolverRef.current = null;
    }
    setActiveDialog(null);
  };

  // Insert code snippet from docs directly into editor
  const handleInsertCodeSnippet = (snippet: string) => {
    // Append or insert at cursor position (we append to make it simple and clean)
    setActiveFileContent(prev => {
      const separator = prev.endsWith('\n') || prev === '' ? '' : '\n';
      return prev + separator + snippet + '\n';
    });
    setIsModified(true);
    addLog('info', '已插入 API 示例代码到编辑器。');
  };

  const activeNode = activeFilePath ? findFileNode(files, activeFilePath) : null;
  const activeFileName = activeNode ? activeNode.name : '未打开文件';

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Premium Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-850 px-6 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-900/30">
            <Code size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100">Auto.js Web Studio</h1>
            <p className="text-[10px] text-slate-400 font-medium">JavaScript 自动化脚本云开发模拟器</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              id="header-btn-stop"
              onClick={handleStopScript}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow-lg shadow-rose-900/20 transition-all cursor-pointer"
            >
              <Square size={12} fill="currentColor" />
              <span>停止</span>
            </button>
          ) : (
            <button
              id="header-btn-run"
              onClick={handleRunScript}
              disabled={!activeFilePath}
              className={`flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all cursor-pointer ${
                !activeFilePath ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Play size={12} fill="currentColor" />
              <span>执行</span>
            </button>
          )}

          <button
            id="header-btn-save"
            onClick={handleSaveFile}
            disabled={!activeFilePath || !isModified}
            className={`flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 font-semibold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              !isModified ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Save size={12} />
            <span>保存</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer / Navigation Sidebar */}
        <aside
          className={`bg-slate-950 border-r border-slate-850 flex flex-col shrink-0 transition-all duration-300 ${
            isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
          }`}
        >
          {/* Tabs header */}
          <div className="flex border-b border-slate-850 text-xs shrink-0 bg-slate-900/40">
            <button
              id="tab-files"
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-3 text-center font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'files'
                  ? 'border-blue-500 text-blue-400 bg-slate-900/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10'
              }`}
            >
              文件
            </button>
            <button
              id="tab-docs"
              onClick={() => setActiveTab('docs')}
              className={`flex-1 py-3 text-center font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'docs'
                  ? 'border-blue-500 text-blue-400 bg-slate-900/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10'
              }`}
            >
              文档
            </button>
          </div>

          {/* Tab content view */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800">
            {activeTab === 'files' ? (
              <FileExplorer
                files={files}
                activeFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteNode={handleDeleteNode}
              />
            ) : (
              <DocViewer onInsertCodeSnippet={handleInsertCodeSnippet} />
            )}
          </div>
        </aside>

        {/* Quick Toggle Button to expand/collapse sidebar */}
        <button
          id="btn-toggle-sidebar"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 p-1 rounded-r-md self-center relative -ml-px z-30 transition-colors shadow-lg cursor-pointer h-10 flex items-center justify-center shrink-0"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Center Workspace (IDE Text Editor + Terminal Console) */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-900/40 p-4 gap-4 overflow-hidden">
          {/* Top Panel: IDE Editor Area */}
          <section className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-lg min-h-0">
            {/* Editor Tab Header */}
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-850 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-200 font-mono">{activeFileName}</span>
                {isModified && <span className="h-2 w-2 rounded-full bg-blue-500" title="未保存的修改" />}
              </div>

              {activeFilePath && (
                <div className="flex items-center gap-2">
                  <button
                    id="editor-btn-reset"
                    onClick={handleResetFile}
                    title="重置文件"
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    id="editor-btn-save"
                    onClick={handleSaveFile}
                    disabled={!isModified}
                    title="保存脚本"
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Save size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Code Textarea Area */}
            <div className="flex-1 relative flex overflow-hidden">
              {activeFilePath ? (
                <textarea
                  id="ide-code-textarea"
                  value={activeFileContent}
                  onChange={(e) => {
                    setActiveFileContent(e.target.value);
                    setIsModified(true);
                  }}
                  className="w-full h-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 outline-none resize-none leading-relaxed overflow-y-auto selection:bg-slate-800 focus:ring-0"
                  placeholder="// 在这里编写或粘贴 Auto.js 脚本"
                  spellCheck="false"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                  <Code size={24} className="text-slate-600" />
                  <span>请先在左侧新建或打开一个 JavaScript 文件</span>
                </div>
              )}
            </div>
          </section>

          {/* Bottom Panel: Interactive Terminal Console */}
          {isConsoleVisible && (
            <section className="h-44 shrink-0">
              <ConsolePanel
                logs={logs}
                onClearLogs={() => setLogs([])}
                activeFileName={activeFilePath ? activeFileName : null}
              />
            </section>
          )}
        </main>

        {/* Right Sidebar: Smartphone Mockup Simulator container */}
        <aside className="w-80 bg-slate-950/40 border-l border-slate-850 flex flex-col items-center justify-center shrink-0 p-6">
          <DeviceMockup
            isRunning={isRunning}
            toastMessage={toastMessage}
            activeDialog={activeDialog}
            onDialogResponse={handleDialogResponse}
            deviceInfo={deviceInfo}
            onUpdateDeviceInfo={setDeviceInfo}
            onRunActiveScript={handleRunScript}
            onStopActiveScript={handleStopScript}
          />
        </aside>
      </div>
    </div>
  );
}
