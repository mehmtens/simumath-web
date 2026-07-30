import { useMemo, useState, useCallback } from 'react';
import { generateWeightedGraph, computeCircularLayout, shortestPath } from '../lib/network';

const VIEW_SIZE = 380;
const NODE_R = 20;

function toScreen(x, y, radius) {
  const scale = (VIEW_SIZE / 2 - NODE_R - 12) / radius;
  return [VIEW_SIZE / 2 + x * scale, VIEW_SIZE / 2 - y * scale];
}

function buildGraphState() {
  const graph = generateWeightedGraph(7, 0.4);
  const positions = computeCircularLayout(graph.nodes);
  return { graph, positions };
}

export default function NetworkTab() {
  const [{ graph, positions }, setGraphState] = useState(buildGraphState);
  const [start, setStart] = useState(graph.nodes[0]);
  const [end, setEnd] = useState(graph.nodes[graph.nodes.length - 1]);

  const regenerate = useCallback(() => {
    const next = buildGraphState();
    setGraphState(next);
    setStart(next.graph.nodes[0]);
    setEnd(next.graph.nodes[next.graph.nodes.length - 1]);
  }, []);

  const result = useMemo(() => shortestPath(graph, start, end), [graph, start, end]);

  const pathEdgeSet = useMemo(() => {
    const s = new Set();
    result.pathEdges.forEach(([u, v]) => { s.add(`${u}-${v}`); s.add(`${v}-${u}`); });
    return s;
  }, [result]);

  let title;
  let titleColor = 'var(--text)';
  if (result.sameNode) {
    title = `Başlangıç ve bitiş düğümü aynı (${start}) — yol uzunluğu 0`;
  } else if (result.found) {
    title = `Dijkstra En Kısa Yol Algoritması (Düğümler: ${start} ➔ ${end})`;
  } else {
    title = `Yol Bulunamadı: ${start} düğümünden ${end} düğümüne ulaşılamıyor (bağlantısız graf)`;
    titleColor = 'var(--accent-red)';
  }

  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>Ağ Topolojisi Kontrolü</h2>
        <p className="description">
          Düğümler arası otomatik rastgele maliyetli ağ grafiği kurulur ve Dijkstra ile en kısa yol hesaplanır.
        </p>
        <button className="btn btn-primary" onClick={regenerate}>Yeni Ağ Üret</button>

        <div className="field">
          <label><span>Başlangıç Düğümü</span></label>
          <select value={start} onChange={(e) => setStart(Number(e.target.value))}>
            {graph.nodes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <label><span>Bitiş Düğümü</span></label>
          <select value={end} onChange={(e) => setEnd(Number(e.target.value))}>
            {graph.nodes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="viz-panel">
        <div className="viz-title" style={{ color: titleColor }}>{title}</div>
        <div className="viz-body">
          <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} width="100%" style={{ maxWidth: 420 }}>
            {graph.edges.map((e, i) => {
              const [x1, y1] = toScreen(...positions[e.u], 4);
              const [x2, y2] = toScreen(...positions[e.v], 4);
              const isPath = pathEdgeSet.has(`${e.u}-${e.v}`);
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={isPath ? '#4cc9f0' : '#3a4a6b'} strokeWidth={isPath ? 4 : 1.5} />
                  <rect x={mx - 8} y={my - 8} width={16} height={16} rx={3} fill="#0b1220" opacity={0.85} />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#e8ecf3" fontFamily="var(--font-display)">
                    {e.weight}
                  </text>
                </g>
              );
            })}
            {graph.nodes.map((n) => {
              const [x, y] = toScreen(...positions[n], 4);
              const isEndpoint = n === start || n === end;
              return (
                <g key={n}>
                  <circle cx={x} cy={y} r={NODE_R}
                          fill={isEndpoint ? '#f2a93b' : '#e65b9c'}
                          stroke="#0b1220" strokeWidth="2" />
                  <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#14100a">{n}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
