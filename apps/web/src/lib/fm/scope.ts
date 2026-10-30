import type p5 from "p5";
import { sine } from "./crvs.ts";
import { HAND_LAG, type Hand } from "./systems.ts";

/**
 * An XY oscilloscope in one bit. While the station plays, the left channel
 * moves the beam across and the right moves it up, so what you see is the
 * sound. Before it plays, the station's curves draw a Lissajous knot instead.
 * Phosphor fades by becoming less likely to be lit, not dimmer: noise lets
 * one bit carry the trail, as in the tuner's threshold study. While it plays,
 * the scope is also a pad, and a dotted cursor, like a scope's own, marks the
 * listener's hand on it.
 */

export interface ScopeState {
  left: AnalyserNode | null;
  right: AnalyserNode | null;
  /** The figure drawn when nothing is playing: writes the point on a closed curve at u in [0, 1), turning with t seconds, into `out`. */
  figure: ((u: number, t: number, out: [number, number]) => void) | null;
  /** The decision's σ, drawn as static. 1 before anything is decided. */
  sigma: number;
  /** The beam's color, 0–1: white, or the station's hue once it locks. */
  ink: [number, number, number];
  /** The listener's hand on the pad, or null. */
  hand: Hand | null;
}

const TRAIL = 7;
const FIGURE_POINTS = 1600;
/** The cursor's dots are this many pixels apart. */
const DOTS = 3;

export function scope(state: ScopeState, size: number, animate: boolean) {
  return (p: p5) => {
    const age = new Uint8Array(size * size);
    const left = new Float32Array(2048);
    const right = new Float32Array(2048);
    // The figure writes each point here: 1,600 new pairs a frame is garbage a phone pauses to collect.
    const point: [number, number] = [0, 0];
    let context: CanvasRenderingContext2D;
    let image: ImageData;
    let gain = 1;
    let start = 0;
    // Where the cursor is drawn: on the hand while it's held, then easing back to the centre with the sound.
    let cursorX = 0;
    let cursorY = 0;
    let cursor = false;
    let last = 0;

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
      start = performance.now();
      if (!animate) p.noLoop();
    };

    const lit = (x: number, y: number) => {
      const j = (y * size + x) * 4;
      image.data[j] = image.data[j + 1] = image.data[j + 2] = 255;
    };

    p.draw = () => {
      for (let i = 0; i < age.length; i++) if (age[i]! > 0) age[i]!--;
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // The state is reactive, and every read goes through Svelte; read each field once a frame.
      const { left: leftNode, right: rightNode, figure, sigma, ink, hand } = state;
      if (leftNode && rightNode) {
        leftNode.getFloatTimeDomainData(left);
        rightNode.getFloatTimeDomainData(right);
        let peak = 0;
        for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
        // Auto-range, slowly, so a quiet passage still fills the screen.
        if (peak > 0.002) gain += (1 / peak - gain) * 0.06;
        for (let i = 0; i < left.length; i++) hit(left[i]! * gain, right[i]! * gain);
      } else if (figure) {
        const t = animate ? (performance.now() - start) / 1000 : 0;
        for (let i = 0; i < FIGURE_POINTS; i++) {
          figure(i / FIGURE_POINTS, t, point);
          hit(point[0], point[1]);
        }
      }

      const r = Math.round(ink[0] * 255);
      const g = Math.round(ink[1] * 255);
      const b = Math.round(ink[2] * 255);
      const staticRate = sigma * 0.035;
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

      if (hand) {
        cursorX = hand.x;
        cursorY = hand.y;
        cursor = true;
      } else if (cursor) {
        // The master's one-pole lag, so the cursor reaches the centre as the sound does. A still frame skips the glide.
        const k = animate ? Math.exp((Math.log(0.001) * dt) / HAND_LAG.released) : 0;
        cursorX *= k;
        cursorY *= k;
        cursor = Math.max(Math.abs(cursorX), Math.abs(cursorY)) > 0.01;
      }
      if (cursor) {
        const cx = Math.round(((cursorX + 1) / 2) * (size - 1));
        const cy = Math.round(((1 - cursorY) / 2) * (size - 1));
        // Dots counted from the cursor, so they move with it instead of crawling along the lines.
        for (let i = cy % DOTS; i < size; i += DOTS) lit(cx, i);
        for (let i = cx % DOTS; i < size; i += DOTS) lit(i, cy);
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
export function knot(a: number, b: number, c: number, feedback: number, turn = 0.05): NonNullable<ScopeState["figure"]> {
  const x = sine(feedback, { rate: a });
  const y = sine(feedback, { rate: b, phase: 0.25 });
  const z = sine(feedback, { rate: c, phase: 0.125 });
  return (u, t, out) => {
    const angle = t * turn * 2 * Math.PI;
    const px = x(u) * 2 - 1;
    const pz = z(u) * 2 - 1;
    out[0] = px * Math.cos(angle) + pz * Math.sin(angle);
    out[1] = y(u) * 2 - 1;
  };
}
