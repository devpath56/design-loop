export type PresetName = 'ember' | 'tide' | 'moss' | 'ash' | 'dusk';
export type Stops = [string, string, string, string];
export type Palette = PresetName | Stops | { dark?: Stops; light?: Stops };
export type ThemeMode = 'auto' | 'dark' | 'light';

export interface MarbleInkOptions {
  /** Preset name, four #rrggbb stops, or a {dark, light} pair. */
  palette?: Palette;
  /** 'auto' follows `data-theme` on <html>, then prefers-color-scheme. */
  theme?: ThemeMode;
  /** Domain-warp strength, 0..1. Higher is more liquid. Default 0.55. */
  warp?: number;
  /** Time scale, 0..1. Default 0.35. */
  speed?: number;
  /** Dither amount. Default 0.022 — set to 0 only on small surfaces. */
  grain?: number;
  /** Vignette strength, 0..1. Default 1. */
  vignette?: number;
  /** Cursor force + light. Default true. */
  interactive?: boolean;
  /** Master gain on cursor response, 0..1. Default 1. */
  pointerGain?: number;
  /** Ceiling on devicePixelRatio. Default 1.5. */
  dprCap?: number;
  /** Pause when offscreen or the tab is hidden. Default true. */
  autoPause?: boolean;
  /** Freeze time under prefers-reduced-motion. Default true. */
  respectReducedMotion?: boolean;
  /** CSS background used when WebGL is unavailable. */
  fallbackBackground?: string | null;
}

export declare class MarbleInk {
  constructor(canvas: HTMLCanvasElement, options?: MarbleInkOptions);
  readonly supported: boolean;
  readonly canvas: HTMLCanvasElement;
  set(patch: MarbleInkOptions): this;
  play(): this;
  pause(): this;
  pulse(amount?: number): this;
  destroy(): void;
}

export declare const presets: Record<PresetName, { dark: Stops; light: Stops }>;
export declare const presetNames: PresetName[];
export declare function hexToRgb(hex: string): [number, number, number];
export declare function resolvePalette(palette: Palette, theme?: 'dark' | 'light'): Stops;
export declare const VERT: string;
export declare const FRAG: string;

export default MarbleInk;
