import { VERT, FRAG } from './shader.js';
import { resolvePalette, hexToRgb, presets } from './presets.js';

const DEFAULTS = {
  palette: 'ember',
  theme: 'auto',        // 'auto' | 'dark' | 'light'
  warp: 0.55,           // 0..1  domain-warp strength
  speed: 0.35,          // 0..1  time scale
  grain: 0.022,         // dither; 0 will band on wide gradients
  vignette: 1,          // 0..1
  interactive: true,    // cursor force + light
  pointerGain: 1,       // 0..1 master gain on cursor response
  dprCap: 1.5,          // hard ceiling on devicePixelRatio
  autoPause: true,      // pause offscreen + on hidden tab
  respectReducedMotion: true,
  fallbackBackground: null, // CSS background if WebGL is unavailable
};

/**
 * MarbleInk — an animated mesh-gradient effect on a single canvas.
 *
 *   const fx = new MarbleInk(canvas, { palette: 'tide' });
 *   fx.set({ warp: 0.8 });
 *   fx.destroy();
 *
 * Owns nothing outside the canvas it is given, and releases every listener,
 * observer, and GL object on destroy().
 */
export class MarbleInk {
  constructor(canvas, options = {}) {
    if (!canvas || canvas.nodeName !== 'CANVAS') {
      throw new Error('[marble-ink] first argument must be a <canvas> element');
    }

    this.canvas = canvas;
    this.opts = { ...DEFAULTS, ...options };

    this._raf = 0;
    this._running = false;
    this._destroyed = false;
    this._visible = true;
    this._clock = 0;
    this._last = 0;
    this._pulse = 0;
    this._mouse = [0.5, 0.5];
    this._target = [0.5, 0.5];
    this._listeners = [];

    this.gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    }) || canvas.getContext('experimental-webgl');

    if (!this.gl) {
      this.supported = false;
      this._applyFallback();
      return;
    }
    this.supported = true;

    this._initGL();
    this._bindEvents();
    this._resize();
    this._applyPalette();
    this.play();
  }

  // ---- public API ---------------------------------------------------------

  /** Patch options at runtime. Accepts any subset of the constructor options. */
  set(patch = {}) {
    const hadPalette = 'palette' in patch || 'theme' in patch;
    Object.assign(this.opts, patch);
    if (this.supported && hadPalette) this._applyPalette();
    return this;
  }

  play() {
    if (!this.supported || this._destroyed || this._running) return this;
    this._running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
    return this;
  }

  pause() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    return this;
  }

  /** Trigger the click impulse programmatically (0..1). */
  pulse(amount = 1) {
    this._pulse = Math.max(this._pulse, amount);
    return this;
  }

  /** Release GL objects, listeners, and observers. Safe to call twice. */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.pause();

    this._listeners.forEach(([t, e, h]) => t.removeEventListener(e, h));
    this._listeners = [];
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this._mo) this._mo.disconnect();

    const gl = this.gl;
    if (gl) {
      gl.deleteBuffer(this._buf);
      gl.deleteProgram(this._prog);
      gl.deleteShader(this._vs);
      gl.deleteShader(this._fs);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
    this.gl = null;
  }

  // ---- internals ----------------------------------------------------------

  _applyFallback() {
    const bg = this.opts.fallbackBackground || this._cssGradientFromPalette();
    this.canvas.style.background = bg;
  }

  _cssGradientFromPalette() {
    const stops = resolvePalette(this.opts.palette, this._theme());
    return `linear-gradient(140deg, ${stops.join(', ')})`;
  }

  _theme() {
    if (this.opts.theme !== 'auto') return this.opts.theme;
    if (typeof document !== 'undefined') {
      const stamped = document.documentElement.dataset.theme;
      if (stamped === 'dark' || stamped === 'light') return stamped;
    }
    return typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  _compile(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(`[marble-ink] shader compile failed: ${log}`);
    }
    return s;
  }

  _initGL() {
    const gl = this.gl;

    this._vs = this._compile(gl.VERTEX_SHADER, VERT);
    this._fs = this._compile(gl.FRAGMENT_SHADER, FRAG);

    this._prog = gl.createProgram();
    gl.attachShader(this._prog, this._vs);
    gl.attachShader(this._prog, this._fs);
    gl.linkProgram(this._prog);
    if (!gl.getProgramParameter(this._prog, gl.LINK_STATUS)) {
      throw new Error(`[marble-ink] program link failed: ${gl.getProgramInfoLog(this._prog)}`);
    }
    gl.useProgram(this._prog);

    // One oversized triangle covers the viewport with fewer fragments than
    // two triangles and no diagonal seam.
    this._buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this._prog, 'pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(this._prog, n);
    this._u = {
      res: U('uRes'), time: U('uTime'), mouse: U('uMouse'),
      warp: U('uWarp'), pulse: U('uPulse'), grain: U('uGrain'),
      vignette: U('uVignette'), pointer: U('uPointer'),
      c: [U('uC0'), U('uC1'), U('uC2'), U('uC3')],
    };
  }

  _on(target, event, handler, opts) {
    target.addEventListener(event, handler, opts);
    this._listeners.push([target, event, handler]);
  }

  _bindEvents() {
    // Observe the canvas itself, not the window — the effect is often a panel,
    // not a full-page background.
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.canvas);
    } else {
      this._on(window, 'resize', () => this._resize());
    }

    if (this.opts.autoPause && typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver((entries) => {
        this._visible = entries[0].isIntersecting;
        this._visible && !document.hidden ? this.play() : this.pause();
      }, { threshold: 0 });
      this._io.observe(this.canvas);
    }

    if (this.opts.autoPause) {
      this._on(document, 'visibilitychange', () => {
        document.hidden || !this._visible ? this.pause() : this.play();
      });
    }

    this._on(this.canvas.ownerDocument || document, 'pointermove', (e) => {
      if (!this.opts.interactive) return;
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this._target = [
        (e.clientX - r.left) / r.width,
        1 - (e.clientY - r.top) / r.height,
      ];
    }, { passive: true });

    this._on(this.canvas.ownerDocument || document, 'pointerdown', () => {
      if (this.opts.interactive) this._pulse = 1;
    }, { passive: true });

    // A lost context is normal on tab-switch, GPU sleep, or driver reset.
    // Without these two handlers the canvas silently goes black forever.
    this._on(this.canvas, 'webglcontextlost', (e) => {
      e.preventDefault();
      this.pause();
    });
    this._on(this.canvas, 'webglcontextrestored', () => {
      this._initGL();
      this._resize();
      this._applyPalette();
      this.play();
    });

    if (this.opts.theme === 'auto' && typeof matchMedia !== 'undefined') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      this._on(mq, 'change', () => this._applyPalette());

      if (typeof MutationObserver !== 'undefined') {
        this._mo = new MutationObserver(() => this._applyPalette());
        this._mo.observe(document.documentElement, {
          attributes: true, attributeFilter: ['data-theme'],
        });
      }
    }
  }

  _applyPalette() {
    if (!this.gl) return;
    const stops = resolvePalette(this.opts.palette, this._theme());
    stops.forEach((hex, i) => this.gl.uniform3fv(this._u.c[i], hexToRgb(hex)));
  }

  _resize() {
    if (!this.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.dprCap);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  _frame = (now) => {
    if (!this._running || !this.gl) return;

    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;

    const still = this.opts.respectReducedMotion
      && typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._clock += dt * (still ? 0 : this.opts.speed * 2);

    const ease = Math.min(dt * 4, 1);
    this._mouse[0] += (this._target[0] - this._mouse[0]) * ease;
    this._mouse[1] += (this._target[1] - this._mouse[1]) * ease;
    this._pulse += (0 - this._pulse) * Math.min(dt * 2.2, 1);

    const gl = this.gl, u = this._u;
    gl.uniform2f(u.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.time, this._clock);
    gl.uniform2f(u.mouse, this._mouse[0], this._mouse[1]);
    gl.uniform1f(u.warp, this.opts.warp);
    gl.uniform1f(u.pulse, this._pulse);
    gl.uniform1f(u.grain, this.opts.grain);
    gl.uniform1f(u.vignette, this.opts.vignette);
    gl.uniform1f(u.pointer, this.opts.interactive ? this.opts.pointerGain : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this._raf = requestAnimationFrame(this._frame);
  };
}

export { presets };
export default MarbleInk;
