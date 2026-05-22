import { useState } from 'react';

export default function BriefingModal({ papers, onClose, onGenerate }) {
  const [selected, setSelected] = useState(() => new Set(papers.map((p) => p.id)));
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await onGenerate(Array.from(selected), title || undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">生成简报</h2>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">简报标题（可选）</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="动力系统文献综述简报"
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto border rounded-lg p-2 mb-4">
          {papers.map((p) => (
            <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-gray-800 truncate">{p.title}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">取消</button>
          <button
            onClick={handleSubmit}
            disabled={loading || selected.size === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成 Word 简报'}
          </button>
        </div>
      </div>
    </div>
  );
}
