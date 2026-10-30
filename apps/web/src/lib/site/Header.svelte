<script lang="ts">
  import { onMount } from "svelte";
  import BandSelector from "./BandSelector.svelte";
  import { dialHref } from "./bands.ts";

  // The wordmark goes to the dial, which on a band's own domain is another site.
  let home = $state("/");
  onMount(() => {
    home = dialHref(location.hostname);
  });
</script>

<header class="site">
  <a class="wordmark" href={home}>datspace</a>
  <BandSelector />
  <nav aria-label="Site">
    <a href="/index/">Index</a>
    <a href="/about">About</a>
    <a href="/colophon">Colophon</a>
    <a href="/tape">Tape</a>
  </nav>
</header>

<style>
  .site {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.5rem;
    max-width: 44rem;
    margin: 0 auto;
    padding: 1.25rem 1.5rem 0;
  }

  .wordmark {
    font-weight: 600;
    text-decoration: none;
    letter-spacing: -0.01em;
  }

  nav {
    display: flex;
    gap: 1rem;
    margin-left: auto;
  }

  @media (max-width: 40rem) {
    nav {
      margin-left: 0;
      width: 100%;
    }
  }
</style>
