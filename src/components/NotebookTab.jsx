import { useEffect, useMemo, useState } from 'react';
import { downloadText, printReport } from '../lib/download';

const STORAGE_KEY = 'simumath:notebook:v1';
const seed = [
  { id: 'intro', type: 'markdown', title: 'Amaç', content: '# Çalışma Kağıdı\nBu deneyde kullandığın modeli, varsayımları ve gözlemlerini burada açıkla.' },
  { id: 'formula', type: 'formula', title: 'Formül / Denklem', content: "y'' + 0.5y' + 2y = 0" },
  { id: 'result', type: 'markdown', title: 'Sonuç ve Yorum', content: '## Sonuç\nGrafikten ve sayısal sonuçlardan çıkardığın sonucu yaz.' },
];

function makeCell(type = 'markdown') { return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, title: type === 'formula' ? 'Formül' : 'Not', content: '' }; }
function inline(text) { return text.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>'); }
function renderMarkdown(text) { return text.split('\n').map((line) => { if (line.startsWith('### ')) return `<h3>${inline(line.slice(4))}</h3>`; if (line.startsWith('## ')) return `<h2>${inline(line.slice(3))}</h2>`; if (line.startsWith('# ')) return `<h1>${inline(line.slice(2))}</h1>`; if (line.startsWith('- ')) return `<li>${inline(line.slice(2))}</li>`; if (!line.trim()) return '<br />'; return `<p>${inline(line)}</p>`; }).join(''); }
function asMarkdown(cells) { return cells.map((cell) => cell.type === 'formula' ? `## ${cell.title}\n\n$$\n${cell.content}\n$$` : `## ${cell.title}\n\n${cell.content}`).join('\n\n---\n\n'); }

export default function NotebookTab() {
  const [title, setTitle] = useState('SimuMath İnteraktif Çalışma Kağıdı');
  const [cells, setCells] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return saved?.cells?.length ? saved.cells : seed; } catch { return seed; } });
  const [savedAt, setSavedAt] = useState('');
  useEffect(() => { const timer = setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, cells })); setSavedAt(new Date().toLocaleTimeString()); }, 350); return () => clearTimeout(timer); }, [title, cells]);
  const markdown = useMemo(() => `# ${title}\n\n${asMarkdown(cells)}\n\n---\nSimuMath çalışma kağıdı · ${window.location.href}`, [title, cells]);
  const update = (id, patch) => setCells((items) => items.map((cell) => cell.id === id ? { ...cell, ...patch } : cell));
  const remove = (id) => setCells((items) => items.filter((cell) => cell.id !== id));
  const move = (index, delta) => setCells((items) => { const next = [...items]; const target = index + delta; if (target < 0 || target >= next.length) return items; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const report = { title, summary: 'SimuMath Notebook Mode ile hazırlanmış interaktif çalışma raporu.', parameters: { hücreSayısı: cells.length, markdownHücresi: cells.filter((c) => c.type === 'markdown').length, formülHücresi: cells.filter((c) => c.type === 'formula').length }, results: { kayıt: savedAt || 'otomatik kayıt bekleniyor' }, notes: ['Not defteri tarayıcıda otomatik kaydedilir.', 'Markdown ve formül hücreleri tek bir çalışma raporunda birleştirilir.'] };
  return <div className="notebook-shell"><section className="notebook-toolbar"><div><span className="lab-kicker">1.4 · Interactive Notebook</span><input className="notebook-title" value={title} onChange={(e) => setTitle(e.target.value)} /><p>Markdown açıklamalarını ve matematiksel formülleri Jupyter benzeri hücreler halinde düzenle. Otomatik kayıt: {savedAt || 'hazırlanıyor…'}</p></div><div className="btn-row" style={{ flexWrap: 'wrap' }}><button className="btn btn-primary" onClick={() => setCells((x) => [...x, makeCell('markdown')])}>+ Markdown</button><button className="btn btn-secondary" onClick={() => setCells((x) => [...x, makeCell('formula')])}>+ Formül</button><button className="btn btn-secondary" onClick={() => downloadText('simumath-notebook.md', markdown, 'text/markdown;charset=utf-8')}>Markdown Export</button><button className="btn btn-secondary" onClick={() => printReport(report)}>PDF</button></div></section><div className="notebook-grid">{cells.map((cell, index) => <article className="notebook-cell" key={cell.id}><header><span>{cell.type === 'formula' ? 'ƒ(x)' : 'MD'} · Hücre {index + 1}</span><div className="btn-row"><button className="cell-action" onClick={() => move(index, -1)} disabled={index === 0}>↑</button><button className="cell-action" onClick={() => move(index, 1)} disabled={index === cells.length - 1}>↓</button><button className="cell-action danger" onClick={() => remove(cell.id)}>×</button></div></header><input className="cell-title" value={cell.title} onChange={(e) => update(cell.id, { title: e.target.value })} /><div className="cell-split"><textarea value={cell.content} onChange={(e) => update(cell.id, { content: e.target.value })} placeholder={cell.type === 'formula' ? 'Örn: x(t) = A cos(ωt + φ)' : 'Markdown notunu yaz…'} /><div className={`cell-preview ${cell.type}`} dangerouslySetInnerHTML={{ __html: cell.type === 'formula' ? `<div class="formula-display">${cell.content || 'Formül önizlemesi'}</div>` : renderMarkdown(cell.content) }} /></div></article>)}</div></div>;
}
