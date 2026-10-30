<script lang="ts">
  import { onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import type { Player } from "#lib/music/player.ts";
  import { keyName, noteName, readScore } from "#lib/music/score.ts";
  import Sleeve from "#lib/music/Sleeve.svelte";
  import Header from "#lib/site/Header.svelte";
  import Meta from "#lib/site/Meta.svelte";
  import { glyphBits } from "#lib/tuner/glyph.ts";

  let { data } = $props();

  const sleeves = $derived(
    data.sleeves.map((sleeve) => {
      const bits = glyphBits(sleeve.seed);
      return { ...sleeve, bits, score: readScore(sleeve.seed, bits) };
    }),
  );

  /** The sleeve that's playing, or waiting on Tone.js to play. */
  let playing = $state<number | null>(null);
  /** The row it's reading. */
  let step = $state<number | null>(null);
  let failure = $state<string | null>(null);
  let player: Player | null = null;
  let starting: Promise<Player> | null = null;

  const animate = $derived(!prefersReducedMotion.current);
  const current = $derived(playing === null ? null : sleeves[playing]!);
  const sounding = $derived(
    current && step !== null ? current.score.steps[step]!.map((note) => noteName(note.midi)).join(" ") || "rest" : "",
  );

  async function press(index: number) {
    if (playing === index) return stop();
    playing = index;
    step = null;
    failure = null;
    try {
      // Tone.js loads on the first press, never before.
      starting ??= import("#lib/music/player.ts").then(({ startPlayer }) => startPlayer());
      player = await starting;
    } catch (err) {
      starting = null;
      if (playing === index) playing = null;
      failure = `Sound didn't start in this browser: ${(err as Error).message}`;
      return;
    }
    // Stopped, or another sleeve pressed, while Tone.js loaded.
    if (playing !== index) return;
    player.play(sleeves[index]!.score, (row) => {
      if (playing === index) step = row;
    });
  }

  function stop() {
    playing = null;
    step = null;
    player?.stop();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && playing !== null) stop();
  }

  onMount(() => () => {
    playing = null;
    void starting?.then(
      (started) => started.dispose(),
      () => {},
    );
  });

  const pad = (n: number) => String(n).padStart(2, "0");
</script>

<svelte:window onkeydown={onKeydown} />

<Meta
  title="datspace.music"
  description="Jared McFarland's catalog, DSM001 to DSM012, with nothing pressed yet. Until something is, each one-bit sleeve plays its own picture."
  path="/"
  origin="https://datspace.music"
/>

<Header />

<main class="page">
  <h1>datspace.music</h1>
  <p class="lede">
    A catalog, DSM001 to DSM012, with nothing pressed yet. Until something is, each sleeve plays its own picture.
  </p>

  <section class="catalog" aria-label="Catalog">
    <!-- The same height whatever is playing, so the wall below never moves. -->
    <div class="deck">
      <p class="now" aria-live="polite">
        {#if current}
          <span class="readout">{current.number}</span>
          <span class="readout">{keyName(current.score)}</span>
        {:else}
          Press a sleeve to play it.
        {/if}
      </p>
      <p class="detail" aria-hidden={current ? true : undefined}>
        {#if current}
          <span class="readout">{current.score.bpm} BPM</span>
          {#if animate}
            <span class="readout">step {step === null ? "--" : pad(step + 1)}/{current.score.steps.length}</span>
            <span class="readout">{sounding}</span>
          {/if}
        {:else}
          Press it again, or Escape, to stop.
        {/if}
      </p>
    </div>
    {#if failure}<p class="failure" role="alert">{failure}</p>{/if}

    <ol class="wall">
      {#each sleeves as sleeve, i (sleeve.number)}
        <li>
          <button
            type="button"
            class="sleeve"
            aria-pressed={playing === i}
            aria-label="{sleeve.number}, {sleeve.status}. Play its sleeve."
            onclick={() => press(i)}
          >
            <Sleeve bits={sleeve.bits} negative={playing === i} row={playing === i && animate ? step : null} />
            <span class="label">
              <span class="readout number">{sleeve.number}</span>
              <span>{sleeve.status}</span>
            </span>
          </button>
        </li>
      {/each}
    </ol>
  </section>

  <section class="prose" aria-labelledby="how">
    <h2 id="how">How a sleeve plays</h2>
    <p>
      Each sleeve is a glyph grown from the SHA-256 of its catalog number, the same way every station on the dial gets
      one. The same hash picks a scale, a key, and a tempo.
    </p>
    <p>
      Pressing a sleeve reads its glyph like a player-piano roll. Each row is a step, top to bottom, an eighth note
      long; twenty-four rows make three bars of 4/4, and then the roll loops. The twelve cells across the left half of a
      row are twelve notes of the scale, lowest at the left edge, and the right half, a mirror image, stays silent. A
      note sounds only where a run of lit cells begins, and a wider run plays it louder.
    </p>
    <p>
      Each note is a sine with a moment of FM at the start, through a little reverb, in Tone.js, which loads when you
      press the first sleeve and not before.
    </p>

    <h2 id="next">What goes here</h2>
    <p>
      Records, DJ sets, and the patches behind them, one catalog number each. When something is pressed, its sleeve
      plays that instead.
    </p>
    <p>
      From 2006 to 2010 I was a DJ and producer in Los Angeles, with residencies around the city and a few releases.
      Then software became the day job, and the next releases have been a long time coming. These are their numbers.
    </p>

    <h2 id="elsewhere">Elsewhere</h2>
    <p>
      <a href="https://datspace.fm">datspace.fm</a> is what's playing now: a generative station, live in your browser.
      <a href="https://datspace.studio">datspace.studio</a> is where things get made.
    </p>
  </section>
</main>

<style>
  .catalog {
    margin: 0 0 3rem;
  }

  /* Held at the top of the window while the wall scrolls under it, so the readout stays in view on a phone. */
  .deck {
    position: sticky;
    top: 0;
    z-index: 1;
    margin: 0 0 1.75rem;
    padding: 0.6rem 0;
    border-top: 1px solid var(--ink);
    border-bottom: 1px solid var(--ink);
    background: var(--paper);
  }

  .now,
  .detail {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1rem;
    margin: 0;
  }

  .detail {
    font-size: 0.85rem;
  }

  /* One line on a wide screen, two on a phone: either way, the same height for every state. */
  @media (min-width: 40rem) {
    .deck {
      display: flex;
      align-items: baseline;
      gap: 1rem;
    }
  }

  .failure {
    margin: -0.75rem 0 1.75rem;
  }

  .wall {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.75rem 1.25rem;
  }

  @media (max-width: 40rem) {
    .wall {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 28rem) {
    .wall {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem 1rem;
    }
  }

  .sleeve {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    /* Keyboard focus scrolls a sleeve clear of the deck. */
    scroll-margin-top: 6rem;
  }

  .label {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0 0.5rem;
    margin-top: 0.5rem;
    font-size: 0.8rem;
  }

  @media (hover: hover) {
    .sleeve:hover .number {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  }
</style>
