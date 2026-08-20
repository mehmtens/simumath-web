# SimuMath Pro — Web

`simumath.py` (PyQt5 masaüstü uygulaması) için React/Vite ile yazılmış web portu.
Aynı 5 modül: Diferansiyel Denklemler, Lineer Cebir & Özvektörler, Fourier Serileri,
Ağ Yönlendirme (Dijkstra), Sonlu Otomata (DFA — 4 farklı kural + adım adım animasyon).

Tüm hesaplama mantığı `src/lib/` altında saf JavaScript fonksiyonları olarak
yazıldı (Python'daki `simumath_core.py`'nin JS portu), grafikler React
bileşenleri (`src/components/`) içinde SVG/Recharts ile çiziliyor.

## Yerelde çalıştırmak için

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır.

## Production build

```bash
npm run build
npm run preview   # build'i yerelde test etmek için
```

## Online özellikler

Supabase Community/Auth, özel Realtime işbirliği odaları ve LMS/otomatik notlandırma temellerinin kurulum ve güvenlik notları için [`docs/online-platform.md`](docs/online-platform.md) dosyasına bakın.

## Vercel'e deploy etmek

**Yöntem 1 — GitHub üzerinden (önerilen):**
1. Bu klasörü bir GitHub reposuna push et.
2. [vercel.com](https://vercel.com) → "Add New Project" → reponu seç.
3. Framework olarak Vite otomatik algılanır, hiçbir ayar değiştirmene gerek yok.
4. "Deploy" — birkaç dakika içinde canlı bir URL alırsın.

**Yöntem 2 — Vercel CLI ile (GitHub'sız, doğrudan bilgisayarından):**
```bash
npm install -g vercel
vercel login
vercel        # proje klasöründeyken; sorulara varsayılan cevaplarla geçebilirsin
vercel --prod # canlıya almak için
```

## Klasör yapısı

```
src/
  lib/            -> Qt'den bağımsız saf hesaplama mantığı (Python core'un JS portu)
    ode.js         -> RK4 ile diferansiyel denklem çözücüler
    linalg.js      -> 2x2 matris özdeğer/özvektör analizi
    fourier.js     -> Fourier seri sentezi
    network.js     -> rastgele graf üretimi + Dijkstra
    dfa.js         -> 4 farklı DFA tanımı + çalıştırma mantığı
  components/     -> her sekme kendi React bileşeninde
  App.jsx         -> kanal seçici (tab bar) + sekme kompozisyonu
  App.css         -> "enstrüman paneli" tema (koyu lacivert + amber/teal vurgu)
```
