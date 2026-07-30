import { useState } from 'react';
import './App.css';
import ODETab from './components/ODETab';
import LinAlgTab from './components/LinAlgTab';
import FourierTab from './components/FourierTab';
import NetworkTab from './components/NetworkTab';
import DFATab from './components/DFATab';

const CHANNELS = [
  { key: 'ode', code: 'ODE', label: 'Diferansiyel Denklemler', Component: ODETab },
  { key: 'linalg', code: 'MTX', label: 'Lineer Cebir & Özvektörler', Component: LinAlgTab },
  { key: 'fourier', code: 'SER', label: 'Fourier Serileri', Component: FourierTab },
  { key: 'network', code: 'NET', label: 'Ağ Yönlendirme (Dijkstra)', Component: NetworkTab },
  { key: 'dfa', code: 'DFA', label: 'Sonlu Otomata', Component: DFATab },
];

function App() {
  const [active, setActive] = useState('ode');
  const ActiveComponent = CHANNELS.find((c) => c.key === active).Component;

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="eyebrow">Simumath Pro — Web</span>
        <h1>Denklemden diyagrama, tek pencerede.</h1>
        <p className="slogan">Diferansiyel denklemden sonlu otomataya, tek panelde interaktif mühendislik matematiği.</p>
      </header>

      <nav className="channel-selector">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            className={`channel-btn ${active === c.key ? 'active' : ''}`}
            onClick={() => setActive(c.key)}
          >
            <span className="led" />
            <span className="code">{c.code}</span>
            <span className="label">{c.label}</span>
          </button>
        ))}
      </nav>

      <main>
        <ActiveComponent />
      </main>

      <footer className="footer-note">
        SimuMath Pro Web — masaüstü (PyQt5) sürümünün React portu.
      </footer>
    </div>
  );
}

export default App;
