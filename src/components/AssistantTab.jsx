import { useMemo, useState } from 'react';
import { buildSimulationHash, diagnoseSimulation, simulationFromText } from '../lib/smartAssistant';

const EXAMPLES = [
  'm=2 c=0.8 k=5 olan sistemi kritik sönümlü yap ve nedenini açıkla',
  'RLC devresi L=2 R=0.5 C=0.25 q0=1 i0=0 oluştur',
  'Bu matris neden terslenemiyor? A = [[1,2],[2,4]]',
  '15 harmonikli kare dalga oluştur ve Gibbs olayını anlat',
];

function localReply(input) {
  const result = simulationFromText(input);
  if (result.error) return { text: result.error, action: null, local: true };
  const diagnostics = diagnoseSimulation(result);
  const extra = diagnostics.map((d) => `${d.title}: ${d.detail}`).join(' ');
  return { text: `${result.explanation} ${extra}`.trim(), action: { module: result.module, params: result.params, hash: buildSimulationHash(result), reason: result.explanation }, local: true };
}

export default function AssistantTab() {
  const [input, setInput] = useState(EXAMPLES[0]);
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Merhaba. Ben SimuMath Copilot. Bir sistemi doğal dille kurabilir, parametrelerini değiştirebilir veya matematiksel davranışını açıklayabilirim.' }]);
  const [action, setAction] = useState(null);
  const [status, setStatus] = useState('ready');
  const [engine, setEngine] = useState('auto');
  const diagnostics = useMemo(() => action ? diagnoseSimulation({ module: action.module, params: action.params }) : [], [action]);

  async function send(text = input) {
    const prompt = text.trim(); if (!prompt || status === 'thinking') return;
    const next = [...messages, { role: 'user', content: prompt }]; setMessages(next); setInput(''); setStatus('thinking'); setAction(null);
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: prompt, history: messages.slice(-8), currentState: action?.hash || window.location.hash }) });
      if (!response.ok) throw new Error('AI endpoint unavailable');
      const data = await response.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.text || 'Hazır.' }]); setAction(data.action || null); setEngine(data.provider || 'groq');
    } catch {
      const fallback = localReply(prompt);
      setMessages((m) => [...m, { role: 'assistant', content: `${fallback.text}\n\n[Offline/local yorumlayıcı kullanıldı.]` }]); setAction(fallback.action); setEngine('local');
    } finally { setStatus('ready'); }
  }

  const openAction = () => { if (action?.hash) window.location.hash = action.hash; };
  return <div className="copilot-shell"><section className="copilot-main"><header className="copilot-head"><div><span className="lab-kicker">2.2 · SimuMath Copilot</span><h2>AI Matematik & Simülasyon Asistanı</h2><p>Doğal dilde konuş; Copilot uygun laboratuvarı ve parametreleri hazırlasın.</p></div><span className={`engine-badge ${engine}`}>{engine === 'groq' ? 'Groq · GPT-OSS' : engine === 'local' ? 'Local fallback' : 'Auto'}</span></header><div className="chat-log">{messages.map((message, i) => <article key={i} className={`chat-message ${message.role}`}><span>{message.role === 'assistant' ? 'COPILOT' : 'SEN'}</span><p>{message.content}</p></article>)}{status === 'thinking' && <article className="chat-message assistant"><span>COPILOT</span><p>Düşünüyor ve uygun SimuMath araçlarını değerlendiriyor…</p></article>}</div><div className="copilot-compose"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Örn: Bu osilatörü kritik sönümlü yap ve grafiği aç…"/><button className="btn btn-primary" disabled={status === 'thinking'} onClick={() => send()}>Gönder</button></div><div className="copilot-examples">{EXAMPLES.map((x) => <button key={x} onClick={() => { setInput(x); send(x); }}>{x}</button>)}</div></section><aside className="copilot-side"><div className="viz-panel"><div className="viz-title">Copilot Eylemi</div>{action ? <><div className="assistant-model"><span className="route-chip">#{action.module}</span><h2>{action.reason || 'Simülasyon hazır'}</h2></div><div className="assistant-param-grid">{Object.entries(action.params || {}).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}</div><code className="assistant-route">{action.hash}</code><button className="btn btn-primary" onClick={openAction}>Simülasyonu Aç →</button></> : <p className="assistant-disclaimer">Copilot bir simülasyon oluşturduğunda veya değiştirdiğinde eylem burada görünür.</p>}</div><div className="viz-panel compact"><div className="viz-title">Yerel Güvenlik Kontrolleri</div><div className="diagnostic-list">{diagnostics.length ? diagnostics.map((item, i) => <article key={i} className={`diagnostic ${item.level}`}><strong>{item.title}</strong><p>{item.detail}</p></article>) : <p className="assistant-disclaimer">Henüz kontrol edilecek bir eylem yok.</p>}</div></div></aside></div>;
}
