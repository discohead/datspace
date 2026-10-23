<script lang="ts">
  import MarkdownPage from "#lib/site/MarkdownPage.svelte";

  let { data } = $props();
</script>

<MarkdownPage title={data.title} description={data.description} html={data.html} path="/about" />
