import { useState, useEffect } from 'react';
import { api } from '../services/api';
import SearchModal from '../components/SearchModal';
import SearchResultsView from '../components/SearchResultsView';
import BriefingWizard from '../components/BriefingWizard';

export default function Home() {
  const [showSearch, setShowSearch] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [papers, setPapers] = useState([]);
  const [originalPapers, setOriginalPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState('home'); // 'home' | 'results'
  const [filterConditions, setFilterConditions] = useState([]);

  useEffect(() => {
    api.listPapers().then((data) => {
      setPapers(data);
      setOriginalPapers(data);
    }).catch(() => {});
  }, []);

  const handleSearch = async (payload) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.search(payload);
      setPapers(data);
      setOriginalPapers(data);
      setFilterConditions([]);
      setMessage(`搜索完成，共找到 ${data.length} 篇文献。`);
      setViewMode('results');
      setShowSearch(false);
    } catch (e) {
      setMessage('搜索失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = async (conditions) => {
    setFilterConditions(conditions);
    try {
      const payload = {
        paper_ids: originalPapers.map(p => p.id),
        conditions,
      };
      const data = await api.filterPapers(payload);
      setPapers(data);
      setMessage(`筛选完成，剩余 ${data.length} 篇文献。`);
    } catch (e) {
      setMessage('筛选失败: ' + e.message);
    }
  };

  const handleSearchAuthor = async (authorName) => {
    setLoading(true);
    setMessage('');
    try {
      const payload = {
        conditions: [{ field: 'author', match: 'fuzzy', value: authorName, logic: 'AND' }],
        date_preset: '30d',
        date_from: null,
        date_to: null,
        sources: ['arxiv', 'zbmath', 'mathscinet'],
      };
      const data = await api.search(payload);
      setPapers(data);
      setOriginalPapers(data);
      setFilterConditions([]);
      setMessage(`搜索作者 "${authorName}" 完成，共找到 ${data.length} 篇文献。`);
      setViewMode('results');
    } catch (e) {
      setMessage('搜索失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBriefing = () => {
    if (papers.length === 0) {
      setMessage('请先生成搜索结果');
      return;
    }
    setShowBriefing(true);
  };

  const handleBriefingComplete = (briefing) => {
    setMessage(`简报已生成: ${briefing.title}`);
  };

  return (
    <div className="h-full flex flex-col">
      {viewMode === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center py-10">
            <h1 className="text-3xl font-extrabold text-gray-900">科研文献智能搜索</h1>
            <p className="text-gray-500 mt-2">支持 arXiv、zbMATH、MathSciNet 多源高级检索</p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setShowSearch(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
              >
                🔍 搜索最新文献
              </button>
              <button
                onClick={handleGenerateBriefing}
                className="px-6 py-3 bg-amber-600 text-white rounded-xl shadow hover:bg-amber-700 transition"
              >
                📄 生成简报
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm max-w-xl w-full mx-4">
              {message}
            </div>
          )}

          {papers.length > 0 && (
            <button
              onClick={() => setViewMode('results')}
              className="text-sm text-indigo-600 hover:underline mt-4"
            >
              查看上次搜索结果（{papers.length} 篇）→
            </button>
          )}
        </div>
      )}

      {viewMode === 'results' && (
        <div className="flex-1 flex flex-col min-h-0" style={{ height: 'calc(100vh - 120px)' }}>
          {message && (
            <div className="mb-3 p-2 bg-blue-50 text-blue-800 rounded-lg text-sm">
              {message}
            </div>
          )}
          <SearchResultsView
            papers={papers}
            onBack={() => setViewMode('home')}
            onGenerateBriefing={handleGenerateBriefing}
            onSearchAuthor={handleSearchAuthor}
            onFilterApply={handleFilterApply}
            filterConditions={filterConditions}
          />
        </div>
      )}

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} onSearch={handleSearch} />
      )}

      {showBriefing && (
        <BriefingWizard
          papers={papers}
          onClose={() => setShowBriefing(false)}
          onComplete={handleBriefingComplete}
        />
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl shadow-lg px-6 py-4 text-gray-700">
            加载中...
          </div>
        </div>
      )}
    </div>
  );
}
