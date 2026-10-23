<script lang="ts">
  import Glyph from "#lib/site/Glyph.svelte";
  import Header from "#lib/site/Header.svelte";

  let { data } = $props();
  const work = $derived(data.work);
  const frequency = $derived(work.frequency.toFixed(1));
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

<Header />

<main class="page station">
  <div class="ident">
    <div class="glyph"><Glyph seed={work.glyphSeed} /></div>
    <p class="readout tuned">
      <span class="mhz">{frequency}</span> MHz<br />
      {work.domain}
    </p>
  </div>

  <h1>{work.title}</h1>
  <p class="lede">{work.summary}</p>

  <dl class="beats">
    {#each beats as [term, text] (term)}
      <div>
        <dt>{term}</dt>
        <dd>{text}</dd>
      </div>
    {/each}
  </dl>

  <div class="prose">{@html data.html}</div>

  <section class="links" aria-labelledby="links">
    <h2 id="links">Links</h2>
    <ul>
      {#each work.links as link (link.url)}
        <li><a href={link.url} rel="noopener">{link.label}</a></li>
      {/each}
      <li><a href="https://datspace.ai/api/work/{work.slug}">This work as structured data, on datspace.ai</a></li>
      <li><a href="/#{frequency}">Back to {frequency} on the tuner</a></li>
    </ul>
  </section>
</main>

<style>
  .ident {
    display: flex;
    align-items: end;
    gap: 1.25rem;
    margin: 1rem 0 2rem;
  }

  .glyph {
    width: 6rem;
  }

  .tuned {
    margin: 0;
    line-height: 1.3;
  }

  .mhz {
    font-size: 1.6rem;
    letter-spacing: -0.02em;
  }

  .beats {
    display: grid;
    gap: 1.25rem;
    margin: 0 0 3rem;
    padding: 1.5rem 0;
    border-block: 1px solid var(--ink);
    max-width: 38rem;
  }

  .beats div {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    gap: 1rem;
  }

  .beats dt {
    font-weight: 600;
  }

  .beats dd {
    margin: 0;
  }

  @media (max-width: 40rem) {
    .beats div {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
  }

  .links {
    margin-top: 3rem;
  }

  .links h2 {
    font-size: 1.1rem;
    margin: 0 0 0.75rem;
  }

  .links ul {
    margin: 0;
    padding-left: 1.1rem;
  }
</style>
