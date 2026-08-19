export function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildAssignmentReport({ title, summary, parameters, results, notes = [] }) {
  const parameterRows = Object.entries(parameters).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const resultRows = Object.entries(results).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  return `# ${title}\n\n## Amaç\n${summary}\n\n## Parametreler\n| Parametre | Değer |\n|---|---|\n${parameterRows}\n\n## Sonuçlar\n| Ölçüm | Değer |\n|---|---|\n${resultRows}\n\n## Yöntem ve Yorum\n${notes.map((note) => `- ${note}`).join('\n')}\n\n## Yeniden Üretilebilirlik\nSimülasyon bağlantısı: ${window.location.href}\n\n---\nSimuMath Pro tarafından oluşturuldu.\n`;
}
