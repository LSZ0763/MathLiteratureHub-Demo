import { useMemo } from 'react';

export default function CitationGraph({ papers, selectedPaper, onSelectPaper }) {
  const width = 600;
  const height = 400;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const { nodes, edges, xScale, yScale, xTicks, yTicks } = useMemo(() => {
    if (!papers || papers.length === 0) {
      return { nodes: [], edges: [], xScale: () => 0, yScale: () => 0, xTicks: [], yTicks: [] };
    }

    const years = papers.map(p => p.published_date ? new Date(p.published_date).getFullYear() : null).filter(Boolean);
    const citations = papers.map(p => p.citation_count || 0);
    
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearRange = maxYear === minYear ? 1 : maxYear - minYear;
    
    const maxCite = Math.max(...citations, 1);
    
    const xScale = (year) => padding.left + ((year - minYear) / yearRange) * graphWidth;
    const yScale = (cite) => padding.top + graphHeight - (cite / maxCite) * graphHeight;
    
    const xTicks = [];
    for (let y = minYear; y <= maxYear; y++) {
      xTicks.push(y);
    }
    
    const yMax = Math.ceil(maxCite / 10) * 10 || 10;
    const yTicks = [];
    for (let i = 0; i <= 5; i++) {
      yTicks.push(Math.round((yMax / 5) * i));
    }
    
    const nodes = papers.map(p => {
      const year = p.published_date ? new Date(p.published_date).getFullYear() : minYear;
      const cite = p.citation_count || 0;
      return {
        id: p.id,
        x: xScale(year),
        y: yScale(cite),
        year,
        cite,
        title: p.title,
        paper: p,
      };
    });
    
    // Build edges based on reference title matching
    const titleMap = new Map();
    papers.forEach(p => {
      const t = (p.title || '').toLowerCase().trim();
      if (t) titleMap.set(t, p.id);
    });
    
    const edgeSet = new Set();
    const edges = [];
    
    papers.forEach(p => {
      let refs = [];
      try {
        refs = JSON.parse(p.refs || '[]');
      } catch {}
      refs.forEach(ref => {
        const refTitle = ((ref.title || ref.display_name || '') + '').toLowerCase().trim();
        if (refTitle && titleMap.has(refTitle)) {
          const targetId = titleMap.get(refTitle);
          if (targetId !== p.id) {
            const key = [Math.min(p.id, targetId), Math.max(p.id, targetId)].join('-');
            if (!edgeSet.has(key)) {
              edgeSet.add(key);
              const sourceNode = nodes.find(n => n.id === p.id);
              const targetNode = nodes.find(n => n.id === targetId);
              if (sourceNode && targetNode) {
                edges.push({ x1: sourceNode.x, y1: sourceNode.y, x2: targetNode.x, y2: targetNode.y });
              }
            }
          }
        }
      });
    });
    
    return { nodes, edges, xScale, yScale, xTicks, yTicks };
  }, [papers]);

  if (!papers || papers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMin meet">
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={`yh-${i}`}
            x1={padding.left} y1={yScale(t)}
            x2={width - padding.right} y2={yScale(t)}
            stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3,3"
          />
        ))}
        
        {/* Axes */}
        <line x1={padding.left} y1={height - padding.bottom}
          x2={width - padding.right} y2={height - padding.bottom}
          stroke="#9ca3af" strokeWidth={1.5}
        />
        <line x1={padding.left} y1={padding.top}
          x2={padding.left} y2={height - padding.bottom}
          stroke="#9ca3af" strokeWidth={1.5}
        />
        
        {/* X ticks */}
        {xTicks.map((t, i) => (
          <g key={`xt-${i}`}>
            <line x1={xScale(t)} y1={height - padding.bottom}
              x2={xScale(t)} y2={height - padding.bottom + 5}
              stroke="#9ca3af" strokeWidth={1}
            />
            <text x={xScale(t)} y={height - padding.bottom + 20}
              textAnchor="middle" fontSize={10} fill="#6b7280"
            >{t}</text>
          </g>
        ))}
        
        {/* Y ticks */}
        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line x1={padding.left - 5} y1={yScale(t)}
              x2={padding.left} y2={yScale(t)}
              stroke="#9ca3af" strokeWidth={1}
            />
            <text x={padding.left - 10} y={yScale(t) + 4}
              textAnchor="end" fontSize={10} fill="#6b7280"
            >{t}</text>
          </g>
        ))}
        
        {/* Axis labels */}
        <text x={width / 2} y={height - 8}
          textAnchor="middle" fontSize={12} fill="#374151"
        >发表年份</text>
        <text x={15} y={height / 2}
          textAnchor="middle" fontSize={12} fill="#374151"
          transform={`rotate(-90, 15, ${height / 2})`}
        >被引用数量</text>
        
        {/* Edges */}
        {edges.map((e, i) => (
          <line key={`e-${i}`}
            x1={e.x1} y1={e.y1}
            x2={e.x2} y2={e.y2}
            stroke="#cbd5e1" strokeWidth={1}
          />
        ))}
        
        {/* Nodes */}
        {nodes.map(n => (
          <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => onSelectPaper(n.paper)}>
            <circle
              cx={n.x} cy={n.y}
              r={selectedPaper && selectedPaper.id === n.id ? 8 : 6}
              fill={selectedPaper && selectedPaper.id === n.id ? '#4f46e5' : '#93c5fd'}
              stroke={selectedPaper && selectedPaper.id === n.id ? '#312e81' : '#3b82f6'}
              strokeWidth={2}
            />
            <title>{n.title} ({n.year}, 被引{n.cite}次)</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
