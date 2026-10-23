<script lang="ts">
  import Meta from "#lib/site/Meta.svelte";
  import Tuner from "#lib/tuner/Tuner.svelte";

  let { data } = $props();
</script>

<Meta
  title="datspace"
  description="Jared McFarland's portfolio as a radio dial: tune through 1-bit static until a piece of work resolves."
  path="/"
/>
<svelte:head>
  <link rel="preload" as="image" href="/noise.png" />
</svelte:head>

<h1 class="visually-hidden">datspace</h1>
<Tuner stations={data.stations} clock={data.clock} />
