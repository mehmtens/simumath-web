const numberAfter = (text, names, fallback) => {
  for (const name of names) {
    const match = text.match(new RegExp(`${name}\\s*(?:=|:|olsun|degeri)?\\s*(-?\\d+(?:[.,]\\d+)?)`, 'i'));
    if (match) return Number(match[1].replace(',', '.'));
  }
  return fallback;
};

export function simulationFromText(input) {
  const raw = input.trim();
  const text = raw.toLocaleLowerCase('tr-TR');
  if (!raw) return { error: 'Önce oluşturmak istediğin sistemi yaz.' };

  if (/rlc|devre|direnç|indükt|kondans/.test(text)) {
    return { module: 'ode', label: 'RLC devresi', params: { type: 'rlc', m: numberAfter(text, ['l'], 1), c: numberAfter(text, ['r'], 1), k: 1 / Math.max(1e-6, numberAfter(text, ['c'], 1)), y0: numberAfter(text, ['q0', 'q'], 1), v0: numberAfter(text, ['i0', 'i'], 0), t: numberAfter(text, ['t', 'süre'], 20) }, explanation: 'Seri RLC modeli Lq″ + Rq′ + (1/C)q = 0 biçiminde kuruldu.' };
  }
  if (/sarkaç|pendulum/.test(text)) {
    return { module: 'ode', label: 'Doğrusal olmayan sarkaç', params: { type: 'pendulum', y0: numberAfter(text, ['theta', 'açı', 'aci'], 0.8), v0: numberAfter(text, ['omega', 'hız', 'hiz'], 0), t: numberAfter(text, ['t', 'süre'], 20) }, explanation: 'Sarkaç θ″ + (g/L)sin(θ)=0 modeliyle oluşturuldu.' };
  }
  if (/ısı|isi|heat|difüzyon|diffusion/.test(text)) {
    return { module: 'ode', label: '1B ısı yayılımı', params: { type: 'heat', t: numberAfter(text, ['t', 'süre'], 10) }, explanation: '1B ısı denklemi için sonlu fark simülasyonu seçildi.' };
  }
  if (/harmonik|osilat|yay|spring/.test(text)) {
    return { module: 'ode', label: 'Harmonik osilatör', params: { type: 'second', m: numberAfter(text, ['m', 'kütle', 'kutle'], 1), c: numberAfter(text, ['c', 'sönüm', 'sonum'], 0.5), k: numberAfter(text, ['k'], 2), y0: numberAfter(text, ['y0', 'konum'], 5), v0: numberAfter(text, ['v0', 'hız', 'hiz'], 0), t: numberAfter(text, ['t', 'süre'], 30) }, explanation: 'my″ + cy′ + ky = 0 modeli oluşturuldu.' };
  }
  if (/matris|matrix|dönüşüm|donusum/.test(text)) {
    const nums = [...raw.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));
    const [a=2,b=1,c=1,d=2,vx=1,vy=0] = nums;
    return { module: 'matrix', label: 'Matris dönüşümü', params: { a,b,c,d,vx,vy }, explanation: `A=[[${a},${b}],[${c},${d}]], v=[${vx},${vy}] olarak yorumlandı.` };
  }
  if (/fourier|kare dalga|testere|harmonik/.test(text)) {
    return { module: 'fourier', label: 'Fourier sentezi', params: { wave: /testere|saw/.test(text) ? 'sawtooth' : 'square', n: Math.round(numberAfter(text, ['n', 'harmonik'], 10)) }, explanation: 'Dalga tipi ve harmonik sayısı Fourier Lab için ayarlandı.' };
  }
  const ode = raw.match(/(?:y'|dy\/dt)\s*=\s*(.+)/i);
  if (ode) return { module: 'ode', label: 'Özel diferansiyel denklem', params: { type: 'custom', expr: ode[1].trim(), y0: numberAfter(text, ['y0'], 1), t: numberAfter(text, ['t', 'süre'], 20) }, explanation: `y′=${ode[1].trim()} özel ODE olarak algılandı.` };
  return { error: 'Sistemi kesin olarak eşleştiremedim. “m=1 c=0.5 k=2 harmonik osilatör”, “matris 2 1 1 2”, “15 harmonikli kare dalga” veya “y\' = sin(t)-0.3*y” gibi yazabilirsin.' };
}

export function buildSimulationHash(result) {
  const params = new URLSearchParams();
  Object.entries(result.params || {}).forEach(([key, value]) => { if (value !== undefined && value !== null) params.set(key, String(value)); });
  return `#${result.module}${params.size ? `?${params}` : ''}`;
}

export function diagnoseSimulation(result) {
  if (!result || result.error) return [];
  const p = result.params || {}; const items = [];
  if (result.module === 'ode') {
    if (p.type === 'second' && Number(p.m) <= 0) items.push({ level: 'error', title: 'Geçersiz kütle', detail: 'm > 0 olmalı; aksi halde ikinci mertebe model fiziksel/sayısal olarak tanımsızlaşır.' });
    if (p.type === 'second' && Number(p.c) < 0) items.push({ level: 'warning', title: 'Negatif sönüm', detail: 'c < 0 sisteme enerji ekler ve genliğin büyümesine yol açabilir.' });
    if (p.type === 'second' && Number(p.k) < 0) items.push({ level: 'warning', title: 'Negatif rijitlik', detail: 'k < 0 denge noktasını kararsız yapabilir.' });
    if (p.type === 'custom' && !/[yt]/i.test(p.expr || '')) items.push({ level: 'info', title: 'Sabit türev', detail: 'Denklem y veya t içermiyor; çözüm doğrusal davranabilir.' });
    if (Number(p.t) > 100) items.push({ level: 'warning', title: 'Uzun zaman aralığı', detail: 'Büyük t aralığı daha fazla hesaplama ve birikimli sayısal hata üretebilir.' });
  }
  if (result.module === 'matrix') {
    const det = Number(p.a)*Number(p.d)-Number(p.b)*Number(p.c);
    if (Math.abs(det) < 1e-10) items.push({ level: 'warning', title: 'Tekil matris', detail: 'det(A) ≈ 0; ters matris yoktur ve bazı çözüm adımları uygulanamaz.' });
    else items.push({ level: 'info', title: 'Terslenebilir matris', detail: `det(A) = ${det.toFixed(4)}; matris terslenebilir.` });
  }
  if (result.module === 'fourier' && Number(p.n) < 3) items.push({ level: 'info', title: 'Düşük harmonik sayısı', detail: 'Dalga biçimi kaba yaklaşacaktır; N arttıkça seri hedef sinyale yaklaşır.' });
  if (!items.length) items.push({ level: 'ok', title: 'Belirgin problem bulunmadı', detail: 'Parametrelerde temel fiziksel/sayısal kontrolleri tetikleyen bir durum yok.' });
  return items;
}
