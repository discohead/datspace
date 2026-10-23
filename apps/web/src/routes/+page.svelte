<script lang="ts">
  import Tuner from "#lib/tuner/Tuner.svelte";

  let { data } = $props();
</script>

<svelte:head>
  <title>datspace</title>
  <meta
    name="description"
    content="Jared McFarland's portfolio as a radio dial: tune through 1-bit static until a piece of work resolves."
  />
</svelte:head>

<h1 class="visually-hidden">datspace</h1>
<Tuner stations={data.stations} clock={data.clock} />
