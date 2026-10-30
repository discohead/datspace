<script lang="ts">
  interface Props {
    bits: Uint8Array;
    /** White on black, or the negative while the sleeve plays. */
    negative?: boolean;
    /** The row being read, drawn inverted, or null for none. */
    row?: number | null;
    size?: number;
  }

  let { bits, negative = false, row = null, size = 24 }: Props = $props();

  /** Cells of bare sleeve around the glyph. */
  const MARGIN = 2;
  const box = $derived(`${-MARGIN} ${-MARGIN} ${size + 2 * MARGIN} ${size + 2 * MARGIN}`);

  // One rect per horizontal run of lit cells, as in Glyph.svelte.
  const runs = $derived.by(() => {
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

  const reading = $derived(row === null ? [] : runs.filter((run) => run.y === row));
</script>

<svg class:negative viewBox={box} shape-rendering="crispEdges" aria-hidden="true">
  <g class="ink">
    {#each runs as run (`${run.x},${run.y}`)}
      <rect x={run.x} y={run.y} width={run.w} height="1" />
    {/each}
  </g>
  {#if row !== null}
    <rect class="ink" x="0" y={row} width={size} height="1" />
    <g class="ground">
      {#each reading as run (run.x)}
        <rect x={run.x} y={row} width={run.w} height="1" />
      {/each}
    </g>
  {/if}
</svg>

<style>
  /* The ground is the SVG's own background, so no sliver of page shows at a fractional edge. */
  svg {
    display: block;
    width: 100%;
    height: auto;
    border: 1px solid var(--ink);
    background: var(--paper);
  }

  .ground {
    fill: var(--paper);
  }

  .ink {
    fill: var(--ink);
  }

  .negative {
    background: var(--ink);
  }

  .negative .ground {
    fill: var(--ink);
  }

  .negative .ink {
    fill: var(--paper);
  }
</style>
