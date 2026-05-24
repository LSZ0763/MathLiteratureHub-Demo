import { useState } from 'react';

// Font size helpers: reduce by 10%
const fs = {
  xs: { fontSize: '0.675rem' },   // 12px * 0.9
  sm: { fontSize: '0.7875rem' },  // 14px * 0.9
  lg: { fontSize: '1.0125rem' },  // 18px * 0.9
};

export default function PaperDetailPanel({ paper, onSearchAuthor }) {
  const [refsExpanded, setRefsExpanded] = useState(false);
  
  if (!paper) return null;
  
  let authors = [];
  try {
    authors = JSON.parse(paper.authors || '[]');
  } catch {
    authors = paper.authors ? [paper.authors] : [];
  }
  
  let keywords = [];
  try {
    keywords = JSON.parse(paper.keywords || '[]');
  } catch {
    keywords = paper.keywords ? [paper.keywords] : [];
  }
  
  let references = [];
  try {
    references = JSON.parse(paper.refs || '[]');
  } catch {
    references = [];
  }
  
  return (
    <div className="h-full overflow-y-auto p-4 bg-white border-l border-gray-200" style={{ overscrollBehavior: 'contain' }}>
      <h2 className="font-bold text-gray-900 mb-3" style={{ ...fs.lg, lineHeight: '1.3' }}>{paper.title}</h2>
      
      <div className="mb-3">
        <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>作者</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {authors.map((a, i) => (
            <button key={i}
              onClick={() => onSearchAuthor && onSearchAuthor(a)}
              className="text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded"
              title="搜索该作者的所有文献"
              style={fs.sm}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      
      {paper.journal && (
        <div className="mb-3">
          <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>杂志</span>
          <p className="text-gray-800 mt-0.5" style={fs.sm}>{paper.journal}</p>
        </div>
      )}
      
      {paper.published_date && (
        <div className="mb-3">
          <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>发表日期</span>
          <p className="text-gray-800 mt-0.5" style={fs.sm}>{paper.published_date}</p>
        </div>
      )}
      
      <div className="mb-3">
        <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>摘要</span>
        <p className="text-gray-700 mt-1 leading-relaxed" style={fs.sm}>{paper.summary_raw || '（暂无摘要）'}</p>
      </div>
      
      {keywords.length > 0 && (
        <div className="mb-3">
          <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>关键词</span>
          <p className="text-gray-700 mt-0.5" style={fs.sm}>{keywords.join(', ')}</p>
        </div>
      )}
      
      {paper.doi && (
        <div className="mb-3">
          <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>DOI</span>
          <p className="text-indigo-600 mt-0.5 break-all" style={fs.sm}>
            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer" className="hover:underline">
              {paper.doi}
            </a>
          </p>
        </div>
      )}
      
      {paper.pdf_link && (
        <div className="mb-3">
          <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>链接</span>
          <p className="text-indigo-600 mt-0.5 break-all" style={fs.sm}>
            <a href={paper.pdf_link} target="_blank" rel="noreferrer" className="hover:underline">
              {paper.pdf_link}
            </a>
          </p>
        </div>
      )}
      
      <div className="mb-3 flex gap-4">
        <div>
          <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>参考文献数量</span>
          <p className="text-gray-800 mt-0.5" style={fs.sm}>{paper.reference_count || 0}</p>
        </div>
        <div>
          <span className="font-semibold text-gray-500 uppercase" style={fs.xs}>被引用数量</span>
          <p className="text-gray-800 mt-0.5" style={fs.sm}>{paper.citation_count || 0}</p>
        </div>
      </div>
      
      <div className="mb-2">
        <button
          onClick={() => setRefsExpanded(!refsExpanded)}
          className="flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900"
          style={fs.sm}
        >
          <span>{refsExpanded ? '▼' : '▶'}</span>
          参考文献列表 ({references.length})
        </button>
      </div>
      
      {refsExpanded && (
        <div className="space-y-2 pl-2 border-l-2 border-indigo-100">
          {references.length === 0 && (
            <p className="text-gray-500" style={fs.sm}>暂无参考文献数据</p>
          )}
          {references.map((ref, i) => (
            <div key={i} className="text-gray-700" style={fs.sm}>
              {typeof ref === 'object' ? (
                <div>
                  <span className="font-medium">{ref.title || '(无标题)'}</span>
                  {ref.authors && (
                    <span className="text-gray-500"> — {Array.isArray(ref.authors) ? ref.authors.join(', ') : ref.authors}</span>
                  )}
                  {ref.year && <span className="text-gray-500"> ({ref.year})</span>}
                  {ref.doi && (
                    <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline ml-1">
                      [DOI]
                    </a>
                  )}
                </div>
              ) : (
                <span>{String(ref)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
