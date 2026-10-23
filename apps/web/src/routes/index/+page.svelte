<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Index · datspace</title>
  <meta name="description" content="Every station on the datspace dial." />
</svelte:head>

<main class="page">
  <h1>Index</h1>
  <ol class="stations">
    {#each data.stations as station (station.slug)}
      <li class:unlit={station.status === "unlit"}>
        <span class="readout">{station.frequency.toFixed(1)}</span>
        <span>
          <strong>{station.title}</strong>
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
    margin: 2rem 0 0;
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
