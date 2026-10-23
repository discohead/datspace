<script lang="ts">
  import Header from "./Header.svelte";
  import Meta from "./Meta.svelte";

  interface Props {
    title: string;
    description: string;
    html: string;
    path: string;
  }

  let { title, description, html, path }: Props = $props();
</script>

<Meta title="{title} · datspace" {description} {path} />

<Header />

<main class="page">
  <h1>{title}</h1>
  <div class="prose">{@html html}</div>
</main>
