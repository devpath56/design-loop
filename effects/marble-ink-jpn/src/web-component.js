import { MarbleInk } from './marble-ink.js';

/**
 * <marble-ink> — the effect as a custom element, for Vue, Svelte, Astro,
 * Rails, plain HTML, or anywhere else without a React runtime.
 *
 *   <script type="module" src="./src/web-component.js"></script>
 *   <marble-ink palette="tide" warp="0.7"></marble-ink>
 */
const NUMERIC = ['warp', 'speed', 'grain', 'vignette', 'pointer-gain', 'dpr-cap'];

class MarbleInkElement extends HTMLElement {
  static observedAttributes = ['palette', 'theme', 'interactive', ...NUMERIC];

  connectedCallback() {
    if (this._fx) return;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; position: relative; }
        canvas { display: block; width: 100%; height: 100%; }
      </style>
      <canvas role="img" aria-label="Animated gradient"></canvas>
    `;
    this._fx = new MarbleInk(shadow.querySelector('canvas'), this._options());
  }

  disconnectedCallback() {
    this._fx?.destroy();
    this._fx = null;
  }

  attributeChangedCallback() {
    this._fx?.set(this._options());
  }

  _options() {
    const o = {};
    const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (this.hasAttribute('palette')) o.palette = this.getAttribute('palette');
    if (this.hasAttribute('theme')) o.theme = this.getAttribute('theme');
    if (this.hasAttribute('interactive')) o.interactive = this.getAttribute('interactive') !== 'false';
    for (const attr of NUMERIC) {
      if (this.hasAttribute(attr)) {
        const n = parseFloat(this.getAttribute(attr));
        if (!Number.isNaN(n)) o[camel(attr)] = n;
      }
    }
    return o;
  }

  pulse(n) { this._fx?.pulse(n); }
  play() { this._fx?.play(); }
  pause() { this._fx?.pause(); }
}

if (!customElements.get('marble-ink')) {
  customElements.define('marble-ink', MarbleInkElement);
}

export { MarbleInkElement };
