import { useState, useMemo } from 'react';
import { api } from '../services/api';
import FilterPanel from './FilterPanel';

const SORT_OPTIONS = [
  { value: 'title', label: '标题名称' },
  { value: 'author', label: '作者姓名' },
  { value: 'citation_count', label: '被引用数量' },
  { value: 'date', label: '发表时间' },
  { value: 'journal', label: '杂志名' },
];

export default function BriefingWizard({ papers, onClose, onComplete }) {
  const [title, setTitle] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [customOrder, setCustomOrder] = useState(() => papers.map(p => p.id));
  const [isCustomSorted, setIsCustomSorted] = useState(false);
  const [filteredPapers, setFilteredPapers] = useState(papers);
  const [filterConditions, setFilterConditions] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultBriefing, setResultBriefing] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('customize'); // 'customize' | 'preview'

  const previewPapers = useMemo(() => {
    let list = [...filteredPapers];
    if (isCustomSorted) {
      const orderMap = new Map(customOrder.map((pid, i) => [pid, i]));
      list.sort((a, b) => {
        const ao = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
        const bo = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
        return ao - bo;
      });
    } else {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '');
        else if (sortBy === 'author') cmp = (a.authors || '').localeCompare(b.authors || '');
        else if (sortBy === 'citation_count') cmp = (a.citation_count || 0) - (b.citation_count || 0);
        else if (sortBy === 'date') {
          const da = a.published_date ? new Date(a.published_date) : new Date(0);
          const db = b.published_date ? new Date(b.published_date) : new Date(0);
          cmp = da - db;
        }
        else if (sortBy === 'journal') cmp = (a.journal || '').localeCompare(b.journal || '');
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }
    return list;
  }, [filteredPapers, sortBy, sortOrder, isCustomSorted, customOrder]);

  const handleFilterApply = async (conditions) => {
    setFilterConditions(conditions);
    try {
      const payload = {
        paper_ids: papers.map(p => p.id),
        conditions,
      };
      const data = await api.filterPapers(payload);
      setFilteredPapers(data);
    } catch (e) {
      setError('筛选失败: ' + e.message);
    }
  };

  const movePaper = (id, direction) => {
    const idx = customOrder.indexOf(id);
    if (idx < 0) return;
    const newOrder = [...customOrder];
    if (direction === 'top') {
      newOrder.splice(idx, 1);
      newOrder.unshift(id);
    } else if (direction === 'bottom') {
      newOrder.splice(idx, 1);
      newOrder.push(id);
    } else if (direction === 'up' && idx > 0) {
      [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
    } else if (direction === 'down' && idx < newOrder.length - 1) {
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    }
    setCustomOrder(newOrder);
    setIsCustomSorted(true);
  };

  const handleGenerate = async () => {
    if (filteredPapers.length === 0) {
      setError('请至少选择一篇文献');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const data = await api.generateBriefing(
        previewPapers.map(p => p.id),
        'docx',
        title || undefined,
        sortBy,
        sortOrder
      );
      setResultBriefing(data);
      onComplete && onComplete(data);
    } catch (e) {
      setError('生成失败: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const leftActive = activeTab === 'customize';
  const rightActive = activeTab === 'preview';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-indigo-700">生成科研简报</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Customize */}
          <div className={`w-1/2 flex flex-col border-r transition-colors ${leftActive ? 'bg-indigo-50' : 'bg-gray-50'}`}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className={`font-semibold ${leftActive ? 'text-indigo-700' : 'text-gray-500'}`}>自定义</h3>
              <button
                onClick={() => setActiveTab('preview')}
                className="text-sm px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50"
              >
                预览文件 →
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">简报标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入简报标题"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Filter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">筛选</label>
                  <button
                    onClick={() => setShowFilter(true)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {filterConditions.length > 0 ? `已设置 ${filterConditions.length} 个条件` : '设置筛选'}
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  当前包含 {filteredPapers.length} 篇文献
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序依据</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setIsCustomSorted(false); }}
                    className="flex-1 border rounded-lg px-2 py-2 text-sm"
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => { setSortOrder(e.target.value); setIsCustomSorted(false); }}
                    className="w-24 border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="desc">降序</option>
                    <option value="asc">升序</option>
                  </select>
                </div>
              </div>

              {/* Paper list with custom ordering */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文献列表（可调整顺序）
                </label>
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2 bg-white">
                  {previewPapers.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-gray-50">
                      <span className="text-xs text-gray-400 w-6">{idx + 1}.</span>
                      <span className="flex-1 truncate text-gray-800">{p.title}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => movePaper(p.id, 'up')}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                          title="上移一位"
                        >↑</button>
                        <button
                          onClick={() => movePaper(p.id, 'down')}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                          title="下移一位"
                        >↓</button>
                        <button
                          onClick={() => movePaper(p.id, 'top')}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                          title="排在首位"
                        >⇈</button>
                        <button
                          onClick={() => movePaper(p.id, 'bottom')}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                          title="排在末位"
                        >⇊</button>
                      </div>
                    </div>
                  ))}
                  {previewPapers.length === 0 && (
                    <div className="text-xs text-gray-400 py-4 text-center">无文献</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className={`w-1/2 flex flex-col transition-colors ${rightActive ? 'bg-indigo-50' : 'bg-white'}`}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setActiveTab('customize')}
                className="text-sm px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50"
              >
                ← 上一步：自定义
              </button>
              <h3 className={`font-semibold ${rightActive ? 'text-indigo-700' : 'text-gray-500'}`}>预览</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>
              )}

              <div className="mb-4">
                <h4 className="text-lg font-bold text-center text-gray-900 mb-4">
                  {title || '文献综述简报'}
                </h4>
                <div className="text-xs text-center text-gray-500 mb-4">
                  共 {previewPapers.length} 篇文献 · 按{SORT_OPTIONS.find(o => o.value === sortBy)?.label} {sortOrder === 'desc' ? '降序' : '升序'}排列
                </div>
              </div>

              <div className="space-y-4">
                {previewPapers.map((p, idx) => {
                  let authorsStr = '';
                  try {
                    authorsStr = JSON.parse(p.authors || '[]').join(', ');
                  } catch {
                    authorsStr = p.authors || '';
                  }
                  let keywords = [];
                  try {
                    keywords = JSON.parse(p.keywords || '[]');
                  } catch {}
                  return (
                    <div key={p.id} className="border-b border-gray-100 pb-3">
                      <div className="text-sm font-semibold text-gray-900">{idx + 1}. {p.title}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{authorsStr}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {p.journal || p.source} · {p.published_date}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-3">
                        {p.summary_raw || '（暂无摘要）'}
                      </div>
                      {keywords.length > 0 && (
                        <div className="text-xs text-indigo-600 mt-1">
                          关键词: {keywords.join(', ')}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-500">
                        {p.doi && <span>DOI: {p.doi}</span>}
                        <span>参考文献: {p.reference_count || 0}</span>
                        <span>被引: {p.citation_count || 0}</span>
                      </div>
                    </div>
                  );
                })}
                {previewPapers.length === 0 && (
                  <div className="text-center text-gray-400 py-10">无文献可预览</div>
                )}
              </div>
            </div>

            {/* Generate button */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              {resultBriefing ? (
                <a
                  href={api.downloadBriefing(resultBriefing.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  ⬇ 下载 Word 简报
                </a>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generating || previewPapers.length === 0}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  {generating ? '生成中...' : '下一步：生成 WORD'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFilter && (
        <FilterPanel
          onFilter={handleFilterApply}
          onClose={() => setShowFilter(false)}
          initialConditions={filterConditions}
        />
      )}
    </div>
  );
}
