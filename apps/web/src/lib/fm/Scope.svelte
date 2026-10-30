<script lang="ts">
  import { P5Canvas } from "svelte-p5";
  import { scope, type ScopeState } from "./scope.ts";

  interface Props {
    state: ScopeState;
    animate: boolean;
  }

  let { state, animate }: Props = $props();
  const SIZE = 192;
  // The sketch reads `state` on every frame; it's built once and never rebuilt.
  // svelte-ignore state_referenced_locally
  const sketch = scope(state, SIZE, animate);
</script>

<div class="scope" aria-hidden="true">
  <P5Canvas {sketch} style="display: block; width: 100%;" />
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
