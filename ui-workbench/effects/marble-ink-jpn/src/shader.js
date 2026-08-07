/**
 * MarbleInk — GLSL source.
 *
 * The effect is domain-warped fBm: value noise sampled through the output of
 * two earlier noise passes (p -> q -> r -> f). Single-pass noise reads as
 * clouds; nesting it this way is what produces the ink-in-water marbling.
 */

export const VERT = `
attribute vec2 pos;
void main(){ gl_Position = vec4(pos, 0.0, 1.0); }
`;

export const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;      // 0..1, smoothed on the CPU
uniform float uWarp;       // 0..1  domain-warp strength
uniform float uPulse;      // 0..1  decaying click impulse
uniform float uGrain;      // 0..1  dither amount
uniform float uVignette;   // 0..1
uniform float uPointer;    // 0..1  master gain on all cursor response
uniform vec3  uC0, uC1, uC2, uC3;

vec2 hash2(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
}

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)),
        dot(hash2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)),
        dot(hash2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x),
    u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){
    v += a * noise(p);
    p = p * 2.02 + vec2(3.7, 1.3);
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float mn = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / mn;   // aspect-correct, centered
  float t = uTime;

  // The cursor is a force on the field, not a filter over it: it displaces
  // the sample point before any noise is evaluated.
  vec2 m = (uMouse - 0.5) * (uRes / mn);
  float md = length(p - m);
  vec2 pull = normalize(p - m + 1e-4) * (0.35 / (1.0 + md * 4.0));
  p -= pull * (0.6 + uPulse * 1.8) * uPointer;

  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t * 0.15)),
                fbm(p * 1.4 + vec2(5.2, t * 0.12 + 1.3)));

  vec2 r = vec2(fbm(p * 1.9 + 3.2 * q + vec2(1.7, 9.2) + t * 0.10),
                fbm(p * 1.9 + 3.2 * q + vec2(8.3, 2.8) - t * 0.08));

  float f = clamp(fbm(p * 1.6 + uWarp * 4.0 * r) * 0.5 + 0.5, 0.0, 1.0);

  // Overlapping smoothstep windows so the stops blend instead of terminating.
  vec3 col = mix(uC0, uC1, smoothstep(0.00, 0.42, f));
  col = mix(col, uC2, smoothstep(0.35, 0.68, f));
  col = mix(col, uC3, smoothstep(0.60, 0.95, f));

  float light = exp(-md * 2.4) * (0.18 + uPulse * 0.55) * uPointer;
  col += light * (1.0 - col) * 0.9;

  col *= 1.0 - uVignette * 0.35 * pow(length(uv - 0.5) * 1.35, 2.2);

  // Dither. Large flat gradients band visibly at 8 bits without this.
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}
`;
