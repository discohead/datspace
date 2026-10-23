/**
 * The field: 1-bit pixels, on when s·(1 − σ) + n·1.6·σ > 0. `s` is the
 * station's glyph (±1), `n` is uniform noise in [−1, 1]. At σ = 1 the screen
 * is pure static; as σ falls the glyph emerges, the way a diffusion model
 * denoises toward an image.
 */

export const vertexShader = /* glsl */ `
  void main() {
    // A 2×2 plane drawn straight to clip space: always full screen, no camera.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp int;

  uniform float uSigma;
  uniform float uFrame;
  uniform float uCell;       // device pixels per 1-bit cell
  uniform vec4 uGlyphRect;   // x, y, size, size in device pixels, origin bottom left
  uniform sampler2D uGlyph;  // n×n, red channel 0 or 1
  uniform vec3 uInk;

  // three.js no longer aliases gl_FragColor for GLSL3 materials.
  out vec4 fragColor;

  // pcg3d, Jarzynski and Olano, "Hash Functions for GPU Rendering" (2020).
  uvec3 pcg3d(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    return v;
  }

  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uCell);
    uvec3 h = pcg3d(uvec3(uvec2(cell + 32768.0), uint(uFrame)));
    float n = float(h.x & 0xffffu) / 32767.5 - 1.0;

    float s = -1.0;
    vec2 local = (cell * uCell - uGlyphRect.xy) / uGlyphRect.zw;
    if (all(greaterThanEqual(local, vec2(0.0))) && all(lessThan(local, vec2(1.0)))) {
      // Flip y so row 0 of the bitmap is the top of the glyph.
      s = texture(uGlyph, vec2(local.x, 1.0 - local.y)).r > 0.5 ? 1.0 : -1.0;
    }

    bool on = s * (1.0 - uSigma) + n * 1.6 * uSigma > 0.0;
    fragColor = vec4(on ? uInk : vec3(0.0), 1.0);
  }
`;
