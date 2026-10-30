<script lang="ts">
  import { onMount } from "svelte";
  import {
    duration,
    listTakes,
    openTakes,
    readParts,
    takeFileName,
    takeWav,
    waveform,
    type StoredTake,
  } from "#lib/patter/takes.ts";
  import Header from "#lib/site/Header.svelte";
  import Meta from "#lib/site/Meta.svelte";

  const HOME = "https://datspace.fm/patter-takes";
  const COLUMNS = 120;

  type View =
    | { kind: "looking" }
    | { kind: "elsewhere" }
    | { kind: "none" }
    | { kind: "found"; takes: StoredTake[] }
    | { kind: "failed"; message: string };

  let view = $state<View>({ kind: "looking" });
  let db: IDBDatabase | null = null;
  let saving = $state<string | null>(null);
  let saved = $state<Set<string>>(new Set());
  let failure = $state<string | null>(null);

  const megabytes = (t: StoredTake) => ((t.frames * t.channels * 3) / 1_000_000).toFixed(1);
  const facts = (t: StoredTake) =>
    [
      duration(t.frames, t.sampleRate),
      t.channels === 2 ? "stereo" : `${t.channels} ch`,
      `${t.sampleRate / 1000} kHz`,
      ...(t.bars ? [`${t.bars} ${t.bars === 1 ? "bar" : "bars"} at ${t.bpm} BPM`] : []),
      `${megabytes(t)} MB`,
    ].join(" · ");
  const when = (t: StoredTake) =>
    new Date(t.created).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  async function save(take: StoredTake) {
    if (!db) return;
    saving = take.id;
    failure = null;
    try {
      const blob = takeWav(take, await readParts(db, take));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = takeFileName(take);
      document.body.append(link);
      link.click();
      link.remove();
      // Give the download a moment to start before the URL goes away.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      saved = new Set([...saved, take.id]);
    } catch (err) {
      failure = `${take.name} couldn't be read: ${(err as Error).message}`;
    } finally {
      saving = null;
    }
  }

  async function saveAll(takes: StoredTake[]) {
    for (const take of takes) {
      await save(take);
      // Browsers ask once before a page downloads several files; spacing them out keeps that to one question.
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  onMount(() => {
    const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.hostname !== "datspace.fm" && !local) {
      view = { kind: "elsewhere" };
      return;
    }
    void (async () => {
      try {
        db = await openTakes();
        const takes = db ? await listTakes(db) : [];
        view = takes.length > 0 ? { kind: "found", takes } : { kind: "none" };
      } catch (err) {
        view = { kind: "failed", message: (err as Error).message };
      }
    })();
    return () => db?.close();
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

<Meta
  title="patter's takes · datspace"
  description="Saves the recordings patter kept in this browser when it ran at datspace.fm, as 24-bit WAV files."
  path="/patter-takes"
  origin="https://datspace.fm"
/>

<Header />

<main class="page">
  <h1>patter's takes</h1>
  <p class="lede">
    Until October 30, 2026, patter ran at datspace.fm, and it kept its recordings in your browser under that address.
    They're still there. This page finds them and saves each one as the 24-bit WAV patter would have made.
  </p>
  <p>
    It only reads. Nothing is uploaded, and nothing is deleted; the takes stay in this browser until you clear its data
    for datspace.fm. patter itself is at <a href="https://datspace.studio">datspace.studio</a> now.
  </p>

  <section class="takes" aria-live="polite" aria-busy={view.kind === "looking"}>
    {#if view.kind === "looking"}
      <p>Looking in this browser.</p>
    {:else if view.kind === "elsewhere"}
      <p>
        Browsers show a site's storage only to that site, so patter's takes are visible only from datspace.fm. Open
        <a href={HOME}>{HOME.replace("https://", "")}</a> in the browser you recorded them in.
      </p>
    {:else if view.kind === "none"}
      <p>
        This browser has no patter takes for datspace.fm. If you recorded on another computer, or in another browser or
        profile, open this page there.
      </p>
    {:else if view.kind === "failed"}
      <p role="alert">The takes couldn't be read: {view.message}</p>
    {:else}
      <div class="all">
        <p class="readout">
          {view.takes.length}
          {view.takes.length === 1 ? "take" : "takes"}, {view.takes
            .reduce((sum, t) => sum + (t.frames * t.channels * 3) / 1_000_000, 0)
            .toFixed(1)} MB
        </p>
        {#if view.takes.length > 1}
          <button type="button" onclick={() => view.kind === "found" && saveAll(view.takes)} disabled={saving !== null}>
            Save all
          </button>
        {/if}
      </div>
      <ol>
        {#each view.takes as take (take.id)}
          {@const columns = waveform(take.peaks, COLUMNS)}
          <li>
            <svg
              class="wave"
              viewBox="0 0 {Math.max(1, columns.length)} 2"
              preserveAspectRatio="none"
              shape-rendering="crispEdges"
              aria-hidden="true"
            >
              {#each columns as [lo, hi], x (x)}
                <rect {x} y={1 - hi} width="1" height={Math.max(0.02, hi - lo)} />
              {/each}
            </svg>
            <div class="about">
              <p class="name">{take.name}</p>
              <p>
                {take.patch || "untitled patch"} · {take.kind} · {when(take)}
              </p>
              <p class="readout facts">{facts(take)}</p>
              {#if take.open}
                <p class="note">The page closed while this was recording; it saves everything that was stored.</p>
              {/if}
              {#if take.volatile}
                <p class="note">Part of this was never stored in the browser, so it may be shorter than it was.</p>
              {/if}
            </div>
            <button type="button" onclick={() => save(take)} disabled={saving !== null} aria-label="Save {take.name} as WAV">
              {saving === take.id ? "Saving" : saved.has(take.id) ? "Saved" : "Save WAV"}
            </button>
          </li>
        {/each}
      </ol>
      {#if failure}<p role="alert">{failure}</p>{/if}
    {/if}
  </section>
</main>

<style>
  .takes {
    margin-top: 2.5rem;
  }

  .all {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
  }

  .all p {
    margin: 0;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr) auto;
    gap: 1rem 1.25rem;
    align-items: center;
    padding: 1.1rem 0;
    border-top: 1px solid var(--ink);
  }

  @media (max-width: 40rem) {
    li {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .wave {
      grid-column: 1 / -1;
    }
  }

  .wave {
    display: block;
    width: 100%;
    height: 3rem;
    fill: var(--ink);
  }

  .about p {
    margin: 0;
  }

  .name {
    font-weight: 600;
  }

  .facts {
    font-size: 0.85rem;
    margin-top: 0.2rem;
  }

  .note {
    font-size: 0.85rem;
    margin-top: 0.35rem;
  }

  button {
    padding: 0.45rem 0.8rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
  }

  button:active:not(:disabled) {
    background: var(--ink);
    color: var(--paper);
  }

  /* Only where a pointer can hover: a phone keeps :hover on the last button tapped, so it would stay inverted. */
  @media (hover: hover) {
    button:hover:not(:disabled) {
      background: var(--ink);
      color: var(--paper);
    }
  }

  button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
</style>
