<script lang="ts">
  import { glyphBits, stationHue } from "../tuner/glyph.ts";

  interface Props {
    seed: string;
    size?: number;
  }

  let { seed, size = 24 }: Props = $props();

  // One rect per horizontal run of lit cells keeps the SVG small.
  const runs = $derived.by(() => {
    const bits = glyphBits(seed, size);
    const out: { x: number; y: number; w: number }[] = [];
    for (let y = 0; y < size; y++) {
      let start = -1;
      for (let x = 0; x <= size; x++) {
        const lit = x < size && bits[y * size + x] === 1;
        if (lit && start < 0) start = x;
        if (!lit && start >= 0) {
          out.push({ x: start, y, w: x - start });
          start = -1;
        }
      }
    }
    return out;
  });

  const color = $derived.by(() => {
    const [r, g, b] = stationHue(seed).map((c) => Math.round(c * 255));
    return `rgb(${r} ${g} ${b})`;
  });
</script>

<svg viewBox="0 0 {size} {size}" shape-rendering="crispEdges" aria-hidden="true" fill={color}>
  {#each runs as run (`${run.x},${run.y}`)}
    <rect x={run.x} y={run.y} width={run.w} height="1" />
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
