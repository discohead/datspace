<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>datspace</title>
  <meta name="description" content="A tuner for people and an actor network for agents." />
</svelte:head>

<main class="page">
  <h1>datspace</h1>
  <p>The tuner arrives in phase 02. Until then, {data.stations} stations are on the <a href="/index/">index</a>.</p>
</main>
