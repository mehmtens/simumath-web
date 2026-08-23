export function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildAssignmentReport({ title, summary, parameters, results, notes = [] }) {
  const parameterRows = Object.entries(parameters).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const resultRows = Object.entries(results).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  return `# ${title}\n\n## Amaç\n${summary}\n\n## Parametreler\n| Parametre | Değer |\n|---|---|\n${parameterRows}\n\n## Sonuçlar\n| Ölçüm | Değer |\n|---|---|\n${resultRows}\n\n## Yöntem ve Yorum\n${notes.map((note) => `- ${note}`).join('\n')}\n\n## Yeniden Üretilebilirlik\nSimülasyon bağlantısı: ${window.location.href}\n\n---\nSimuMath Pro tarafından oluşturuldu.\n`;
}

function texEscape(value) {
  return String(value).replace(/([#$%&_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
}

export function buildLatexReport({ title, summary, parameters, results, notes = [] }) {
  const rows = (obj) => Object.entries(obj).map(([key, value]) => `${texEscape(key)} & ${texEscape(value)} \\\\`).join('\n');
  return `\\documentclass[11pt]{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage{amsmath,amssymb,booktabs,geometry,hyperref}\n\\geometry{margin=2.5cm}\n\\title{${texEscape(title)}}\n\\author{SimuMath Pro}\n\\date{\\today}\n\\begin{document}\n\\maketitle\n\\section*{Amaç}\n${texEscape(summary)}\n\\section*{Parametreler}\n\\begin{tabular}{ll}\\toprule Parametre & Değer \\\\ \\midrule\n${rows(parameters)}\n\\bottomrule\\end{tabular}\n\\section*{Sonuçlar}\n\\begin{tabular}{ll}\\toprule Ölçüm & Değer \\\\ \\midrule\n${rows(results)}\n\\bottomrule\\end{tabular}\n\\section*{Yöntem ve Yorum}\n\\begin{itemize}\n${notes.map((note) => `\\item ${texEscape(note)}`).join('\n')}\n\\end{itemize}\n\\section*{Yeniden Üretilebilirlik}\n\\url{${window.location.href.replace(/([%#&_])/g, '\\$1')}}\n\\end{document}\n`;
}

export function printReport({ title, summary, parameters, results, notes = [] }) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  const table = (obj) => Object.entries(obj).map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:15px system-ui;margin:40px;color:#111}h1{margin-bottom:8px}table{border-collapse:collapse;width:100%;margin:12px 0 24px}th,td{border:1px solid #bbb;padding:8px;text-align:left}code{word-break:break-all}@media print{button{display:none}}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(summary)}</p><h2>Parametreler</h2><table>${table(parameters)}</table><h2>Sonuçlar</h2><table>${table(results)}</table><h2>Yöntem ve Yorum</h2><ul>${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul><h2>Yeniden Üretilebilirlik</h2><code>${escapeHtml(window.location.href)}</code><p><button onclick="window.print()">PDF olarak kaydet / Yazdır</button></p></body></html>`);
  win.document.close();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function exportSvgElement(svg, filename = 'simumath-plot.svg') {
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  downloadText(filename, source, 'image/svg+xml;charset=utf-8');
}

export function exportSvgAsPng(svg, filename = 'simumath-plot.png', scale = 3) {
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const box = svg.getBoundingClientRect();
    const width = Math.max(1, Math.round((box.width || 1200) * scale));
    const height = Math.max(1, Math.round((box.height || 700) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob((png) => { if (png) downloadBlob(filename, png); URL.revokeObjectURL(url); }, 'image/png', 1);
  };
  image.src = url;
}
