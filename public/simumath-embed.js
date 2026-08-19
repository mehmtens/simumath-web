class SimuMathEmbed extends HTMLElement {
  connectedCallback() {
    const moduleName = this.getAttribute('module') || 'ode';
    const state = this.getAttribute('state') || '';
    const height = this.getAttribute('height') || '620';
    const base = this.getAttribute('base') || window.location.origin;
    const params = new URLSearchParams(state);
    params.set('embed', '1');
    const frame = document.createElement('iframe');
    frame.src = `${base}/#${moduleName}?${params.toString()}`;
    frame.title = this.getAttribute('title') || `SimuMath ${moduleName}`;
    frame.loading = 'lazy';
    frame.style.width = '100%';
    frame.style.height = /^\d+$/.test(height) ? `${height}px` : height;
    frame.style.border = '0';
    frame.style.borderRadius = '12px';
    this.replaceChildren(frame);
  }
}
if (!customElements.get('simumath-embed')) customElements.define('simumath-embed', SimuMathEmbed);
