import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { solveFirstOrder, solveSecondOrder } from '../lib/ode';

const COLOR_DECAY = '#e65b5b';
const COLOR_POSITION = '#3ecf8e';
const COLOR_VELOCITY = '#f2a93b';

function Field({ label, value, min, max, step, onChange }) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <span className="value">{Number(value).toFixed(2)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function ODETab() {
  const [type, setType] = useState('first');
  const [m, setM] = useState(1.0);
  const [c, setC] = useState(0.5);
  const [k, setK] = useState(2.0);
  const [y0, setY0] = useState(5.0);
  const [v0, setV0] = useState(0.0);
  const [tMax, setTMax] = useState(30.0);

  const result = useMemo(() => {
    if (type === 'first') {
      const r = solveFirstOrder(k, y0, tMax);
      return {
        stable: r.isStable,
        data: r.t.map((t, i) => ({ t, y: r.y[i] })),
        lines: [{ key: 'y', name: `y' = -${k}y`, color: COLOR_DECAY }],
      };
    }
    const r = solveSecondOrder(m, c, k, y0, v0, tMax);
    return {
      stable: r.isStable,
      data: r.t.map((t, i) => ({ t, position: r.position[i], velocity: r.velocity[i] })),
      lines: [
        { key: 'position', name: 'Konum (y)', color: COLOR_POSITION },
        { key: 'velocity', name: 'Hız (v)', color: COLOR_VELOCITY },
      ],
    };
  }, [type, m, c, k, y0, v0, tMax]);

  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>Dinamik Sistem Parametreleri</h2>
        <div className="field">
          <label><span>Sistem Tipi</span></label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="first">1. Mertebe: y' = -ky</option>
            <option value="second">2. Mertebe: my'' + cy' + ky = 0</option>
          </select>
        </div>

        {type === 'second' && <Field label="Kütle (m)" value={m} min={0.1} max={20} step={0.1} onChange={setM} />}
        {type === 'second' && <Field label="Sönümleme (c)" value={c} min={0} max={20} step={0.1} onChange={setC} />}
        <Field label="Yay/Katsayı (k)" value={k} min={-10} max={20} step={0.1} onChange={setK} />
        <Field label="Başlangıç Konumu (y₀)" value={y0} min={-20} max={20} step={0.5} onChange={setY0} />
        {type === 'second' && <Field label="Başlangıç Hızı (v₀)" value={v0} min={-20} max={20} step={0.5} onChange={setV0} />}
        <Field label="Süre (t)" value={tMax} min={1} max={100} step={1} onChange={setTMax} />
      </div>

      <div className="viz-panel">
        <div className="viz-title">
          {type === 'first' ? 'Birinci Mertebe Bozunma' : 'Sönümlü Harmonik Osilatör'}
        </div>
        <div className="viz-body" style={{ width: '100%', height: 380 }}>
          {result.stable ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.data}>
                <CartesianGrid stroke="#263758" strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke="#7c8bab" tick={{ fontSize: 11 }} label={{ value: 'Zaman (t)', position: 'insideBottom', offset: -5, fill: '#7c8bab', fontSize: 11 }} />
                <YAxis stroke="#7c8bab" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#17233a', border: '1px solid #263758', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {result.lines.map((line) => (
                  <Line key={line.key} type="monotone" dataKey={line.key} name={line.name}
                        stroke={line.color} dot={false} strokeWidth={2.2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: COLOR_DECAY, fontWeight: 600, textAlign: 'center', padding: '0 20px' }}>
              Sistem kararsız: parametre kombinasyonu çözümü ıraksattı.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
