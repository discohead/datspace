<script lang="ts">
  // A stub until phase 03 designs the station page and renders the markdown body.
  let { data } = $props();
  const work = $derived(data.work);
  const beats = $derived([
    ["Question", work.question],
    ["Prototype", work.prototype],
    ["Finding", work.finding],
    ["Future", work.future],
  ] as const);
</script>

<svelte:head>
  <title>{work.title} · datspace</title>
  <meta name="description" content={work.summary} />
</svelte:head>

<main class="page">
  <p><a href="/#{work.frequency.toFixed(1)}">Back to the tuner</a></p>
  <h1>{work.title}</h1>
  <p class="readout">{work.frequency.toFixed(1)} MHz, {work.domain}</p>
  <p>{work.summary}</p>
  {#each beats as [heading, text] (heading)}
    <h2>{heading}</h2>
    <p>{text}</p>
  {/each}
  {#each work.body.split(/\n{2,}/) as paragraph, i (i)}
    <p>{paragraph}</p>
  {/each}
  {#if work.links.length}
    <ul>
      {#each work.links as link (link.url)}
        <li><a href={link.url}>{link.label}</a></li>
      {/each}
    </ul>
  {/if}
</main>
