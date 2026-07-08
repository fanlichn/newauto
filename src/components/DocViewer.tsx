import { useState } from 'react';
import { Search, HelpCircle, Code, Copy, Check } from 'lucide-react';
import { docItems } from '../docs';

interface DocViewerProps {
  onInsertCodeSnippet: (code: string) => void;
}

export const DocViewer: React.FC<DocViewerProps> = ({ onInsertCodeSnippet }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract categories
  const categories = ['all', ...Array.from(new Set(docItems.map(item => item.category)))];

  // Filter doc items
  const filteredDocs = docItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.apiList.some(api => 
        api.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">
        <HelpCircle size={14} />
        <span>Auto.js API 文档</span>
      </div>

      {/* Search Input */}
      <div className="px-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            id="doc-search-input"
            type="text"
            placeholder="搜索 API (例如 device, toast)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-xs text-slate-100 rounded-md pl-8 pr-3 py-2.5 outline-none border border-slate-700/60 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Categories Horizontal Pills */}
      <div className="flex gap-1 overflow-x-auto px-2 pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        {categories.map(cat => (
          <button
            key={cat}
            id={`btn-cat-${cat}`}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100'
            }`}
          >
            {cat === 'all' ? '全部' : cat}
          </button>
        ))}
      </div>

      {/* API Documents List */}
      <div className="space-y-4 px-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredDocs.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">
            没有找到相关的 API 文档。
          </div>
        ) : (
          filteredDocs.map(doc => (
            <div key={doc.id} id={`doc-group-${doc.id}`} className="bg-slate-850 border border-slate-800 rounded-lg p-3 space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-blue-400">{doc.title}</h4>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{doc.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{doc.description}</p>
              </div>

              {/* Sub API signatures */}
              <div className="border-t border-slate-800/80 pt-2.5 space-y-3">
                {doc.apiList.map((api, idx) => {
                  const apiUniqueId = `${doc.id}-${idx}`;
                  const isCopied = copiedId === apiUniqueId;

                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-xs font-medium text-amber-400/90">{api.signature}</code>
                        <div className="flex items-center gap-1">
                          <button
                            id={`btn-insert-${apiUniqueId}`}
                            title="插入代码到当前编辑器"
                            onClick={() => onInsertCodeSnippet(api.example)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Code size={12} />
                          </button>
                          <button
                            id={`btn-copy-${apiUniqueId}`}
                            title="复制代码"
                            onClick={() => handleCopy(api.example, apiUniqueId)}
                            className="p-1 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            {isCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{api.description}</p>
                      
                      {/* Code block example */}
                      <pre className="bg-slate-900 font-mono text-[10px] text-emerald-400 p-2 rounded border border-slate-850 overflow-x-auto leading-normal">
                        {api.example}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
