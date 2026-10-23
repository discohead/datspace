<script lang="ts">
  import Header from "./Header.svelte";

  interface Props {
    title: string;
    description: string;
    html: string;
  }

  let { title, description, html }: Props = $props();
</script>

<svelte:head>
  <title>{title} · datspace</title>
  <meta name="description" content={description} />
</svelte:head>

<Header />

<main class="page">
  <h1>{title}</h1>
  <div class="prose">{@html html}</div>
</main>
