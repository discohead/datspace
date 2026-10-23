import type p5 from "p5";

/**
 * The 1-bit studies behind the tuner. Each sketch writes a whole frame into
 * an ImageData at a small size and puts it on the canvas, never reading it
 * back; CSS scales it up with hard edges.
 */

const ON = 255;

/** A frame buffer for a sketch: call `plot` for every pixel, then `show`. */
function frame(p: p5, w: number, h: number) {
  const context = p.drawingContext as CanvasRenderingContext2D;
  const image = context.createImageData(w, h);
  return {
    plot(x: number, y: number, lit: boolean) {
      const i = 4 * (y * w + x);
      const v = lit ? ON : 0;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    },
    show() {
      context.putImageData(image, 0, 0);
    },
  };
}

export interface DenoiseState {
  sigma: number;
}

/** The tuner's equation: on when s·(1 − σ) + n·1.6·σ > 0. */
export function denoise(state: DenoiseState, glyph: Uint8Array, n: number, animate: boolean) {
  const scale = 4;
  const margin = 12;
  const size = n * scale + margin * 2;
  return (p: p5) => {
    let buffer: ReturnType<typeof frame>;
    p.setup = () => {
      p.pixelDensity(1);
      p.createCanvas(size, size);
      p.frameRate(24);
      buffer = frame(p, size, size);
      if (!animate) p.noLoop();
    };
    p.draw = () => {
      const sigma = state.sigma;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const gx = Math.floor((x - margin) / scale);
          const gy = Math.floor((y - margin) / scale);
          const inside = gx >= 0 && gy >= 0 && gx < n && gy < n;
          const s = inside && glyph[gy * n + gx] ? 1 : -1;
          buffer.plot(x, y, s * (1 - sigma) + p.random(-1, 1) * 1.6 * sigma > 0);
        }
      }
      buffer.show();
    };
  };
}

/** Each stage of a glyph's growth, side by side. */
export function grow(state: { steps: Uint8Array[] }, n: number) {
  const scale = 3;
  const gap = 8;
  const panels = 3;
  const w = panels * n * scale + (panels - 1) * gap;
  const h = n * scale;
  return (p: p5) => {
    let buffer: ReturnType<typeof frame>;
    p.setup = () => {
      p.pixelDensity(1);
      p.createCanvas(w, h);
      buffer = frame(p, w, h);
      p.noLoop();
    };
    p.draw = () => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const panel = Math.floor(x / (n * scale + gap));
          const px = x - panel * (n * scale + gap);
          const step = state.steps[panel];
          buffer.plot(x, y, px < n * scale && step?.[Math.floor(y / scale) * n + Math.floor(px / scale)] === 1);
        }
      }
      buffer.show();
    };
  };
}

export interface ThresholdState {
  noise: number;
}

/** A gray ramp through one bit: without noise it's a hard edge; with it, the ramp survives on average. */
export function threshold(state: ThresholdState, animate: boolean) {
  const w = 192;
  const h = 48;
  return (p: p5) => {
    let buffer: ReturnType<typeof frame>;
    p.setup = () => {
      p.pixelDensity(1);
      p.createCanvas(w, h);
      p.frameRate(24);
      buffer = frame(p, w, h);
      if (!animate) p.noLoop();
    };
    p.draw = () => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          buffer.plot(x, y, x / (w - 1) + p.random(-0.5, 0.5) * state.noise > 0.5);
        }
      }
      buffer.show();
    };
  };
}
