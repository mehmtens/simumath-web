import { useEffect, useMemo, useState } from 'react';
import { analyzeMatrix, formatEigenLabel, eigenvectorLineEndpoints, gaussJordan2x2 } from '../lib/linalg';
import { paramNumber, readHashState, updateHashState } from '../lib/urlState';

const VIEW_SIZE = 360;

function NumberField({ label, value, onChange }) {
  return <div className="field"><label><span>{label}</span></label><input type="number" step="0.1" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} /></div>;
}
function toScreen(x, y, limit) { const scale = (VIEW_SIZE / 2 - 20) / limit; return [VIEW_SIZE / 2 + x * scale, VIEW_SIZE / 2 - y * scale]; }
function fmt(n) { return Number.isFinite(n) ? n.toFixed(3).replace(/\.000$/, '') : '—'; }
function fmtRow(row) { return row.map((v) => fmt(v)).join('   '); }

export default function LinAlgTab() {
  const initial = useMemo(() => readHashState().params, []);
  const [m11, setM11] = useState(() => paramNumber(initial, 'a', 2));
  const [m12, setM12] = useState(() => paramNumber(initial, 'b', 1));
  const [m21, setM21] = useState(() => paramNumber(initial, 'c', 1));
  const [m22, setM22] = useState(() => paramNumber(initial, 'd', 2));
  const [vx, setVx] = useState(() => paramNumber(initial, 'vx', 1));
  const [vy, setVy] = useState(() => paramNumber(initial, 'vy', 0));
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => { updateHashState('matrix', { a: m11, b: m12, c: m21, d: m22, vx, vy }); }, [m11, m12, m21, m22, vx, vy]);

  const result = useMemo(() => analyzeMatrix(m11, m12, m21, m22, vx, vy), [m11, m12, m21, m22, vx, vy]);
  const gauss = useMemo(() => gaussJordan2x2(m11, m12, m21, m22), [m11, m12, m21, m22]);
  useEffect(() => setStepIndex(0), [m11, m12, m21, m22]);

  const { v, vTransformed, eigenInfos, axisLimit, determinant, trace, invertible, inverse, frobeniusNorm } = result;
  const currentStep = gauss.steps[Math.min(stepIndex, gauss.steps.length - 1)];
  const [originX, originY] = toScreen(0, 0, axisLimit);
  const [vX, vY] = toScreen(v[0], v[1], axisLimit);
  const [tX, tY] = toScreen(vTransformed[0], vTransformed[1], axisLimit);

  const presets = { identity: [1, 0, 0, 1], rotation: [0, -1, 1, 0], shear: [1, 1, 0, 1], stretch: [2, 0, 0, 0.5] };
  const applyPreset = (key) => { const [a, b, c, d] = presets[key]; setM11(a); setM12(b); setM21(c); setM22(d); };
  const exportMarkdown = () => {
    const md = `# SimuMath Matrix Report\n\nA = [[${m11}, ${m12}], [${m21}, ${m22}]]\n\nv = [${vx}, ${vy}]\n\n- det(A): ${determinant}\n- tr(A): ${trace}\n- Frobenius norm: ${frobeniusNorm}\n- Invertible: ${invertible ? 'yes' : 'no'}\n- A·v: [${vTransformed.join(', ')}]\n`;
    const blob = new Blob([md], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'simumath-matrix-report.md'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>Matrix Lab</h2>
        <p className="description">Dönüşüm, özdeğerler, ters matris ve Gauss‑Jordan adımlarını aynı laboratuvarda incele.</p>
        <div className="btn-row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => applyPreset('identity')}>Birim</button><button className="btn btn-secondary" onClick={() => applyPreset('rotation')}>90° Dönüş</button><button className="btn btn-secondary" onClick={() => applyPreset('shear')}>Shear</button><button className="btn btn-secondary" onClick={() => applyPreset('stretch')}>Stretch</button>
        </div>
        <div className="matrix-grid"><span className="bracket">A = [</span><input type="number" step="0.1" value={m11} onChange={(e) => setM11(parseFloat(e.target.value) || 0)} /><input type="number" step="0.1" value={m12} onChange={(e) => setM12(parseFloat(e.target.value) || 0)} /><span /><span /><input type="number" step="0.1" value={m21} onChange={(e) => setM21(parseFloat(e.target.value) || 0)} /><input type="number" step="0.1" value={m22} onChange={(e) => setM22(parseFloat(e.target.value) || 0)} /><span className="bracket">]</span></div>
        <NumberField label="Vektör vx" value={vx} onChange={setVx} /><NumberField label="Vektör vy" value={vy} onChange={setVy} />
        <div className="result-banner">det(A) = <strong>{fmt(determinant)}</strong> · tr(A) = <strong>{fmt(trace)}</strong><br />‖A‖F = <strong>{fmt(frobeniusNorm)}</strong> · {invertible ? 'terslenebilir' : 'tekil / terslenemez'}</div>
        <div className="result-banner" style={{ whiteSpace: 'pre-line' }}>{eigenInfos.map((info, i) => formatEigenLabel(info, i + 1)).join('\n')}</div>
        <button className="btn btn-secondary" onClick={exportMarkdown}>Markdown Raporu</button>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <div className="viz-panel">
          <div className="viz-title">Gauss‑Jordan · Adım {stepIndex + 1}/{gauss.steps.length}</div>
          <div className="result-banner">{currentStep.label}</div>
          <div className="progress-mono" style={{ whiteSpace: 'pre' }}>{fmtRow(currentStep.matrix[0])}{'\n'}{fmtRow(currentStep.matrix[1])}</div>
          <div className="btn-row" style={{ marginTop: 12 }}><button className="btn btn-secondary" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>← Geri</button><button className="btn btn-primary" disabled={stepIndex >= gauss.steps.length - 1} onClick={() => setStepIndex((i) => i + 1)}>İleri →</button></div>
        </div>
        <div className="viz-panel">
          <div className="viz-title">Vektör Dönüşümü ve Özvektörler</div>
          <div className="viz-body"><svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} width="100%" style={{ maxWidth: 420 }}><line x1={0} y1={VIEW_SIZE / 2} x2={VIEW_SIZE} y2={VIEW_SIZE / 2} stroke="#263758" strokeWidth="1" /><line x1={VIEW_SIZE / 2} y1={0} x2={VIEW_SIZE / 2} y2={VIEW_SIZE} stroke="#263758" strokeWidth="1" />{eigenInfos.map((info, i) => { if (!info.isReal || !info.vector) return null; const [p1, p2] = eigenvectorLineEndpoints(info.vector, axisLimit); const [x1, y1] = toScreen(p1[0], p1[1], axisLimit); const [x2, y2] = toScreen(p2[0], p2[1], axisLimit); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e65b5b" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.55" />; })}<defs><marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#4d8cf2" /></marker><marker id="arrow-teal" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3ecf8e" /></marker></defs><line x1={originX} y1={originY} x2={vX} y2={vY} stroke="#4d8cf2" strokeWidth="2.5" markerEnd="url(#arrow-blue)" /><line x1={originX} y1={originY} x2={tX} y2={tY} stroke="#3ecf8e" strokeWidth="2.5" markerEnd="url(#arrow-teal)" /></svg></div>
          {inverse && <div className="progress-mono">A⁻¹ = [[{fmt(inverse[0][0])}, {fmt(inverse[0][1])}], [{fmt(inverse[1][0])}, {fmt(inverse[1][1])}]]</div>}
        </div>
      </div>
    </div>
  );
}
