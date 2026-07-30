import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fourierSquareWave, fourierSawtoothWave } from '../lib/fourier';

export default function FourierTab() {
  const [waveType, setWaveType] = useState('square');
  const [n, setN] = useState(5);

  const { data, title } = useMemo(() => {
    const { t, f } = waveType === 'square' ? fourierSquareWave(n) : fourierSawtoothWave(n);
    return {
      data: t.map((time, i) => ({ t: Number(time.toFixed(3)), f: f[i] })),
      title: waveType === 'square'
        ? `Kare Dalga Sentezi (N = ${n} Harmonik)`
        : `Üçgen Dalga Sentezi (N = ${n} Harmonik)`,
    };
  }, [waveType, n]);

  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>Fourier Sinyal Sentezi</h2>
        <div className="field">
          <label><span>Dalga Tipi</span></label>
          <select value={waveType} onChange={(e) => setWaveType(e.target.value)}>
            <option value="square">Kare Dalga (Square Wave)</option>
            <option value="sawtooth">Üçgen Dalga (Sawtooth Wave)</option>
          </select>
        </div>
        <div className="field">
          <label>
            <span>Harmonik Sayısı (N)</span>
            <span className="value">{n}</span>
          </label>
          <input type="range" min={1} max={100} value={n} onChange={(e) => setN(parseInt(e.target.value, 10))} />
        </div>
      </div>

      <div className="viz-panel">
        <div className="viz-title">{title}</div>
        <div className="viz-body" style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#263758" strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke="#7c8bab" tick={{ fontSize: 11 }}
                     label={{ value: 'Zaman (t)', position: 'insideBottom', offset: -5, fill: '#7c8bab', fontSize: 11 }} />
              <YAxis stroke="#7c8bab" tick={{ fontSize: 11 }}
                     label={{ value: 'Genlik', angle: -90, position: 'insideLeft', fill: '#7c8bab', fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#3a4a6b" />
              <Tooltip contentStyle={{ background: '#17233a', border: '1px solid #263758', fontSize: 12 }} />
              <Line type="monotone" dataKey="f" name={`Fourier Toplamı (N=${n})`} stroke="#a66bff" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
