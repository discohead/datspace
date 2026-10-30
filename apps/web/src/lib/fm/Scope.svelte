<script lang="ts">
  import type p5 from "p5";
  import Sketch from "../site/Sketch.svelte";
  import { scope, type ScopeState } from "./scope.ts";
  import type { Hand } from "./systems.ts";

  interface Props {
    /** What the scope draws; the sketch reads it on every frame. */
    signal: ScopeState;
    animate: boolean;
    /**
     * While the station plays, the scope is a pad, and this hears the hand on it: a mouse by where it points,
     * a finger or a pen by where it touches. Null when it lets go.
     */
    onhand?: ((hand: Hand | null) => void) | null;
  }

  let { signal, animate, onhand = null }: Props = $props();
  const SIZE = 192;
  // The sketch is built once and never rebuilt.
  // svelte-ignore state_referenced_locally
  const sketch = scope(signal, SIZE, animate);
  let instance = $state<p5 | null>(null);
  let surface: HTMLDivElement;
  /** The finger or pen holding the pad. Only one at a time, and a mouse holds it just by pointing. */
  let held: number | null = null;

  // A still frame (reduced motion) is redrawn when the station changes or the hand moves, not every frame.
  $effect(() => {
    void [signal.figure, signal.sigma, signal.ink, signal.left, signal.hand];
    if (!animate) instance?.redraw();
  });

  /** The pointer's position inside the border, from −1 to 1 each way, up positive. */
  function at(event: PointerEvent): Hand {
    const box = surface.getBoundingClientRect();
    const across = (event.clientX - box.left - surface.clientLeft) / surface.clientWidth;
    const down = (event.clientY - box.top - surface.clientTop) / surface.clientHeight;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    return { x: clamp(across * 2 - 1), y: clamp(1 - down * 2) };
  }

  function move(event: PointerEvent) {
    if (!onhand) return;
    if (event.pointerType === "mouse" ? held === null : event.pointerId === held) onhand(at(event));
  }

  function press(event: PointerEvent) {
    if (!onhand || event.pointerType === "mouse" || held !== null) return;
    held = event.pointerId;
    // Keep the finger's moves while it slides off the edge, where the hand stops at the edge.
    surface.setPointerCapture(event.pointerId);
    onhand(at(event));
  }

  function lift(event: PointerEvent) {
    if (event.pointerId !== held) return;
    held = null;
    onhand?.(null);
  }

  function leave(event: PointerEvent) {
    if (event.pointerType === "mouse" && held === null) onhand?.(null);
  }
</script>

<!-- A surface for pointers only: the keyboard has the two sliders under it, and the canvas is a picture of the sound. -->
<div
  class="scope"
  class:pad={onhand !== null}
  aria-hidden="true"
  bind:this={surface}
  onpointerenter={move}
  onpointermove={move}
  onpointerdown={press}
  onpointerup={lift}
  onpointercancel={lift}
  onlostpointercapture={lift}
  onpointerleave={leave}
>
  <Sketch {sketch} {animate} bind:instance />
</div>

<style>
  .scope {
    border: 1px solid var(--ink);
    line-height: 0;
    aspect-ratio: 1;
  }

  /* While it's a pad, a touch on it plays instead of scrolling the page or selecting anything. */
  .pad {
    cursor: crosshair;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  /* p5 sets pixel sizes inline; scale the small buffer up with hard edges. */
  .scope :global(canvas) {
    width: 100% !important;
    height: 100% !important;
    image-rendering: pixelated;
  }
</style>
