import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import './App.css';

const ODETab = lazy(() => import('./components/ODETab'));
const LinAlgTab = lazy(() => import('./components/LinAlgTab'));
const FourierTab = lazy(() => import('./components/FourierTab'));
const NetworkTab = lazy(() => import('./components/NetworkTab'));
const DFATab = lazy(() => import('./components/DFATab'));
const NotebookTab = lazy(() => import('./components/NotebookTab'));

const CHANNELS = [
  { key: 'ode', code: 'ODE', label: 'Diferansiyel Denklemler', description: 'Dinamik sistemleri RK4 ile simüle et.', Component: ODETab },
  { key: 'matrix', code: 'MTX', label: 'Lineer Cebir & Özvektörler', description: 'Matris davranışını ve özvektörleri görselleştir.', Component: LinAlgTab },
  { key: 'fourier', code: 'SER', label: 'Fourier Serileri', description: 'Harmoniklerle sinyal sentezini keşfet.', Component: FourierTab },
  { key: 'network', code: 'NET', label: 'Ağ Yönlendirme (Dijkstra)', description: 'En kısa yolu grafik üzerinde adım adım incele.', Component: NetworkTab },
  { key: 'dfa', code: 'DFA', label: 'Sonlu Otomata', description: 'DFA/NFA kurallarını çalıştır ve durum geçişlerini izle.', Component: DFATab },
  { key: 'notebook', code: 'NBK', label: 'Çalışma Kağıdı', description: 'Markdown ve formül hücreleriyle interaktif laboratuvar raporu hazırla.', Component: NotebookTab },
];
const LEGACY_KEYS = { linalg: 'matrix' };
function getChannelFromHash() { const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]; const key = LEGACY_KEYS[raw] || raw; return CHANNELS.some((channel) => channel.key === key) ? key : 'ode'; }
function App() {
  const [active, setActive] = useState(getChannelFromHash); const [copied, setCopied] = useState(false); const current = useMemo(() => CHANNELS.find((channel) => channel.key === active) || CHANNELS[0], [active]); const ActiveComponent = current.Component;
  useEffect(() => { const onHashChange = () => setActive(getChannelFromHash()); window.addEventListener('hashchange', onHashChange); if (!window.location.hash) window.history.replaceState(null, '', '#ode'); return () => window.removeEventListener('hashchange', onHashChange); }, []);
  const openChannel = (key) => { window.location.hash = key; setActive(key); };
  const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } };
  return <div className="app-shell"><header className="app-header"><div><span className="eyebrow">SimuMath Pro — Interactive Lab</span><h1>Denklemden diyagrama, tek laboratuvarda.</h1><p className="slogan">Sayısal yöntemleri, algoritmaları ve matematiksel sistemleri canlı olarak deneyimle.</p></div><button className="btn btn-secondary share-btn" onClick={copyLink} type="button">{copied ? 'Bağlantı kopyalandı' : 'Bu laboratuvarı paylaş'}</button></header><section className="lab-status" aria-label="Aktif laboratuvar"><div><span className="lab-kicker">Aktif modül · {current.code}</span><strong>{current.label}</strong><p>{current.description}</p></div><span className="route-chip">#{current.key}</span></section><nav className="channel-selector" aria-label="SimuMath laboratuvarları">{CHANNELS.map((channel) => <button key={channel.key} className={`channel-btn ${active === channel.key ? 'active' : ''}`} onClick={() => openChannel(channel.key)} aria-current={active === channel.key ? 'page' : undefined}><span className="led"/><span className="code">{channel.code}</span><span className="label">{channel.label}</span></button>)}</nav><main><Suspense fallback={<div className="module-loading">Laboratuvar yükleniyor…</div>}><ActiveComponent/></Suspense></main><footer className="footer-note">SimuMath Pro Web · React tabanlı interaktif mühendislik matematiği laboratuvarı.</footer></div>;
}
export default App;
