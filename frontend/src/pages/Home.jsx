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
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState('home'); // 'home' | 'results'
  const [filterConditions, setFilterConditions] = useState([]);

  useEffect(() => {
    api.listPapers().then((data) => {
      setPapers(data);
      setOriginalPapers(data);
    }).catch(() => {});
  }, []);

  const handleSearch = async (payload, callbacks = {}) => {
    const { onProgress, onSourceComplete, signal } = callbacks;
    setMessage('');

    const sources = payload.sources;
    const allResults = [];

    // Estimated search time per source (seconds)
    const estimatedTimes = {
      arxiv: 15,
      zbmath: 8,
      mathscinet: 8,
    };

    const searchOneSource = async (source) => {
      const singlePayload = { ...payload, sources: [source] };
      const ctrl = new AbortController();

      const onAbort = () => ctrl.abort();
      signal?.addEventListener('abort', onAbort);

      const startTime = Date.now();
      const estimatedTime = estimatedTimes[source] || 10;

      // Simulate progress updates
      const progressTimer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(95, (elapsed / estimatedTime) * 100);
        onProgress?.(source, { status: 'loading', progress, estimatedTime });
      }, 500);

      try {
        const data = await api.search(singlePayload, ctrl.signal);
        clearInterval(progressTimer);
        onProgress?.(source, { status: 'done', progress: 100, estimatedTime });
        onSourceComplete?.(source, data);
        return data;
      } catch (e) {
        clearInterval(progressTimer);
        if (e.name === 'AbortError' || ctrl.signal.aborted) {
          onProgress?.(source, { status: 'stopped', progress: 0, estimatedTime });
          return [];
        }
        onProgress?.(source, { status: 'error', progress: 0, estimatedTime, error: e.message });
        return [];
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }
    };

    const promises = sources.map((source) => searchOneSource(source));
    const resultsArray = await Promise.all(promises);

    resultsArray.forEach((data) => allResults.push(...data));

    setPapers(allResults);
    setOriginalPapers(allResults);
    setFilterConditions([]);
    setMessage(`搜索完成，共找到 ${allResults.length} 篇文献。`);
    setViewMode('results');
    setShowSearch(false);

    return allResults;
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
    <div className="h-full flex flex-col overflow-hidden">
      {viewMode === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center overflow-auto">
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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {message && (
            <div className="mb-3 p-2 bg-blue-50 text-blue-800 rounded-lg text-sm flex-shrink-0">
              {message}
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <SearchResultsView
              papers={papers}
              onBack={() => setViewMode('home')}
              onGenerateBriefing={handleGenerateBriefing}
              onSearchAuthor={handleSearchAuthor}
              onFilterApply={handleFilterApply}
              filterConditions={filterConditions}
            />
          </div>
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
    </div>
  );
}
