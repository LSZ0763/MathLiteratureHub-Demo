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
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">个性化科研助手</h1>
            <p className="text-gray-500 mt-1 text-sm">支持 arXiv、zbMATH、MathSciNet 多源高级检索</p>
            <div className="mt-4">
              <button
                onClick={() => setShowSearch(true)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition text-sm"
              >
                🔍 搜索最新文献
              </button>
            </div>
          </div>

          {papers.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setViewMode('results')}
                className="text-sm text-indigo-600 hover:underline"
              >
                查看上次搜索结果（{papers.length} 篇）→
              </button>
            </div>
          )}

          {/* Feature showcase */}
          <div className="mt-6 w-full max-w-3xl px-4">
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
              <h3 className="text-center text-sm font-bold text-gray-700 mb-3 tracking-wide">
                它能帮你做什么？
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: '📰', label: '轻松获取近期科研进展' },
                  { icon: '🗺️', label: '快速了解新领域科研图景' },
                  { icon: '📄', label: '生成科研简报' },
                  { icon: '📚', label: '帮助整理文献综述' },
                  { icon: '🔗', label: '分析文献之间的关联' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl px-3 py-2 transition cursor-default"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {message && (
            <div className="mt-3 p-2 bg-blue-50 text-blue-800 rounded-lg text-xs max-w-xl w-full mx-4">
              {message}
            </div>
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
