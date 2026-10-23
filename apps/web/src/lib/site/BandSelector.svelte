<script lang="ts">
  import { onMount } from "svelte";
  import { BANDS, bandHref, currentBand, type Band } from "./bands.ts";

  interface Props {
    /** The dial position to carry across domains, like "#92.3". */
    fragment?: string;
  }

  let { fragment = "" }: Props = $props();
  let current = $state<Band>("io");

  onMount(() => {
    current = currentBand(location.hostname);
  });
</script>

<nav class="bands" aria-label="Bands">
  <ul>
    {#each BANDS as band (band.band)}
      <li>
        <a
          href={bandHref(band, fragment)}
          class:current={band.band === current}
          class:unlit={!band.live}
          aria-current={band.band === current ? "page" : undefined}
          title={band.live ? band.domain : `${band.domain}: not yet`}
        >
          {band.band}{#if !band.live}<span class="visually-hidden">, not yet</span>{/if}
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  ul {
    display: flex;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a {
    display: block;
    padding: 0.1rem 0.45rem;
    border: 1px solid var(--ink);
    font-family: var(--mono);
    font-size: 0.8rem;
    text-decoration: none;
  }

  /* A pressed button on a receiver: the current band is inverted. */
  a.current {
    background: var(--ink);
    color: var(--paper);
  }

  a.unlit {
    border-style: dotted;
    opacity: 0.55;
  }
</style>
