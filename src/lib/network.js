// Rastgele ağırlıklı graf üretimi, dairesel yerleşim ve Dijkstra en kısa yol.

const MIN_EDGES = 6;
const WEIGHT_RANGE = [1, 10];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function completeGraphEdges(n) {
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) edges.push([i, j]);
  }
  return edges;
}

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

export function computeCircularLayout(nodes, radius = 4) {
  const positions = {};
  const n = nodes.length;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[node] = [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
  return positions;
}

export function buildWeightedGraph(nodeNames, edgeRows) {
  const nodes = [...new Set(nodeNames.map((node) => String(node).trim()).filter(Boolean))];
  if (nodes.length < 2) throw new Error('En az iki düğüm gerekli.');
  const nodeSet = new Set(nodes);
  const seen = new Set();
  const edges = edgeRows.map((row) => {
    const u = String(row.u).trim();
    const v = String(row.v).trim();
    const weight = Number(row.weight);
    if (!nodeSet.has(u) || !nodeSet.has(v)) throw new Error(`Bilinmeyen düğüm: ${u} veya ${v}.`);
    if (u === v) throw new Error('Bir kenar aynı düğüme bağlanamaz.');
    if (!Number.isFinite(weight) || weight <= 0) throw new Error('Dijkstra için ağırlıklar pozitif olmalı.');
    const key = [u, v].sort().join('\0');
    if (seen.has(key)) throw new Error(`Tekrarlanan kenar: ${u}-${v}.`);
    seen.add(key);
    return { u, v, weight };
  });
  if (!edges.length) throw new Error('En az bir kenar gerekli.');
  const adjacency = new Map(nodes.map((node) => [node, []]));
  for (const edge of edges) {
    adjacency.get(edge.u).push({ to: edge.v, weight: edge.weight });
    adjacency.get(edge.v).push({ to: edge.u, weight: edge.weight });
  }
  return { nodes, edges, adjacency };
}

export function parseWeightedGraph(nodesText, edgesText) {
  const nodes = nodesText.split(/[\s,]+/).filter(Boolean);
  const rows = edgesText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/[\s,;]+/);
    if (parts.length !== 3) throw new Error(`Geçersiz kenar: ${line}. A B 4 biçimini kullan.`);
    return { u: parts[0], v: parts[1], weight: parts[2] };
  });
  return buildWeightedGraph(nodes, rows);
}

function serializeDistances(nodes, dist) {
  return Object.fromEntries(nodes.map((node) => [node, dist.get(node)]));
}

/** Dijkstra çalıştırır; final sonucu ve öğretici adım izini birlikte döndürür. */
export function shortestPath(graph, start, end) {
  if (start === end) {
    return {
      found: true,
      sameNode: true,
      distance: 0,
      pathNodes: [start],
      pathEdges: [],
      steps: [{ current: start, visited: [start], distances: { [start]: 0 }, updates: [], note: 'Başlangıç ve hedef aynı.' }],
    };
  }

  const dist = new Map(graph.nodes.map((n) => [n, Infinity]));
  const prev = new Map();
  dist.set(start, 0);
  const visited = new Set();
  const steps = [];

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
    const updates = [];
    for (const { to, weight } of graph.adjacency.get(u)) {
      if (visited.has(to)) continue;
      const oldDistance = dist.get(to);
      const candidate = dist.get(u) + weight;
      if (candidate < oldDistance) {
        dist.set(to, candidate);
        prev.set(to, u);
        updates.push({ node: to, from: u, oldDistance, newDistance: candidate, weight });
      }
    }

    steps.push({
      current: u,
      visited: [...visited],
      distances: serializeDistances(graph.nodes, dist),
      updates,
      note: u === end ? 'Hedef düğüm kesinleşti.' : `${u} düğümünün komşuları gevşetildi.`,
    });
    if (u === end) break;
  }

  if (dist.get(end) === Infinity) {
    return { found: false, sameNode: false, distance: Infinity, pathNodes: [], pathEdges: [], steps };
  }

  const pathNodes = [end];
  let cur = end;
  while (cur !== start) {
    cur = prev.get(cur);
    pathNodes.unshift(cur);
  }
  const pathEdges = [];
  for (let i = 0; i < pathNodes.length - 1; i++) pathEdges.push([pathNodes[i], pathNodes[i + 1]]);

  return { found: true, sameNode: false, distance: dist.get(end), pathNodes, pathEdges, steps };
}
