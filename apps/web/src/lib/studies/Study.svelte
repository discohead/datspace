<script lang="ts">
  import type p5 from "p5";
  import type { Snippet } from "svelte";
  import Sketch from "../site/Sketch.svelte";

  interface Props {
    title: string;
    sketch: (p: p5) => void;
    /** Whether the sketch loops. */
    animate: boolean;
    /** Changes to this value redraw a sketch that isn't looping. */
    redrawKey: unknown;
    description: Snippet;
    controls?: Snippet;
  }

  let { title, sketch, animate, redrawKey, description, controls }: Props = $props();
  let instance = $state<p5 | null>(null);

  $effect(() => {
    void redrawKey;
    instance?.redraw();
  });
</script>

<figure class="study">
  <div class="canvas" aria-hidden="true">
    <Sketch {sketch} {animate} bind:instance />
  </div>
  <figcaption>
    <h3>{title}</h3>
    {@render description()}
    {#if controls}<div class="controls">{@render controls()}</div>{/if}
  </figcaption>
</figure>

<style>
  .study {
    margin: 0 0 3rem;
    max-width: 38rem;
  }

  .canvas {
    border: 1px solid var(--ink);
    line-height: 0;
  }

  /* p5 sets pixel sizes inline; scale the small buffer up with hard edges. */
  .canvas :global(canvas) {
    width: 100% !important;
    height: auto !important;
    image-rendering: pixelated;
  }

  figcaption {
    margin-top: 0.75rem;
  }

  h3 {
    font-size: 1.1rem;
    margin: 0 0 0.35rem;
  }

  figcaption :global(p) {
    margin: 0 0 0.75rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
  }
</style>
