import * as React from 'react';
import type { MarbleInkOptions, MarbleInk as Engine } from './index';

export interface MarbleInkProps extends MarbleInkOptions, Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, 'color'> {
  className?: string;
  style?: React.CSSProperties;
}

export interface MarbleInkHandle {
  pulse(amount?: number): void;
  play(): void;
  pause(): void;
  readonly instance: Engine | null;
}

/** `MarbleInk` is the React component. The core class is `MarbleInkEngine`. */
export declare const MarbleInk: React.ForwardRefExoticComponent<
  MarbleInkProps & React.RefAttributes<MarbleInkHandle>
>;

export default MarbleInk;
export { MarbleInk as MarbleInkEngine } from './index';
export { presets, presetNames } from './index';
