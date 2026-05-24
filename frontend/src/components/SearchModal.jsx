import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const FIELD_OPTIONS = [
  { value: 'topic', label: '主题' },
  { value: 'author', label: '作者' },
  { value: 'source', label: '文献来源' },
  { value: 'doi', label: 'DOI' },
  { value: 'subject', label: '学科' },
  { value: 'subfield', label: '研究方向' },
];

const MATCH_OPTIONS = [
  { value: 'fuzzy', label: '模糊' },
  { value: 'exact', label: '精确' },
];

const LOGIC_OPTIONS = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
  { value: 'NOT', label: 'NOT' },
];

const DATE_PRESETS = [
  { value: '7d', label: '最近7天' },
  { value: '14d', label: '最近14天' },
  { value: '30d', label: '最近30天' },
  { value: 'custom', label: '自定义' },
];

const SOURCE_OPTIONS = [
  { value: 'arxiv', label: 'arXiv' },
  { value: 'zbmath', label: 'zbMATH' },
  { value: 'mathscinet', label: 'MathSciNet' },
];

const SOURCE_ESTIMATED_TIME = {
  arxiv: 15,
  zbmath: 8,
  mathscinet: 8,
};

export default function SearchModal({ onClose, onSearch }) {
  const [conditions, setConditions] = useState([
    { field: 'topic', match: 'fuzzy', value: '', logic: 'AND' },
  ]);
  const [datePreset, setDatePreset] = useState('7d');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [sources, setSources] = useState(['arxiv', 'zbmath', 'mathscinet']);
  const [subjectInfo, setSubjectInfo] = useState({ subjects: [], subfields: {} });
  const [searchPhase, setSearchPhase] = useState('idle'); // 'idle' | 'searching' | 'stopping'
  const [progressMap, setProgressMap] = useState({});
  const abortCtrlRef = useRef(null);

  useEffect(() => {
    api.getSubjects().then(setSubjectInfo).catch(() => {});
  }, []);

  const addCondition = () => {
    setConditions([...conditions, { field: 'topic', match: 'fuzzy', value: '', logic: 'AND' }]);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index, key, value) => {
    const next = [...conditions];
    next[index] = { ...next[index], [key]: value };
    setConditions(next);
  };

  const toggleSource = (src) => {
    setSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sources.length === 0) {
      alert('请至少选择一个数据源');
      return;
    }

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    setSearchPhase('searching');

    // Initialize progress
    const initialProgress = {};
    sources.forEach((s) => {
      initialProgress[s] = {
        status: 'loading',
        progress: 0,
        estimatedTime: SOURCE_ESTIMATED_TIME[s] || 10,
      };
    });
    setProgressMap(initialProgress);

    const payload = {
      conditions: conditions.filter((c) => c.value.trim() !== ''),
      date_preset: datePreset === 'custom' ? null : datePreset,
      date_from: datePreset === 'custom' ? customDateFrom || null : null,
      date_to: datePreset === 'custom' ? customDateTo || null : null,
      sources,
    };

    try {
      await onSearch(payload, {
        onProgress: (source, info) => {
          setProgressMap((prev) => ({ ...prev, [source]: info }));
        },
        onSourceComplete: (source, papers) => {
          // Optional: could show per-source result count
        },
        signal: ctrl.signal,
      });
      onClose();
    } catch (e) {
      if (e.name === 'AbortError' || ctrl.signal.aborted) {
        // User stopped manually; don't show error
      } else {
        alert('搜索失败: ' + e.message);
      }
    } finally {
      setSearchPhase('idle');
      abortCtrlRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      setSearchPhase('stopping');
    }
  };

  const getValueInput = (cond, index) => {
    if (cond.field === 'subject') {
      return (
        <select
          value={cond.value}
          onChange={(e) => updateCondition(index, 'value', e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2"
        >
          <option value="">请选择学科</option>
          {subjectInfo.subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      );
    }
    if (cond.field === 'subfield') {
      const currentSubject = conditions.find((c) => c.field === 'subject')?.value || '';
      const subfields = currentSubject ? subjectInfo.subfields[currentSubject] || [] : [];
      return (
        <select
          value={cond.value}
          onChange={(e) => updateCondition(index, 'value', e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2"
        >
          <option value="">请选择研究方向</option>
          {subfields.map((sf) => (
            <option key={sf} value={sf}>
              {sf}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="text"
        value={cond.value}
        onChange={(e) => updateCondition(index, 'value', e.target.value)}
        placeholder="输入搜索内容"
        className="flex-1 border rounded-lg px-3 py-2"
      />
    );
  };

  const isSearching = searchPhase === 'searching' || searchPhase === 'stopping';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">高级搜索</h2>
        <form onSubmit={handleSubmit}>
          {/* Search Conditions */}
          <div className="space-y-3 mb-6">
            {conditions.map((cond, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <select
                    value={cond.logic}
                    onChange={(e) => updateCondition(index, 'logic', e.target.value)}
                    className="w-20 border rounded-lg px-2 py-2 text-sm"
                  >
                    {LOGIC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  className="w-28 border rounded-lg px-2 py-2 text-sm"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={cond.match}
                  onChange={(e) => updateCondition(index, 'match', e.target.value)}
                  className="w-20 border rounded-lg px-2 py-2 text-sm"
                >
                  {MATCH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {getValueInput(cond, index)}
                {conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="text-red-500 text-sm hover:underline px-2"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addCondition}
              className="text-indigo-600 text-sm hover:underline"
            >
              + 添加搜索条件
            </button>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">发表时间</label>
            <div className="flex flex-wrap gap-3">
              {DATE_PRESETS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="date_preset"
                    value={opt.value}
                    checked={datePreset === opt.value}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="text-indigo-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {datePreset === 'custom' && (
              <div className="flex gap-3 mt-3">
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
                <span className="self-center text-gray-500">至</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
            )}
          </div>

          {/* Data Sources */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">数据来源</label>
            <div className="flex gap-4">
              {SOURCE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sources.includes(opt.value)}
                    onChange={() => toggleSource(opt.value)}
                    className="text-indigo-600 rounded"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Progress Panel */}
          {isSearching && (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">搜索进度</h3>
              <div className="space-y-3">
                {sources.map((src) => {
                  const info = progressMap[src] || { status: 'loading', progress: 0, estimatedTime: SOURCE_ESTIMATED_TIME[src] || 10 };
                  const label = SOURCE_OPTIONS.find((o) => o.value === src)?.label || src;
                  const statusText =
                    info.status === 'done'
                      ? '已完成'
                      : info.status === 'error'
                      ? '出错'
                      : info.status === 'stopped'
                      ? '已停止'
                      : `预计 ${info.estimatedTime} 秒`;
                  return (
                    <div key={src}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{label}</span>
                        <span className="text-gray-500">{statusText} · {Math.round(info.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            info.status === 'error' ? 'bg-red-500' : info.status === 'done' ? 'bg-green-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${info.progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {searchPhase === 'searching' && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="mt-4 w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                >
                  停止搜索，查看已搜索的文献
                </button>
              )}
              {searchPhase === 'stopping' && (
                <p className="mt-4 text-center text-sm text-gray-500">正在停止搜索...</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSearching}
              className="px-5 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isSearching ? '搜索中...' : '开始搜索'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
