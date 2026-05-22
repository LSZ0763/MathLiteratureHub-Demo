import { useState } from 'react';

const FIELD_OPTIONS = [
  { value: 'topic', label: '主题' },
  { value: 'author', label: '作者' },
  { value: 'source', label: '文献来源' },
  { value: 'doi', label: 'DOI' },
  { value: 'subject', label: '学科' },
  { value: 'subfield', label: '研究方向' },
  { value: 'citation_count', label: '被引用数量' },
];

const MATCH_OPTIONS = [
  { value: 'fuzzy', label: '包含' },
  { value: 'exact', label: '精确匹配' },
  { value: 'gte', label: '大于等于' },
  { value: 'lte', label: '小于等于' },
];

const LOGIC_OPTIONS = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
  { value: 'NOT', label: 'NOT' },
];

export default function FilterPanel({ onFilter, onClose, initialConditions = [] }) {
  const [conditions, setConditions] = useState(
    initialConditions.length > 0
      ? initialConditions
      : [{ field: 'topic', match: 'fuzzy', value: '', logic: 'AND' }]
  );
  const [loading, setLoading] = useState(false);

  const addCondition = () => {
    setConditions([...conditions, { field: 'topic', match: 'fuzzy', value: '', logic: 'AND' }]);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index, key, value) => {
    const next = [...conditions];
    next[index] = { ...next[index], [key]: value };
    // Auto adjust match for citation_count
    if (next[index].field === 'citation_count' && ['fuzzy', 'exact'].includes(next[index].match)) {
      next[index].match = 'gte';
    }
    setConditions(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onFilter(conditions.filter(c => c.value.trim() !== ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">筛选结果</h2>
        <form onSubmit={handleSubmit}>
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
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  className="w-28 border rounded-lg px-2 py-2 text-sm"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={cond.match}
                  onChange={(e) => updateCondition(index, 'match', e.target.value)}
                  className="w-28 border rounded-lg px-2 py-2 text-sm"
                >
                  {MATCH_OPTIONS.filter(o => {
                    if (cond.field === 'citation_count') return ['gte', 'lte', 'exact'].includes(o.value);
                    return ['fuzzy', 'exact'].includes(o.value);
                  }).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type={cond.field === 'citation_count' ? 'number' : 'text'}
                  value={cond.value}
                  onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  placeholder={cond.field === 'citation_count' ? '输入数量' : '输入内容'}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                {conditions.length > 1 && (
                  <button type="button" onClick={() => removeCondition(index)}
                    className="text-red-500 text-sm hover:underline px-2"
                  >删除</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addCondition}
              className="text-indigo-600 text-sm hover:underline"
            >+ 添加筛选条件</button>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border rounded-lg hover:bg-gray-50"
            >取消</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >{loading ? '筛选中...' : '应用筛选'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
