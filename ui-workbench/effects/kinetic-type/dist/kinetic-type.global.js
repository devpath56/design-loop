/* kinetic-type — a text-as-motion effect for ONE headline. Global build (classic <script src>), so
 * it works over file:// where ES-module imports are CORS-blocked. Different category from marble-ink:
 * that is a background field; this animates the TYPE itself.
 *
 * DESIGN STANCE (from real feedback): spend this on the SINGLE highest-hierarchy string, never on
 * several — staging directs attention to one focal point, and three moving things compete. The
 * default mode is `rise`: a masked left-to-right slide, so the motion has a DIRECTION (reading
 * order) and every intermediate frame is real, legible text, not gibberish. `scramble` is kept but
 * is decorative (its middle frames are noise) — reach for it only when "decoding" is the message.
 *
 * new KineticType(elOrSelector, {
 *   mode: 'rise' | 'scramble' | 'wave',
 *   by:   'char' | 'word',
 *   stagger, duration, easing, distance,   // rise/entrance tuning (ms / ms / css / px)
 *   start: 'reveal' | 'load' | 'manual',
 *   glyphs, scrambleMs, waveAmp, wavePeriod,
 *   respectReducedMotion,                  // default true — snap to final, no motion
 * })
 *
 * A11y: for scramble the real text is kept as aria-label and the spans are aria-hidden. Motion uses
 * the Web Animations API (invisible to CSS-only motion checks, never blocks interaction).
 * Contrast: `rise` is a CLIP reveal (opacity stays 1), so text never passes through a low-contrast
 * fade — the transient that fails an accessibility contrast check on load.
 */
(function (global) {
  'use strict';
  var reduce = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };
  var DEFAULTS = {
    mode: 'rise', by: 'char', stagger: 26, duration: 500,
    easing: 'cubic-bezier(.2,.7,.2,1)', distance: 18, blur: 6,
    start: 'reveal', glyphs: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%/<>*', scrambleMs: 420,
    waveAmp: 6, wavePeriod: 2600, respectReducedMotion: true,
  };

  function KineticType(el, opts) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    this.el = el;
    this.o = Object.assign({}, DEFAULTS, opts || {});
    this.text = el.textContent;
    this.played = false;
    this._raf = 0;
    // Only scramble replaces the visible glyphs, so only it needs to guard the accessible name.
    // aria-label is also prohibited on generic elements, so it is scoped to scramble (a heading).
    if (this.o.mode === 'scramble') el.setAttribute('aria-label', this.text);
    this._split();
    if (this.o.respectReducedMotion && reduce()) { this._snap(); return; }
    if (this.o.start === 'load') this.play();
    else if (this.o.start === 'reveal') this._observe();
  }

  KineticType.prototype._split = function () {
    var units = this.o.by === 'word' ? this.text.split(/(\s+)/) : Array.prototype.slice.call(this.text);
    var mode = this.o.mode;
    this.el.textContent = '';
    this.spans = [];
    for (var i = 0; i < units.length; i++) {
      var u = units[i], blank = !u.trim();
      var s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      s.style.display = 'inline-block';
      s.style.whiteSpace = 'pre';
      s._real = u; s._blank = blank;
      if (mode === 'rise' && !blank) {
        // CLIP reveal: outer clips, inner slides up from below. Opacity stays 1 the whole time, so
        // the text never dips through a low-contrast fade. Directional by construction: with a
        // left-to-right stagger the word assembles in reading order.
        s.style.overflow = 'hidden';
        s.style.verticalAlign = 'bottom';
        var inner = document.createElement('span');
        inner.textContent = u;
        inner.style.display = 'inline-block';
        inner.style.willChange = 'transform';
        inner.style.transform = 'translateY(115%)';
        s.appendChild(inner);
        s._inner = inner;
      } else {
        s.textContent = u;
        s.style.willChange = 'transform,opacity';
        if (mode === 'scramble' && !blank) s.style.opacity = '0';
      }
      this.el.appendChild(s);
      this.spans.push(s);
    }
  };

  KineticType.prototype._snap = function () {
    for (var i = 0; i < this.spans.length; i++) {
      var s = this.spans[i];
      if (s._inner) { s._inner.style.transform = 'none'; }
      else { s.style.opacity = ''; s.style.transform = ''; s.textContent = s._real; }
    }
  };

  KineticType.prototype._observe = function () {
    if (!('IntersectionObserver' in window)) { this.play(); return; }
    var self = this;
    var io = new IntersectionObserver(function (entries, obs) {
      for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { self.play(); obs.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(this.el);
  };

  KineticType.prototype.play = function () {
    if (this.played) return; this.played = true;
    if (this.o.mode === 'scramble') return this._scramble();
    if (this.o.mode === 'wave') return this._wave();
    return this._rise();
  };

  KineticType.prototype._rise = function () {
    var o = this.o;
    for (var i = 0; i < this.spans.length; i++) {
      var s = this.spans[i];
      if (s._blank || !s._inner) continue;
      s._inner.animate(
        [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }],
        { duration: o.duration, delay: i * o.stagger, easing: o.easing, fill: 'forwards' }
      );
    }
  };

  KineticType.prototype._scramble = function () {
    var o = this, opt = this.o, t0 = null;
    for (var i = 0; i < this.spans.length; i++) {
      var s = this.spans[i]; s.style.opacity = s._blank ? '1' : '0';
      s._start = i * opt.stagger; s._end = s._start + opt.scrambleMs; s._locked = s._blank;
      if (!s._blank) s.textContent = '';
    }
    function frame(now) {
      if (t0 === null) t0 = now;
      var el = now - t0, alive = false, k = 0;
      for (var i = 0; i < o.spans.length; i++) {
        var s = o.spans[i];
        if (s._locked) continue;
        if (el < s._start) { alive = true; continue; }
        s.style.opacity = '1';
        if (el >= s._end) { s.textContent = s._real; s._locked = true; continue; }
        alive = true;
        if ((k++ & 1) === 0) s.textContent = opt.glyphs.charAt((Math.random() * opt.glyphs.length) | 0);
      }
      if (alive) o._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };

  KineticType.prototype._wave = function () {
    var o = this.o, spans = this.spans;
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i]; s.style.opacity = '1';
      if (s._blank) continue;
      s.animate(
        [{ transform: 'translateY(' + (-o.waveAmp) + 'px)' }, { transform: 'translateY(' + o.waveAmp + 'px)' }],
        { duration: o.wavePeriod, delay: -(i / spans.length) * o.wavePeriod, direction: 'alternate',
          iterations: Infinity, easing: 'cubic-bezier(.45,0,.55,1)' }
      );
    }
  };

  KineticType.prototype.destroy = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._snap();
  };

  global.KineticType = KineticType;
})(window);
