# effect-marble-ink-jpn

Animated mesh-gradient effect. One WebGL fragment shader, no dependencies, ~9kb of source.

The look is *suminagashi* — Japanese ink marbling, where ink floated on water is pulled into drifting bands. That is what domain-warped noise resembles once you let it move, and the cursor plays the part of the breath that disturbs the surface.

```
effect-marble-ink-jpn/
├── src/
│   ├── marble-ink.js      core engine (framework-agnostic)
│   ├── shader.js          GLSL source
│   ├── presets.js         palettes + color helpers
│   ├── react/index.jsx    <MarbleInk /> React/Next component
│   ├── web-component.js   <marble-ink> custom element
│   └── index.js           entry point
├── types/                 TypeScript declarations
├── demo/index.html        live playground
└── package.json
```

## Install

No build step and no runtime dependencies, so you can either copy `src/` into your project or install it as a local package:

```bash
npm install ./effect-marble-ink-jpn
```

## Use it

### React / Next.js

```jsx
import MarbleInk from 'effect-marble-ink-jpn/react';

export default function Hero() {
  return (
    <section className="relative h-screen">
      <MarbleInk palette="tide" className="absolute inset-0 -z-10" />
      <h1 className="relative z-10">Your headline</h1>
    </section>
  );
}
```

The component file carries `'use client'` and only touches WebGL inside an effect, so it is safe in the Next app router.

One caveat: `src/react/index.jsx` ships as untranspiled JSX. Vite compiles it as-is. Next.js will not transpile files inside `node_modules` by default, so if you installed it as a package rather than copying `src/` in, add:

```js
// next.config.js
module.exports = { transpilePackages: ['effect-marble-ink-jpn'] };
```

### Plain HTML

```html
<canvas id="bg" style="position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none"></canvas>

<script type="module">
  import { MarbleInk } from './effect-marble-ink-jpn/src/index.js';
  const fx = new MarbleInk(document.getElementById('bg'), { palette: 'ember' });
</script>
```

### Anywhere else (Vue, Svelte, Astro, Rails)

```html
<script type="module" src="./effect-marble-ink-jpn/src/web-component.js"></script>
<marble-ink palette="moss" warp="0.7" style="height:100vh"></marble-ink>
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `palette` | `'ember'` | Preset name, four `#rrggbb` stops, or `{dark, light}` |
| `theme` | `'auto'` | `'auto'` follows `data-theme` on `<html>`, then `prefers-color-scheme` |
| `warp` | `0.55` | Domain-warp strength, 0–1. Higher is more liquid |
| `speed` | `0.35` | Time scale, 0–1 |
| `grain` | `0.022` | Dither. Leave it on for anything large |
| `vignette` | `1` | Corner falloff, 0–1 |
| `interactive` | `true` | Cursor force + light |
| `pointerGain` | `1` | Master gain on cursor response, 0–1 |
| `dprCap` | `1.5` | Ceiling on `devicePixelRatio` |
| `autoPause` | `true` | Pause when offscreen or the tab is hidden |
| `respectReducedMotion` | `true` | Freeze time under `prefers-reduced-motion` |
| `fallbackBackground` | `null` | CSS background when WebGL is unavailable |

Presets: `ember`, `tide`, `moss`, `ash`, `dusk`. Each carries a hand-picked dark and light variant — they are not inversions of each other.

## Imperative API

```js
const fx = new MarbleInk(canvas, { palette: 'dusk' });

fx.set({ warp: 0.8 });   // patch options; no GL rebuild
fx.pulse();              // trigger the impulse without a click
fx.pause();
fx.play();
fx.destroy();            // releases GL objects, listeners, observers
```

In React, get the same handle through a ref:

```jsx
const ref = useRef(null);
<MarbleInk ref={ref} />
ref.current.pulse();
```

## Your own colors

A palette is four stops, darkest first, brightest last:

```jsx
<MarbleInk palette={['#0b0f1a', '#1e3a5f', '#4a90d9', '#a8d8f0']} />
```

Or register a themed pair:

```jsx
<MarbleInk palette={{
  dark:  ['#0b0f1a', '#1e3a5f', '#4a90d9', '#a8d8f0'],
  light: ['#f0f6ff', '#c2ddf5', '#6ba3d6', '#2a5a8a'],
}} />
```

Malformed hex throws with a readable message instead of silently rendering black.

## What it costs

One fullscreen triangle, five octaves of noise, three times per pixel. On an M-series Mac at 1440p it holds 60fps with headroom; on integrated graphics, drop `dprCap` to `1` and `warp` below `0.4`.

The defaults are already conservative in three places worth knowing about:

- **`dprCap: 1.5`** — a fullscreen shader at Retina dpr 3 costs roughly 4× the fragments for a background nobody inspects.
- **`autoPause`** — an `IntersectionObserver` plus `visibilitychange` stop the render loop when the canvas is scrolled past or the tab is backgrounded. A gradient burning GPU in a hidden tab is the most common way this kind of effect drains battery.
- **`grain`** — dither, not decoration. Wide gradients band visibly at 8 bits without it.

## Notes for shipping

- Put the canvas at `z-0` with `pointer-events: none` and your content above it. A fullscreen canvas that swallows clicks is the standard first bug.
- The engine observes the *canvas*, not the window, so it works as a card or panel background, not just full-bleed.
- `webglcontextlost` and `webglcontextrestored` are both handled. Without them, a GPU sleep or driver reset leaves the canvas black permanently.
- If WebGL is missing entirely, the canvas gets a static CSS gradient built from the same palette.

## License

MIT
