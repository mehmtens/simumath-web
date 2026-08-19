import { useMemo, useState } from 'react';
import { buildSimulationHash, diagnoseSimulation, simulationFromText } from '../lib/smartAssistant';

const EXAMPLES = [
  'm=2 c=0.8 k=5 y0=3 harmonik osilatör',
  'RLC devresi L=2 R=0.5 C=0.25 q0=1 i0=0',
  'matris 2 1 1 3 vektör 1 2',
  '15 harmonikli kare dalga',
  "y' = sin(t) - 0.3*y, y0=2 t=25",
];

export default function AssistantTab() {
  const [input, setInput] = useState(EXAMPLES[0]);
  const [result, setResult] = useState(() => simulationFromText(EXAMPLES[0]));
  const diagnostics = useMemo(() => diagnoseSimulation(result), [result]);
  const analyze = () => setResult(simulationFromText(input));
  const open = () => { if (!result?.error) window.location.hash = buildSimulationHash(result); };
  return <div className="assistant-layout"><section className="control-panel"><span className="lab-kicker">2.2 · Akıllı Simülasyon</span><h2>Metinden Simülasyon Oluştur</h2><p className="description">İstediğin sistemi günlük dille veya denklem biçiminde yaz. Bu ilk sürüm tamamen tarayıcı içinde çalışır; harici AI servisi veya internet gerektirmez.</p><div className="field"><label><span>İstek</span></label><textarea className="assistant-input" value={input} onChange={(e) => setInput(e.target.value)} /></div><div className="btn-row"><button className="btn btn-primary" onClick={analyze}>Yorumla</button><button className="btn btn-secondary" disabled={!!result?.error} onClick={open}>Simülasyonu Aç →</button></div><div className="preset-gallery">{EXAMPLES.map((example) => <button key={example} className="preset-card" onClick={() => { setInput(example); setResult(simulationFromText(example)); }}><strong>Örnek</strong><span>{example}</span></button>)}</div></section><section className="assistant-results"><div className="viz-panel"><div className="viz-title">Yorumlanan Model</div>{result?.error ? <div className="result-banner assistant-error">{result.error}</div> : <><div className="assistant-model"><span className="route-chip">#{result.module}</span><h2>{result.label}</h2><p>{result.explanation}</p></div><div className="assistant-param-grid">{Object.entries(result.params).map(([key,value]) => <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}</div><code className="assistant-route">{buildSimulationHash(result)}</code></>}</div><div className="viz-panel"><div className="viz-title">Matematiksel Hata Analizi</div><div className="diagnostic-list">{diagnostics.map((item, i) => <article key={`${item.title}-${i}`} className={`diagnostic ${item.level}`}><strong>{item.title}</strong><p>{item.detail}</p></article>)}</div><p className="assistant-disclaimer">Bu kontroller deterministik ön analizdir; matematiksel ispat veya genel amaçlı yapay zekâ değerlendirmesi değildir.</p></div></section></div>;
}
