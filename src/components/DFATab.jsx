import { useEffect, useMemo, useRef, useState } from 'react';
import { DFA_REGISTRY, runDfa } from '../lib/dfa';

const VIEW_SIZE = 380;
const NODE_R = 34; // piksel (görsel)
const DATA_NODE_R = 0.55; // Python sürümüyle aynı veri-uzayı yarıçapı (yerleşim ölçeği için)
const STEP_MS = 700;

const COLOR_IDLE = '#f2a93b';
const COLOR_ACTIVE = '#e65b5b';
const COLOR_ACCEPT = '#3ecf8e';
const COLOR_REJECT = '#8a93a6';
const COLOR_EDGE = '#5b6b8c';
const COLOR_EDGE_ACTIVE = '#e65b5b';

function computeScreenMapper(positions) {
  const xs = Object.values(positions).map((p) => p[0]);
  const ys = Object.values(positions).map((p) => p[1]);
  const minX = Math.min(...xs) - 1.6, maxX = Math.max(...xs) + 1.6;
  const minY = Math.min(...ys) - 1.6, maxY = Math.max(...ys) + 1.6;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const span = Math.max(spanX, spanY);
  return (x, y) => [
    ((x - minX) / span) * VIEW_SIZE + (VIEW_SIZE - (spanX / span) * VIEW_SIZE) / 2,
    VIEW_SIZE - (((y - minY) / span) * VIEW_SIZE + (VIEW_SIZE - (spanY / span) * VIEW_SIZE) / 2),
  ];
}

function groupTransitions(definition) {
  const groups = new Map();
  for (const key of Object.keys(definition.transitions)) {
    const [src, symbol] = key.split(',');
    const dst = definition.transitions[key];
    const gKey = `${src}=>${dst}`;
    if (!groups.has(gKey)) groups.set(gKey, { src, dst, symbols: [] });
    groups.get(gKey).symbols.push(symbol);
  }
  for (const g of groups.values()) {
    g.symbols.sort((a, b) => definition.alphabet.indexOf(a) - definition.alphabet.indexOf(b));
  }
  return [...groups.values()];
}

export default function DFATab() {
  const [ruleKey, setRuleKey] = useState('ends_with_one');
  const [inputStr, setInputStr] = useState('1011');
  const [animIndex, setAnimIndex] = useState(null); // null = idle, aksi halde trace indeksi
  const [mode, setMode] = useState('idle'); // idle | running | accept | reject | error
  const [runResult, setRunResult] = useState(null);
  const [runInput, setRunInput] = useState('');
  const timerRef = useRef(null);

  const definition = DFA_REGISTRY[ruleKey];
  const toScreen = useMemo(() => computeScreenMapper(definition.positions), [definition]);
  const edgeGroups = useMemo(() => groupTransitions(definition), [definition]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function resetToIdle(nextDefinition) {
    clearInterval(timerRef.current);
    setMode('idle');
    setAnimIndex(null);
    setRunResult(null);
    setRunInput('');
  }

  function handleRuleChange(key) {
    setRuleKey(key);
    resetToIdle();
    const alphabet = DFA_REGISTRY[key].alphabet.join('');
    setInputStr((s) => [...s].filter((ch) => alphabet.includes(ch)).join(''));
  }

  function handleInputChange(value) {
    const alphabet = definition.alphabet.join('');
    const filtered = [...value].filter((ch) => alphabet.includes(ch)).join('');
    setInputStr(filtered);
  }

  function startRun() {
    const result = runDfa(definition, inputStr);
    clearInterval(timerRef.current);
    setRunResult(result);
    setRunInput(inputStr);
    setAnimIndex(0);
    setMode('running');

    timerRef.current = setInterval(() => {
      setAnimIndex((prev) => {
        const next = prev + 1;
        if (next >= result.trace.length) {
          clearInterval(timerRef.current);
          if (result.invalidChar !== null) setMode('error');
          else setMode(result.accepted ? 'accept' : 'reject');
          return prev;
        }
        return next;
      });
    }, STEP_MS);
  }

  function showInstant() {
    clearInterval(timerRef.current);
    const result = runDfa(definition, inputStr);
    setRunResult(result);
    setRunInput(inputStr);
    setAnimIndex(result.trace.length - 1);
    setMode(result.invalidChar !== null ? 'error' : (result.accepted ? 'accept' : 'reject'));
  }

  const running = mode === 'running';
  const activeState = runResult && animIndex !== null ? runResult.trace[animIndex] : null;
  const lastSymbol = running && animIndex > 0 ? runInput[animIndex - 1] : null;
  const lastSrc = running && animIndex > 0 ? runResult.trace[animIndex - 1] : null;

  let resultText = 'Sonuç: Bekliyor...';
  let resultColor = 'var(--text)';
  if (runResult) {
    if (runResult.invalidChar !== null && mode === 'error') {
      resultText = `GEÇERSİZ GİRDİ — '${runResult.invalidChar}' karakteri bu dilin alfabesinde yok.`;
      resultColor = 'var(--accent-red)';
    } else if (mode === 'accept' || mode === 'reject') {
      const verdict = runResult.accepted ? 'KABUL EDİLDİ' : 'REDDEDİLDİ';
      const emptyNote = runResult.isEmptyInput ? ' (boş string, başlangıç durumu değerlendirildi)' : '';
      resultText = `Sonuç: ${verdict}${emptyNote} — Durum: ${runResult.finalState}`;
      resultColor = runResult.accepted ? 'var(--accent-teal)' : 'var(--accent-red)';
    } else if (mode === 'running') {
      resultText = 'Çalışıyor...';
      resultColor = 'var(--text-muted)';
    }
  }

  const processedCount = mode === 'idle' ? 0 : (animIndex ?? 0);
  const doneChars = runInput.slice(0, processedCount);
  const restChars = runInput.slice(processedCount);

  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>DFA Simülatörü</h2>
        <div className="field">
          <label><span>Dil Kuralı</span></label>
          <select value={ruleKey} onChange={(e) => handleRuleChange(e.target.value)} disabled={running}>
            {Object.values(DFA_REGISTRY).map((d) => (
              <option key={d.key} value={d.key}>{d.name}</option>
            ))}
          </select>
        </div>
        <p className="description">{definition.description}</p>

        <div className="field">
          <label><span>Test Edilecek String</span></label>
          <input type="text" value={inputStr} disabled={running}
                 placeholder={`Sadece ${definition.alphabet.join('/')} girilebilir`}
                 onChange={(e) => handleInputChange(e.target.value)} />
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={startRun} disabled={running}>▶ Adım Adım</button>
          <button className="btn btn-secondary" onClick={showInstant} disabled={running}>⏭ Anında</button>
        </div>

        <div className="progress-mono">
          {runInput === '' && mode === 'idle' ? (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ) : runInput === '' ? (
            <span style={{ color: 'var(--text-muted)' }}>(boş string)</span>
          ) : (
            <>
              <span style={{ color: 'var(--accent-teal)' }}>{doneChars}</span>
              <span style={{ color: 'var(--text-muted)' }}>{restChars}</span>
            </>
          )}
        </div>

        <div className="result-banner" style={{ color: resultColor }}>{resultText}</div>
      </div>

      <div className="viz-panel">
        <div className="viz-title">{definition.name}</div>
        <div className="viz-body">
          <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} width="100%" style={{ maxWidth: 420 }}>
            <defs>
              <marker id="dfa-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 Z" fill={COLOR_EDGE} />
              </marker>
              <marker id="dfa-arrow-active" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 Z" fill={COLOR_EDGE_ACTIVE} />
              </marker>
            </defs>

            {/* kenarlar */}
            {edgeGroups.map((g, i) => {
              const label = g.symbols.join(',');
              const isActiveEdge = running && lastSrc === g.src && activeState === g.dst
                && lastSymbol !== null && g.symbols.includes(lastSymbol);
              const color = isActiveEdge ? COLOR_EDGE_ACTIVE : COLOR_EDGE;
              const width = isActiveEdge ? 3 : 1.6;
              const marker = isActiveEdge ? 'url(#dfa-arrow-active)' : 'url(#dfa-arrow)';

              if (g.src === g.dst) {
                const [x, y] = toScreen(...definition.positions[g.src]);
                const loopR = NODE_R * 0.9;
                const path = `M ${x - loopR * 0.6} ${y - NODE_R * 0.85} 
                              Q ${x} ${y - NODE_R * 2.6} ${x + loopR * 0.6} ${y - NODE_R * 0.85}`;
                return (
                  <g key={i}>
                    <path d={path} fill="none" stroke={color} strokeWidth={width} markerEnd={marker} />
                    <text x={x} y={y - NODE_R * 2.1} textAnchor="middle" fontSize="12" fontWeight="700"
                          fill={color} fontFamily="var(--font-display)">{label}</text>
                  </g>
                );
              }

              const [x1, y1] = toScreen(...definition.positions[g.src]);
              const [x2, y2] = toScreen(...definition.positions[g.dst]);
              const reverseExists = edgeGroups.some((o) => o.src === g.dst && o.dst === g.src);
              const sign = (!reverseExists || g.src < g.dst) ? 1 : -1;
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              const dx = x2 - x1, dy = y2 - y1;
              const len = Math.hypot(dx, dy) || 1;
              const perpX = (-dy / len) * sign;
              const perpY = (dx / len) * sign;
              const bulge = len * 0.18;
              const ctrlX = mx + perpX * bulge;
              const ctrlY = my + perpY * bulge;
              const labelX = mx + perpX * (bulge + 12);
              const labelY = my + perpY * (bulge + 12);

              return (
                <g key={i}>
                  <path d={`M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`}
                        fill="none" stroke={color} strokeWidth={width} markerEnd={marker} />
                  <rect x={labelX - 9} y={labelY - 9} width={18} height={18} rx={4} fill="#121b2e" opacity={0.9} />
                  <text x={labelX} y={labelY + 4} textAnchor="middle" fontSize="12" fontWeight="700"
                        fill={color} fontFamily="var(--font-display)">{label}</text>
                </g>
              );
            })}

            {/* başlangıç oku */}
            {(() => {
              const [sx, sy] = toScreen(...definition.positions[definition.start]);
              return (
                <line x1={sx - NODE_R - 34} y1={sy} x2={sx - NODE_R - 4} y2={sy}
                      stroke="#e8ecf3" strokeWidth="2.2" markerEnd="url(#dfa-arrow)" />
              );
            })()}

            {/* durumlar */}
            {definition.states.map((state) => {
              const [x, y] = toScreen(...definition.positions[state]);
              let fill = COLOR_IDLE;
              if (state === activeState) {
                if (mode === 'running') fill = COLOR_ACTIVE;
                else if (mode === 'accept') fill = COLOR_ACCEPT;
                else if (mode === 'reject') fill = COLOR_REJECT;
                else if (mode === 'error') fill = 'var(--accent-red)';
              }
              const isAccept = definition.accept.has(state);
              return (
                <g key={state}>
                  <circle cx={x} cy={y} r={NODE_R} fill={fill} stroke="#0b1220" strokeWidth="2" />
                  {isAccept && (
                    <circle cx={x} cy={y} r={NODE_R - 6} fill="none" stroke="#0b1220" strokeWidth="1.6" />
                  )}
                  <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#14100a">
                    {state}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
