<script lang="ts">
  import type p5 from "p5";
  import Sketch from "../site/Sketch.svelte";
  import { scope, type ScopeState } from "./scope.ts";

  interface Props {
    /** What the scope draws; the sketch reads it on every frame. */
    signal: ScopeState;
    animate: boolean;
  }

  let { signal, animate }: Props = $props();
  const SIZE = 192;
  // The sketch is built once and never rebuilt.
  // svelte-ignore state_referenced_locally
  const sketch = scope(signal, SIZE, animate);
  let instance = $state<p5 | null>(null);

  // A still frame (reduced motion) is redrawn when the station changes, not every frame.
  $effect(() => {
    void [signal.figure, signal.sigma, signal.ink, signal.left];
    if (!animate) instance?.redraw();
  });
</script>

<div class="scope" aria-hidden="true">
  <Sketch {sketch} {animate} bind:instance />
</div>

<style>
  .scope {
    border: 1px solid var(--ink);
    line-height: 0;
    aspect-ratio: 1;
  }

  /* p5 sets pixel sizes inline; scale the small buffer up with hard edges. */
  .scope :global(canvas) {
    width: 100% !important;
    height: 100% !important;
    image-rendering: pixelated;
  }
</style>
