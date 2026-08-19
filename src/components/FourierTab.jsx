import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fourierSquareWave, fourierSawtoothWave } from '../lib/fourier';
import { paramNumber, readHashState, updateHashState } from '../lib/urlState';

function initialState() {
  const { params } = readHashState();
  const wave = params.get('wave');
  return {
    waveType: wave === 'sawtooth' ? 'sawtooth' : 'square',
    n: Math.max(1, Math.min(100, Math.round(paramNumber(params, 'n', 5)))),
  };
}

export default function FourierTab() {
  const initial = useMemo(initialState, []);
  const [waveType, setWaveType] = useState(initial.waveType);
  const [n, setN] = useState(initial.n);

  useEffect(() => {
    updateHashState('fourier', { wave: waveType, n });
  }, [waveType, n]);

  const { data, spectrum, title } = useMemo(() => {
    const result = waveType === 'square' ? fourierSquareWave(n) : fourierSawtoothWave(n);
    return {
      data: result.t.map((time, i) => ({ t: Number(time.toFixed(3)), f: result.f[i] })),
      spectrum: result.spectrum,
      title: waveType === 'square'
        ? `Kare Dalga Sentezi (N = ${n} Harmonik)`
        : `Testere Dalga Sentezi (N = ${n} Harmonik)`,
    };
  }, [waveType, n]);

  const visibleSpectrum = spectrum.slice(0, Math.min(spectrum.length, 30));

  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>Fourier Sinyal Laboratuvarı</h2>
        <p className="description">
          Zaman ve frekans uzayını aynı anda izle. Ayarlar URL'ye yazıldığı için oluşturduğun sinyal doğrudan paylaşılabilir.
        </p>
        <div className="field">
          <label><span>Dalga Tipi</span></label>
          <select value={waveType} onChange={(e) => setWaveType(e.target.value)}>
            <option value="square">Kare Dalga (Square Wave)</option>
            <option value="sawtooth">Testere Dalga (Sawtooth Wave)</option>
          </select>
        </div>
        <div className="field">
          <label>
            <span>Harmonik Sayısı (N)</span>
            <span className="value">{n}</span>
          </label>
          <input type="range" min={1} max={100} value={n} onChange={(e) => setN(parseInt(e.target.value, 10))} />
        </div>
        <div className="result-banner">
          İlk {Math.min(n, 30)} harmonik frekans panelinde gösteriliyor. N arttıkça sentez ideal dalga şekline yaklaşır.
        </div>
      </div>

      <div className="viz-panel">
        <div className="viz-title">{title}</div>
        <div className="fourier-split">
          <section className="fourier-pane">
            <div className="viz-title">Time Domain · Zaman Uzayı</div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid stroke="#263758" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="#7c8bab" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#7c8bab" tick={{ fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#3a4a6b" />
                  <Tooltip contentStyle={{ background: '#17233a', border: '1px solid #263758', fontSize: 12 }} />
                  <Line type="monotone" dataKey="f" name="Fourier Toplamı" stroke="#a66bff" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="fourier-pane">
            <div className="viz-title">Frequency Domain · Frekans Uzayı</div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleSpectrum}>
                  <CartesianGrid stroke="#263758" strokeDasharray="3 3" />
                  <XAxis dataKey="harmonic" stroke="#7c8bab" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#7c8bab" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#17233a', border: '1px solid #263758', fontSize: 12 }} />
                  <Bar dataKey="amplitude" name="Genlik" fill="#3ecf8e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
