import { useState, useRef, useEffect, useCallback } from 'react';
import CitationGraph from './CitationGraph';
import PaperDetailPanel from './PaperDetailPanel';
import FilterPanel from './FilterPanel';

const PAGE_SIZE = 20;

// Font size helpers: reduce by 10%
const fs = {
  xs: { fontSize: '0.675rem' },   // 12px * 0.9
  sm: { fontSize: '0.7875rem' },  // 14px * 0.9
};

export default function SearchResultsView({
  papers,
  onBack,
  onGenerateBriefing,
  onSearchAuthor,
  onFilterApply,
  filterConditions,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [leftWidth, setLeftWidth] = useState(45);
  const [middleWidth, setMiddleWidth] = useState(30);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null); // 'left' | 'right'
  const containerRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(papers.length / PAGE_SIZE));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pagePapers = papers.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedPaper(null);
    setShowDetail(false);
    setLeftWidth(45);
    setMiddleWidth(30);
  }, [papers]);

  const handleSelectPaper = (paper) => {
    setSelectedPaper(paper);
    setShowDetail(true);
    setLeftWidth(35);
    setMiddleWidth(30);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedPaper(null);
    setLeftWidth(45);
    setMiddleWidth(30);
  };

  const handleMouseDown = useCallback((target) => (e) => {
    setIsDragging(true);
    setDragTarget(target);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current || !dragTarget) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;

      if (showDetail) {
        if (dragTarget === 'left') {
          const newLeft = Math.max(20, Math.min(60, pct));
          setLeftWidth(newLeft);
          // middleWidth stays unchanged; right column auto-adjusts
        } else if (dragTarget === 'right') {
          // Only adjust middle width; left width is unaffected
          const newMiddle = Math.max(20, Math.min(100 - leftWidth - 20, pct - leftWidth));
          setMiddleWidth(newMiddle);
        }
      } else {
        const newLeft = Math.max(25, Math.min(75, pct));
        setLeftWidth(newLeft);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragTarget(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragTarget, showDetail, leftWidth]);

  const handleFilter = async (conditions) => {
    await onFilterApply(conditions);
    setShowFilter(false);
  };

  const middleColWidth = showDetail ? `${middleWidth}%` : `${100 - leftWidth}%`;
  const rightColWidth = showDetail ? `${Math.max(20, 100 - leftWidth - middleWidth)}%` : undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900 underline" style={fs.sm}>
            ← 返回搜索
          </button>
          <span className="text-gray-500" style={fs.sm}>
            共 {papers.length} 篇文献
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilter(true)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            style={fs.sm}
          >
            🔍 筛选
          </button>
          <button
            onClick={onGenerateBriefing}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            style={fs.sm}
          >
            📄 生成科研简报
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        ref={containerRef}
        className="flex flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white"
      >
        {/* Left: Paper List */}
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: `${leftWidth}%` }}>
          <div className="flex-1 overflow-y-auto p-3" style={{ overscrollBehavior: 'contain' }}>
            {pagePapers.map((paper) => {
              let authorsStr = '';
              try {
                authorsStr = JSON.parse(paper.authors || '[]').join(', ');
              } catch {
                authorsStr = paper.authors || '';
              }
              let keywords = [];
              try {
                keywords = JSON.parse(paper.keywords || '[]');
              } catch {}
              const isSelected = selectedPaper && selectedPaper.id === paper.id;
              return (
                <div
                  key={paper.id}
                  onClick={() => handleSelectPaper(paper)}
                  className={`p-3 mb-2 rounded-lg border cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.7875rem', lineHeight: '1.4' }}>{paper.title}</h4>
                  <p className="text-gray-600 mt-0.5" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', ...fs.xs }}>{authorsStr}</p>
                  <p className="text-gray-400 mt-0.5" style={fs.xs}>
                    {paper.journal || paper.source} · {paper.published_date}
                  </p>
                  <p className="text-gray-500 mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', ...fs.xs }}>
                    {paper.summary_raw || '（暂无摘要）'}
                  </p>
                  {keywords.length > 0 && (
                    <p className="text-indigo-600 mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', ...fs.xs }}>
                      {keywords.join(', ')}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 mt-1 text-gray-500" style={fs.xs}>
                    {paper.doi && <span>DOI: {paper.doi}</span>}
                    <span>参考文献: {paper.reference_count || 0}</span>
                    <span>被引: {paper.citation_count || 0}</span>
                  </div>
                </div>
              );
            })}
            {pagePapers.length === 0 && (
              <div className="text-center text-gray-400 py-10" style={fs.sm}>暂无文献</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded border bg-white disabled:opacity-40"
                style={fs.xs}
              >上一页</button>
              <span className="text-gray-600" style={fs.xs}>
                第 {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, papers.length)} 条 / 共 {papers.length} 条 · 第 {currentPage}/{totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded border bg-white disabled:opacity-40"
                style={fs.xs}
              >下一页</button>
            </div>
          )}
        </div>

        {/* Resizer 1 */}
        <div
          className={`w-1.5 flex-shrink-0 cursor-col-resize ${isDragging && dragTarget === 'left' ? 'bg-indigo-400' : 'bg-gray-200 hover:bg-indigo-300'}`}
          onMouseDown={handleMouseDown('left')}
        />

        {/* Middle: Graph */}
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: middleColWidth }}>
          <div className="flex-shrink-0 font-semibold text-gray-500 px-3 py-2 border-b border-gray-100 bg-gray-50" style={fs.xs}>
            引用关系图
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <CitationGraph
              papers={pagePapers}
              selectedPaper={selectedPaper}
              onSelectPaper={handleSelectPaper}
            />
          </div>
        </div>

        {/* Resizer 2 (when detail shown) */}
        {showDetail && (
          <div
            className={`w-1.5 flex-shrink-0 cursor-col-resize ${isDragging && dragTarget === 'right' ? 'bg-indigo-400' : 'bg-gray-200 hover:bg-indigo-300'}`}
            onMouseDown={handleMouseDown('right')}
          />
        )}

        {/* Right: Detail Panel */}
        {showDetail && (
          <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: rightColWidth, minWidth: '200px' }}>
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
              <span className="font-semibold text-gray-500" style={fs.xs}>文献详情</span>
              <button onClick={handleCloseDetail} className="text-gray-400 hover:text-gray-600" style={fs.xs}>✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PaperDetailPanel
                paper={selectedPaper}
                onSearchAuthor={onSearchAuthor}
              />
            </div>
          </div>
        )}
      </div>

      {showFilter && (
        <FilterPanel
          onFilter={handleFilter}
          onClose={() => setShowFilter(false)}
          initialConditions={filterConditions}
        />
      )}
    </div>
  );
}
