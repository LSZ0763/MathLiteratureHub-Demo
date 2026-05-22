import { useState } from 'react';

export default function PaperCard({ paper, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const authors = (() => {
    try {
      return JSON.parse(paper.authors || '[]').join(', ');
    } catch {
      return paper.authors || '';
    }
  })();

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-4 border border-gray-100">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 text-indigo-600 rounded"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{paper.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{authors}</p>
          <p className="text-xs text-gray-400 mt-0.5">{paper.published_date} · {paper.source}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setExpanded(!expanded)} className="text-sm text-indigo-600 hover:underline">
              {expanded ? '收起摘要' : '查看摘要'}
            </button>
            {paper.pdf_link && (
              <a href={paper.pdf_link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                {paper.source === 'mathscinet' ? 'MathSciNet' : paper.source === 'zbmath' ? 'zbMATH' : 'PDF'}
              </a>
            )}
          </div>
          {expanded && (
            <div className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              <p className="whitespace-pre-wrap">{paper.summary_raw}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
