// Rastgele ağırlıklı graf üretimi, dairesel yerleşim ve Dijkstra en kısa yol.

const MIN_EDGES = 6;
const WEIGHT_RANGE = [1, 10];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** n düğümlü tam bağlı bir graf üretir (yedek/fallback durumu için). */
function completeGraphEdges(n) {
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) edges.push([i, j]);
  }
  return edges;
}

/**
 * Erdos-Renyi tarzı rastgele ağırlıklı graf üretir. Yeterli kenar oluşmazsa
 * tam bağlı bir yedek grafa düşer (Python sürümüyle aynı davranış).
 */
export function generateWeightedGraph(nNodes, edgeProbability) {
  let edgeList = [];
  for (let i = 0; i < nNodes; i++) {
    for (let j = i + 1; j < nNodes; j++) {
      if (Math.random() < edgeProbability) edgeList.push([i, j]);
    }
  }
  let n = nNodes;
  if (edgeList.length < MIN_EDGES) {
    n = 6;
    edgeList = completeGraphEdges(n);
  }

  const edges = edgeList.map(([u, v]) => ({ u, v, weight: randInt(...WEIGHT_RANGE) }));
  const nodes = Array.from({ length: n }, (_, i) => i);

  const adjacency = new Map(nodes.map((node) => [node, []]));
  for (const e of edges) {
    adjacency.get(e.u).push({ to: e.v, weight: e.weight });
    adjacency.get(e.v).push({ to: e.u, weight: e.weight });
  }

  return { nodes, edges, adjacency };
}

/** Düğümleri bir çember üzerine yerleştirir (basit, öngörülebilir bir görsel düzen). */
export function computeCircularLayout(nodes, radius = 4) {
  const positions = {};
  const n = nodes.length;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[node] = [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
  return positions;
}

/**
 * Dijkstra ile iki düğüm arasındaki en kısa yolu bulur. Bağlantısızsa found=false döner.
 */
export function shortestPath(graph, start, end) {
  if (start === end) {
    return { found: true, sameNode: true, pathNodes: [start], pathEdges: [] };
  }

  const dist = new Map(graph.nodes.map((n) => [n, Infinity]));
  const prev = new Map();
  dist.set(start, 0);
  const visited = new Set();

  while (visited.size < graph.nodes.length) {
    let u = null;
    let best = Infinity;
    for (const node of graph.nodes) {
      if (!visited.has(node) && dist.get(node) < best) {
        best = dist.get(node);
        u = node;
      }
    }
    if (u === null) break;
    visited.add(u);
    if (u === end) break;

    for (const { to, weight } of graph.adjacency.get(u)) {
      const alt = dist.get(u) + weight;
      if (alt < dist.get(to)) {
        dist.set(to, alt);
        prev.set(to, u);
      }
    }
  }

  if (dist.get(end) === Infinity) {
    return { found: false, sameNode: false, pathNodes: [], pathEdges: [] };
  }

  const pathNodes = [end];
  let cur = end;
  while (cur !== start) {
    cur = prev.get(cur);
    pathNodes.unshift(cur);
  }
  const pathEdges = [];
  for (let i = 0; i < pathNodes.length - 1; i++) pathEdges.push([pathNodes[i], pathNodes[i + 1]]);

  return { found: true, sameNode: false, pathNodes, pathEdges };
}
