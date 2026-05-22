import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function History() {
  const [briefings, setBriefings] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadBriefings();
  }, []);

  const loadBriefings = () => {
    api.listBriefings()
      .then((data) => setBriefings(data))
      .catch((e) => setMsg('加载失败: ' + e.message));
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该简报吗？')) return;
    try {
      await api.deleteBriefing(id);
      setBriefings(briefings.filter((b) => b.id !== id));
    } catch (e) {
      setMsg('删除失败: ' + e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">历史简报</h2>
      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{msg}</div>}

      {briefings.length === 0 && <div className="text-gray-400 text-center py-16">暂无历史简报</div>}

      <div className="space-y-4">
        {briefings.map((b) => (
          <div key={b.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{b.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {b.created_at ? new Date(b.created_at).toLocaleString() : ''} · 格式: {b.format}
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href={api.downloadBriefing(b.id)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                下载
              </a>
              <button
                onClick={() => handleDelete(b.id)}
                className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
