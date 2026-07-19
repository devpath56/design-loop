/**
 * MarbleInk — palette presets.
 *
 * Each preset carries a dark and a light variant. They are not inversions of
 * each other: a naive invert wrecks the mid-tone relationships, so each is
 * hand-picked to keep the ramp readable on its own ground.
 *
 * A palette is four hex stops, darkest/ground first, brightest/accent last.
 */

export const presets = {
  ember: {
    dark:  ['#1a0b2e', '#7b2d8e', '#e0518a', '#ffb26b'],
    light: ['#fff0f3', '#ffc2d1', '#c77dff', '#7b2cbf'],
  },
  tide: {
    dark:  ['#04111f', '#0b3d6b', '#1e88a8', '#7fe0d4'],
    light: ['#eef7ff', '#b8dcf0', '#5aa9d6', '#1e5f8a'],
  },
  moss: {
    dark:  ['#0a1410', '#1d3b2a', '#4a7c4e', '#c3d98a'],
    light: ['#f2f7ec', '#cfe3b8', '#8ab87a', '#3e6b45'],
  },
  ash: {
    dark:  ['#0a0a0c', '#2b2b33', '#5c5c6b', '#b8b8c4'],
    light: ['#fafafa', '#d8d8de', '#9a9aa6', '#4a4a55'],
  },
  dusk: {
    dark:  ['#0d0a1a', '#2c2352', '#5b4b9e', '#f0a5c8'],
    light: ['#f6f2ff', '#d9cdf5', '#9d8ad4', '#4a3b7d'],
  },
};

export const presetNames = Object.keys(presets);

/** #rrggbb -> [r, g, b] in 0..1. Throws on malformed input rather than
 *  silently rendering black, which is near-impossible to debug in a shader. */
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`[marble-ink] expected a #rrggbb color, got: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

/** Resolve `palette` (preset name | 4 hex strings | {dark,light}) for a theme. */
export function resolvePalette(palette, theme = 'dark') {
  if (Array.isArray(palette)) {
    if (palette.length !== 4) throw new Error('[marble-ink] palette needs exactly 4 colors');
    return palette;
  }
  if (typeof palette === 'string') {
    const p = presets[palette];
    if (!p) throw new Error(`[marble-ink] unknown preset "${palette}". Try: ${presetNames.join(', ')}`);
    return p[theme] || p.dark;
  }
  if (palette && typeof palette === 'object') {
    return palette[theme] || palette.dark || palette.light;
  }
  return presets.ember[theme];
}
