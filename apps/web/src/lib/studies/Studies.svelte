<script lang="ts">
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import { glyphBits, glyphSteps } from "../tuner/glyph.ts";
  import { denoise, grow, threshold } from "./sketches.ts";
  import Study from "./Study.svelte";

  interface Props {
    /** Seeds of the live stations, so the studies use real glyphs. */
    seeds: { slug: string; title: string; glyphSeed: string }[];
  }

  let { seeds }: Props = $props();

  const N = 24;
  const animate = !prefersReducedMotion.current;

  // Denoising by hand: one station's glyph and a σ slider.
  // A page's seeds never change, so the sketches are built once from the first value.
  const first = untrack(() => seeds[0]!);
  const denoiseState = $state({ sigma: 0.6 });
  const denoiseSketch = denoise(denoiseState, glyphBits(first.glyphSeed, N), N, animate);

  // Growing a glyph: the stages, for a station or a fresh random seed.
  let seedIndex = $state(0);
  let randomSeed = $state<string | null>(null);
  const growState = $state({ steps: glyphSteps(first.glyphSeed, N) });
  const growing = $derived(randomSeed ? "a random seed" : seeds[seedIndex]!.title);
  const growSketch = grow(growState, N);

  function nextStation() {
    randomSeed = null;
    seedIndex = (seedIndex + 1) % seeds.length;
    growState.steps = glyphSteps(seeds[seedIndex]!.glyphSeed, N);
  }

  function randomGlyph() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    randomSeed = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    growState.steps = glyphSteps(randomSeed, N);
  }

  // Threshold: a gray ramp through one bit.
  const thresholdState = $state({ noise: 0.5 });
  const thresholdSketch = threshold(thresholdState, animate);
</script>

<section class="studies" aria-labelledby="studies">
  <h2 id="studies">Studies</h2>

  <Study title="Denoising by hand" sketch={denoiseSketch} redrawKey={denoiseState.sigma}>
    {#snippet description()}
      <p>
        The tuner's rule on {first.title}'s glyph: a pixel is on when s·(1 − σ) + n·1.6·σ &gt; 0, where s is the glyph
        (±1) and n is fresh noise each frame. Lower σ and the glyph comes through.
      </p>
    {/snippet}
    {#snippet controls()}
      <label for="sigma">σ</label>
      <input id="sigma" type="range" min="0.03" max="1" step="0.01" bind:value={denoiseState.sigma} />
      <output for="sigma" class="readout">{denoiseState.sigma.toFixed(2)}</output>
    {/snippet}
  </Study>

  <Study title="Growing a glyph" sketch={growSketch} redrawKey={growState.steps}>
    {#snippet description()}
      <p>
        Left to right, for {growing}: a seeded random field mirrored down the middle, then two passes of one rule. A
        cell stays lit when at least five of the nine cells around and including it are lit.
      </p>
    {/snippet}
    {#snippet controls()}
      <button type="button" onclick={nextStation}>Next station</button>
      <button type="button" onclick={randomGlyph}>Random seed</button>
    {/snippet}
  </Study>

  <Study title="Threshold" sketch={thresholdSketch} redrawKey={thresholdState.noise}>
    {#snippet description()}
      <p>
        A ramp from black to white through one bit. Without noise the threshold cuts it in half; with noise, the ramp
        survives on average. The tuner's static is the same trick run the other way.
      </p>
    {/snippet}
    {#snippet controls()}
      <label for="noise">Noise</label>
      <input id="noise" type="range" min="0" max="1" step="0.01" bind:value={thresholdState.noise} />
      <output for="noise" class="readout">{thresholdState.noise.toFixed(2)}</output>
    {/snippet}
  </Study>
</section>

<style>
  .studies {
    margin: 0 0 3rem;
  }

  h2 {
    font-size: 1.35rem;
    letter-spacing: -0.015em;
    margin: 0 0 1.25rem;
  }

  input[type="range"] {
    flex: 1 1 12rem;
    accent-color: var(--ink);
  }

  button {
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }

  button:active {
    background: var(--ink);
    color: var(--paper);
  }
</style>
