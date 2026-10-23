<script lang="ts">
  import { onMount } from "svelte";
  import Header from "#lib/site/Header.svelte";
  import Meta from "#lib/site/Meta.svelte";
  import { clearTape, readTape, type TapeEntry } from "#lib/tuner/tape.ts";

  let tape = $state<TapeEntry[]>([]);
  let ready = $state(false);

  onMount(() => {
    tape = readTape();
    ready = true;
  });

  const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const mailto = $derived.by(() => {
    const lines = tape.map((e) => `${e.frequency.toFixed(1)}  ${e.title}`);
    const body = lines.length ? `My tape from datspace:\n\n${lines.join("\n")}\n\n` : "";
    return `mailto:jared@datspace.io?subject=${encodeURIComponent("From datspace")}&body=${encodeURIComponent(body)}`;
  });

  function clear() {
    clearTape();
    tape = [];
  }
</script>

<Meta title="Tape · datspace" description="The stations you found on this visit, in order." path="/tape" />

<Header />

<main class="page">
  <h1>Your tape</h1>
  <p class="lede">
    The stations you found on this visit, in order. The list stays in this browser tab and is gone when you close it.
  </p>

  {#if ready && tape.length === 0}
    <p>Nothing on the tape yet. <a href="/">Tune in</a> and lock a station to record it.</p>
  {:else if tape.length > 0}
    <ol class="tape">
      {#each tape as entry, i (i)}
        <li>
          <span class="readout">{entry.frequency.toFixed(1)}</span>
          <a href="/s/{entry.slug}">{entry.title}</a>
          <span class="readout time">{time(entry.at)}</span>
        </li>
      {/each}
    </ol>
  {/if}

  <div class="actions">
    <a class="button" href={mailto}>Email Jared</a>
    {#if tape.length > 0}
      <button type="button" class="button" onclick={clear}>Clear the tape</button>
    {/if}
  </div>
</main>

<style>
  .tape {
    margin: 0 0 2rem;
    padding: 0;
    list-style: none;
    max-width: 38rem;
  }

  .tape li {
    display: grid;
    grid-template-columns: 4rem 1fr auto;
    gap: 1rem;
    padding: 0.6rem 0;
    border-top: 1px solid var(--ink);
  }

  .time {
    font-size: 0.85rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .button {
    display: inline-block;
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    text-decoration: none;
    cursor: pointer;
  }

  a.button {
    background: var(--ink);
    color: var(--paper);
  }
</style>
