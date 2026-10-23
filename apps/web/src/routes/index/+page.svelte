<script lang="ts">
  import Header from "#lib/site/Header.svelte";
  import Meta from "#lib/site/Meta.svelte";

  let { data } = $props();
</script>

<Meta title="Index · datspace" description="Every station on the datspace dial, in order of frequency." path="/index/" />

<Header />

<main class="page">
  <h1>Index</h1>
  <p class="lede">Every station on the dial, in order of frequency.</p>
  <ol class="stations">
    {#each data.stations as station (station.slug)}
      <li class:unlit={station.status === "unlit"}>
        <span class="readout">{station.frequency.toFixed(1)}</span>
        <span>
          <a href="/s/{station.slug}"><strong>{station.title}</strong></a>
          <span class="summary">{station.summary}</span>
        </span>
        <span class="readout domain">{station.domain}</span>
      </li>
    {/each}
  </ol>
</main>

<style>
  .stations {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    display: grid;
    grid-template-columns: 4.5rem 1fr auto;
    gap: 1rem;
    padding: 1rem 0;
    border-top: 1px solid var(--ink);
  }

  .summary {
    display: block;
  }

  .domain {
    font-size: 0.8rem;
  }

  .unlit {
    opacity: 0.5;
  }
</style>
