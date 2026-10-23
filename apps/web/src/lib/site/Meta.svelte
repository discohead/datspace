<script lang="ts">
  interface Props {
    title: string;
    description: string;
    /** Path on the site, for the canonical URL. */
    path: string;
    origin?: string;
  }

  let { title, description, path, origin = "https://datspace.io" }: Props = $props();
  const url = $derived(origin + path);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="datspace" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:image" content="https://datspace.io/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="A station's 1-bit glyph half-resolved out of static on the datspace tuner, at 89.6 MHz." />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
