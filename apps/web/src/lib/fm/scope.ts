import type p5 from "p5";
import { sine } from "./crvs.ts";

/**
 * An XY oscilloscope in one bit. While the station plays, the left channel
 * moves the beam across and the right moves it up, so what you see is the
 * sound. Before it plays, the station's curves draw a Lissajous knot instead.
 * Phosphor fades by becoming less likely to be lit, not dimmer: noise lets
 * one bit carry the trail, as in the tuner's threshold study.
 */

export interface ScopeState {
  left: AnalyserNode | null;
  right: AnalyserNode | null;
  /** The figure drawn when nothing is playing: a point on a closed curve for u in [0, 1), turning with t seconds. */
  figure: ((u: number, t: number) => [number, number]) | null;
  /** The decision's σ, drawn as static. 1 before anything is decided. */
  sigma: number;
  /** The beam's color, 0–1: white, or the station's hue once it locks. */
  ink: [number, number, number];
}

const TRAIL = 7;
const FIGURE_POINTS = 1600;

export function scope(state: ScopeState, size: number, animate: boolean) {
  return (p: p5) => {
    const age = new Uint8Array(size * size);
    const left = new Float32Array(2048);
    const right = new Float32Array(2048);
    let context: CanvasRenderingContext2D;
    let image: ImageData;
    let gain = 1;

    const hit = (x: number, y: number) => {
      const px = Math.round((x * 0.47 + 0.5) * (size - 1));
      const py = Math.round((0.5 - y * 0.47) * (size - 1));
      if (px >= 0 && py >= 0 && px < size && py < size) age[py * size + px] = TRAIL;
    };

    p.setup = () => {
      p.createCanvas(size, size);
      // After createCanvas: p5 2 resets density there, and the frame is written 1:1.
      p.pixelDensity(1);
      p.frameRate(60);
      context = p.drawingContext as CanvasRenderingContext2D;
      image = context.createImageData(size, size);
      if (!animate) p.noLoop();
    };

    p.draw = () => {
      for (let i = 0; i < age.length; i++) if (age[i]! > 0) age[i]!--;

      if (state.left && state.right) {
        state.left.getFloatTimeDomainData(left);
        state.right.getFloatTimeDomainData(right);
        let peak = 0;
        for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
        // Auto-range, slowly, so a quiet passage still fills the screen.
        if (peak > 0.002) gain += (1 / peak - gain) * 0.06;
        for (let i = 0; i < left.length; i++) hit(left[i]! * gain, right[i]! * gain);
      } else if (state.figure) {
        const t = animate ? p.millis() / 1000 : 0;
        for (let i = 0; i < FIGURE_POINTS; i++) {
          const [x, y] = state.figure(i / FIGURE_POINTS, t);
          hit(x, y);
        }
      }

      const [r, g, b] = state.ink.map((c) => Math.round(c * 255)) as [number, number, number];
      const staticRate = state.sigma * 0.035;
      const data = image.data;
      for (let i = 0; i < age.length; i++) {
        const a = age[i]!;
        const j = i * 4;
        if (a > 0 && Math.random() * TRAIL < a) {
          data[j] = r;
          data[j + 1] = g;
          data[j + 2] = b;
        } else {
          // Static is never the station's color.
          const v = Math.random() < staticRate ? 255 : 0;
          data[j] = v;
          data[j + 1] = v;
          data[j + 2] = v;
        }
        data[j + 3] = 255;
      }
      context.putImageData(image, 0, 0);
    };
  };
}

/**
 * A three-dimensional Lissajous knot, a:b:c, turning about its vertical axis
 * and seen from the front. Feedback bends each sine toward a saw, as Curves'
 * sine op does.
 */
export function knot(a: number, b: number, c: number, feedback: number, turn = 0.05): (u: number, t: number) => [number, number] {
  const x = sine(feedback, { rate: a });
  const y = sine(feedback, { rate: b, phase: 0.25 });
  const z = sine(feedback, { rate: c, phase: 0.125 });
  return (u, t) => {
    const angle = t * turn * 2 * Math.PI;
    const px = x(u) * 2 - 1;
    const pz = z(u) * 2 - 1;
    return [px * Math.cos(angle) + pz * Math.sin(angle), y(u) * 2 - 1];
  };
}
