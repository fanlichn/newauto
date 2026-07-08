import { useState } from 'react';
import { Folder, FolderOpen, FileCode, Trash2, ChevronRight, ChevronDown, FilePlus, FolderPlus } from 'lucide-react';
import { FileNode } from '../types';

interface FileExplorerProps {
  files: FileNode[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onDeleteNode: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteNode
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/JavaScript', '/设备与设备信息', '/对话框', '/定时器', '/HTTP网络请求']));
  const [showAddInput, setShowAddInput] = useState<{ parentPath: string; type: 'file' | 'directory' } | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const toggleExpand = (path: string) => {
    const next = new Set(expandedDirs);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setExpandedDirs(next);
  };

  const handleAddSubmit = (parentPath: string) => {
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    const formattedName = showAddInput?.type === 'file' && !name.endsWith('.js') ? name + '.js' : name;

    if (showAddInput?.type === 'file') {
      onCreateFile(parentPath, formattedName);
    } else {
      onCreateFolder(parentPath, formattedName);
    }

    setNewItemName('');
    setShowAddInput(null);
    
    // Ensure parent is expanded
    const next = new Set(expandedDirs);
    next.add(parentPath);
    setExpandedDirs(next);
  };

  const renderNode = (node: FileNode) => {
    const isDir = node.type === 'directory';
    const isExpanded = expandedDirs.has(node.path);
    const isActive = activeFilePath === node.path;

    return (
      <div key={node.path} id={`node-${node.path.replace(/\//g, '-')}`} className="select-none text-sm">
        {/* Row element */}
        <div
          className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150 ${
            isActive
              ? 'bg-blue-600/20 text-blue-400 font-medium'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
          }`}
          onClick={() => {
            if (isDir) {
              toggleExpand(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isDir ? (
              <span className="text-slate-500">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            ) : (
              <span className="w-3.5" /> /* indentation spacer */
            )}

            {isDir ? (
              isExpanded ? (
                <FolderOpen size={16} className="text-amber-400 shrink-0" />
              ) : (
                <Folder size={16} className="text-amber-400 shrink-0" />
              )
            ) : (
              <FileCode size={16} className="text-sky-400 shrink-0" />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          {/* Actions */}
          <div className="hidden group-hover:flex items-center gap-1 opacity-80 hover:opacity-100">
            {isDir && (
              <>
                <button
                  id={`btn-newfile-${node.path.replace(/\//g, '-')}`}
                  title="新建脚本 (.js)"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddInput({ parentPath: node.path, type: 'file' });
                  }}
                  className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-700/50 rounded"
                >
                  <FilePlus size={13} />
                </button>
                <button
                  id={`btn-newfolder-${node.path.replace(/\//g, '-')}`}
                  title="新建文件夹"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddInput({ parentPath: node.path, type: 'directory' });
                  }}
                  className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 rounded"
                >
                  <FolderPlus size={13} />
                </button>
              </>
            )}
            <button
              id={`btn-del-${node.path.replace(/\//g, '-')}`}
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`确定要删除 ${node.name} 吗？`)) {
                  onDeleteNode(node.path);
                }
              }}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* New Item Input Box inside parent folder */}
        {showAddInput?.parentPath === node.path && (
          <div className="pl-6 pr-2 py-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {showAddInput.type === 'file' ? (
              <FileCode size={14} className="text-sky-400 shrink-0" />
            ) : (
              <Folder size={14} className="text-amber-400 shrink-0" />
            )}
            <input
              id="new-item-input"
              type="text"
              autoFocus
              placeholder={showAddInput.type === 'file' ? '文件名.js' : '文件夹名'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubmit(node.path);
                if (e.key === 'Escape') setShowAddInput(null);
              }}
              className="w-full bg-slate-850 text-xs text-slate-100 border border-slate-700 rounded px-1.5 py-0.5 outline-none focus:border-blue-500"
            />
            <button
              id="btn-confirm-add"
              onClick={() => handleAddSubmit(node.path)}
              className="px-1.5 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 rounded text-white"
            >
              确定
            </button>
          </div>
        )}

        {/* Children directories/files */}
        {isDir && isExpanded && node.children && (
          <div className="pl-3 mt-0.5 border-l border-slate-800 ml-3.5 space-y-0.5">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider uppercase px-2 mb-2">
        <span>脚本管理器</span>
        <button
          id="btn-root-newfile"
          title="在根目录新建脚本"
          onClick={() => setShowAddInput({ parentPath: '', type: 'file' })}
          className="p-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
        >
          <FilePlus size={14} />
        </button>
      </div>

      {/* Root input input box */}
      {showAddInput?.parentPath === '' && (
        <div className="px-2 py-1 flex items-center gap-1.5 bg-slate-800/40 rounded-md mb-2">
          {showAddInput.type === 'file' ? (
            <FileCode size={14} className="text-sky-400 shrink-0" />
          ) : (
            <Folder size={14} className="text-amber-400 shrink-0" />
          )}
          <input
            id="root-new-item-input"
            type="text"
            autoFocus
            placeholder="新建脚本.js"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubmit('');
              if (e.key === 'Escape') setShowAddInput(null);
            }}
            className="w-full bg-slate-850 text-xs text-slate-100 border border-slate-700 rounded px-1.5 py-0.5 outline-none focus:border-blue-500"
          />
          <button
            id="btn-confirm-root-add"
            onClick={() => handleAddSubmit('')}
            className="px-1.5 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 rounded text-white"
          >
            确定
          </button>
        </div>
      )}

      <div className="space-y-1">
        {files.map((node) => renderNode(node))}
      </div>
    </div>
  );
};
