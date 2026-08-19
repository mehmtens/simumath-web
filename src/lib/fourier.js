// Fourier seri sentezi: kare dalga ve testere (sawtooth) dalga yaklaşımları.

function buildSpectrum(nHarmonics, type) {
  const spectrum = [];
  for (let k = 1; k <= nHarmonics; k++) {
    if (type === 'square') {
      const harmonic = 2 * k - 1;
      spectrum.push({ harmonic, amplitude: (4 / Math.PI) / harmonic });
    } else {
      spectrum.push({ harmonic: k, amplitude: Math.abs((2 / Math.PI) * (1 / k)) });
    }
  }
  return spectrum;
}

/** Kare dalganın Fourier yaklaşımı: (4/pi) * sum(sin((2k-1)t)/(2k-1)) */
export function fourierSquareWave(nHarmonics, nPoints = 1000) {
  const t = [];
  const f = [];
  for (let i = 0; i < nPoints; i++) {
    const time = -2 * Math.PI + (4 * Math.PI * i) / (nPoints - 1);
    let value = 0;
    for (let k = 1; k <= nHarmonics; k++) {
      const n = 2 * k - 1;
      value += (4 / Math.PI) * (Math.sin(n * time) / n);
    }
    t.push(time);
    f.push(value);
  }
  return { t, f, spectrum: buildSpectrum(nHarmonics, 'square') };
}

/** Testere dalgasının Fourier yaklaşımı. */
export function fourierSawtoothWave(nHarmonics, nPoints = 1000) {
  const t = [];
  const f = [];
  for (let i = 0; i < nPoints; i++) {
    const time = -2 * Math.PI + (4 * Math.PI * i) / (nPoints - 1);
    let value = 0;
    for (let k = 1; k <= nHarmonics; k++) {
      value += (2 / Math.PI) * (k % 2 === 0 ? -1 : 1) * (Math.sin(k * time) / k);
    }
    t.push(time);
    f.push(value);
  }
  return { t, f, spectrum: buildSpectrum(nHarmonics, 'sawtooth') };
}
