'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MarbleInk } from '../marble-ink.js';

/**
 * <MarbleInk /> — the effect as a React component.
 *
 *   <MarbleInk palette="tide" warp={0.7} className="absolute inset-0 -z-10" />
 *
 * Safe in Next.js app router: the 'use client' directive is on this file, and
 * the instance is only constructed inside an effect, so nothing touches WebGL
 * during SSR.
 */
export const MarbleInk = forwardRef(function MarbleInk(
  {
    palette = 'ember',
    theme = 'auto',
    warp = 0.55,
    speed = 0.35,
    grain = 0.022,
    vignette = 1,
    interactive = true,
    pointerGain = 1,
    dprCap = 1.5,
    autoPause = true,
    respectReducedMotion = true,
    fallbackBackground = null,
    className,
    style,
    ...rest
  },
  ref,
) {
  const canvasRef = useRef(null);
  const fxRef = useRef(null);

  // Construct once. Option changes are patched below rather than remounting,
  // so dragging a slider never rebuilds the GL context.
  useEffect(() => {
    const fx = new MarbleInk(canvasRef.current, {
      palette, theme, warp, speed, grain, vignette,
      interactive, pointerGain, dprCap, autoPause,
      respectReducedMotion, fallbackBackground,
    });
    fxRef.current = fx;
    return () => fx.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fxRef.current?.set({
      palette, theme, warp, speed, grain, vignette,
      interactive, pointerGain, dprCap,
    });
  }, [palette, theme, warp, speed, grain, vignette, interactive, pointerGain, dprCap]);

  useImperativeHandle(ref, () => ({
    pulse: (n) => fxRef.current?.pulse(n),
    play: () => fxRef.current?.play(),
    pause: () => fxRef.current?.pause(),
    get instance() { return fxRef.current; },
  }), []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Animated gradient"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
      {...rest}
    />
  );
});

export default MarbleInk;
// The core class is re-exported under a distinct name: `MarbleInk` is the
// React component here, and the two cannot share an identifier.
export { MarbleInk as MarbleInkEngine } from '../marble-ink.js';
export { presets, presetNames } from '../presets.js';
