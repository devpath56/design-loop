---
name: effects
description: Wire a background/atmosphere effect from the project's effects/ library into an HTML prototype so it renders AND passes the design gate. Use when the user asks for a marble-ink / suminagashi / Japanese-marbling / mesh-gradient / liquid / animated background, names any effect in effects/registry.json, or says "make the background <effect> style". Also use when a design-loop run needs atmosphere behind a hero.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# effects — the project's effect library

Effects live in `effects/`. `effects/registry.json` is the index. **Read it first** — never
hard-code an effect's paths or options from memory, and never invent an effect that isn't listed.

## 1 · Resolve the request

Match the user's words against each effect's `aliases`. "marble ink japan style", "suminagashi",
"ink in water" all resolve to `marble-ink-jpn`. If nothing matches, say so and list what *is*
available — do not substitute a different effect silently, and do not hand-roll a new shader when
the user asked for a named one.

## 2 · Wire it in

**Use the `global` build for prototypes — not the ESM entry.** The loop grades standalone HTML
opened over `file://`, where the origin is `null` and ES-module imports are CORS-blocked. A
`<script type="module">` import fails the gate's `no console errors` check every time, while the
page still *looks* fine in a permissive preview. Classic `<script src>` has no such restriction.

(If the prototype is served over http, or the target is a real app with a bundler, use the `entry` /
`react` / `webComponent` paths instead.)

Insert the canvas as the **first** child of `<body>`, and the script at the end:

```html
<canvas id="fx-bg" aria-hidden="true"></canvas>
```

```css
#fx-bg {
  position: fixed; inset: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;   /* non-negotiable — see gate risks */
}
/* every existing top-level section must now establish a stacking context above it */
body > *:not(#fx-bg) { position: relative; z-index: 1; }
```

```html
<script src="./effects/marble-ink-jpn/dist/marble-ink.global.js"></script>
<script>
  new MarbleInk(document.getElementById('fx-bg'), { palette: /* see §3 */ });
</script>
```

Use the exact `global`, `className`, and option names from the registry entry, and adjust the
relative path to the prototype's actual location. If `dist/` is missing or stale after a source
edit, rebuild it: `node effects/<id>/build.mjs`.

`aria-hidden="true"` is correct here: the canvas is decorative atmosphere, and announcing it adds
noise to a screen reader. (The library's own React/web-component wrappers label it `role="img"` for
standalone use — override that when it is a background.)

## 3 · Palette comes from `design.md`, not from the presets

This is where an effect turns into slop. The built-in presets are demo colors.

- **Derive the four stops from the page's existing accent and neutrals.** Darkest first, brightest
  last. The gradient must read as the same system as the page, not a sticker on top of it.
- **Never ship `ember` or `dusk` on a light page.** They land on purple→pink, and `design.md`
  explicitly rejects the purple→blue gradient hero — a named slop tell.
- Pass `{dark, light}` when the page has both themes; `theme: 'auto'` then follows `data-theme`.
- Keep `warp` ≤ 0.6 unless the page is deliberately maximalist. High warp reads as a screensaver.

## 4 · The legibility contract (this is what makes the gate pass)

Text over a moving gradient is the single most common way this fails `design-gate` — axe measures
contrast against a sampled frame, and an animated field *will* drift brighter than whatever you
checked by eye.

So: **text never sits directly on the effect.** Put a scrim between them.

```css
.hero { position: relative; z-index: 1; }
.hero::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: radial-gradient(ellipse at center,
              rgb(0 0 0 / .55) 0%, rgb(0 0 0 / .25) 60%, transparent 100%);
}
```

Invert for a light ground. Then verify against the effect's **brightest** state, not its average:
raise `vignette`, or darken stop 3 and 4, until body text clears 4.5:1 at the worst frame. If you
cannot get there with a scrim, reduce the palette's top stop — do not shrink the text or grey it out.

Also required, all cheap:
- `respectReducedMotion` stays `true` (default). Do not disable it.
- `autoPause` stays `true` (default) — offscreen and hidden-tab render loops are a battery bug.
- Leave `grain` on. Wide gradients band visibly at 8 bits without dither.
- Set `fallbackBackground` to a static CSS gradient in the same palette, so a WebGL-less browser
  still gets a designed page rather than a white void.

## 5 · Verify — do not report success from the source

An effect that "looks right in the code" is not done. Before claiming it works:

1. Open the prototype and confirm the canvas actually renders (not a blank/black frame) and that
   controls beneath it are still clickable.
2. Check the console is clean — a bad relative import path is the usual culprit and it fails
   silently behind a correct-looking page.
3. Run the loop's deterministic gate on the file. Contrast and overflow are the two checks this
   change puts at risk:
   ```
   npm run design-gate -- <file.html> --log --note "added <effect> background" --why "<why this effect, what you rejected>"
   ```

Report what you actually observed. If contrast fails, fix the scrim or the palette and re-run —
never wave it through, and never report a pass you did not see.

## Adding an effect to the library

Drop the folder in `effects/`, add an entry to `effects/registry.json` with its `aliases`,
`entry`, `className`, `options`, and `gateRisks`. This skill needs no edit — it reads the registry.
