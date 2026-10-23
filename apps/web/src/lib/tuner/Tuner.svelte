<script lang="ts">
  import { barAt, msPerBar } from "@datspace/clock";
  import type { ClockConfig } from "@datspace/contract";
  import { Canvas } from "@threlte/core";
  import { WebGLRenderer } from "three";
  import { onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import { goto } from "$app/navigation";
  import BandSelector from "../site/BandSelector.svelte";
  import Field from "./Field.svelte";
  import { glyphBits, stationHue } from "./glyph.ts";
  import {
    DIAL_MAX,
    DIAL_MIN,
    STEP,
    type DialStation,
    formatFragment,
    formatFrequency,
    isLocked,
    nearestLive,
    parseFragment,
    sigma as sigmaAt,
    snrDb,
    tune,
    valueText,
  } from "./model.ts";
  import type { Sound } from "./sound.ts";
  import { readTape, recordLock } from "./tape.ts";

  interface Props {
    stations: DialStation[];
    clock: ClockConfig;
  }

  let { stations, clock }: Props = $props();

  const GLYPH_SIZE = 24;
  const WHITE: [number, number, number] = [1, 1, 1];
  /** Dragging across the full width of the screen moves half the dial. */
  const MHZ_PER_SCREEN = (DIAL_MAX - DIAL_MIN) / 2;
  /** Wheel and trackpad pixels per 0.1 MHz step. */
  const WHEEL_PX_PER_STEP = 30;

  let frequency = $state(DIAL_MIN);
  let touched = $state(false);
  let webgl = $state<"unknown" | "yes">("unknown");
  let panelHeight = $state(0);
  let headerHeight = $state(0);
  let now = $state<number | null>(null);
  let tapeLength = $state(0);
  let soundOn = $state(false);
  let sound: Sound | null = null;

  const nearest = $derived(nearestLive(stations, frequency));
  const sigma = $derived(nearest ? sigmaAt(nearest.distance) : 1);
  const locked = $derived(nearest && isLocked(sigma) ? nearest.station : null);
  const snr = $derived(snrDb(sigma));
  const glyph = $derived(
    nearest ? glyphBits(nearest.station.glyphSeed, GLYPH_SIZE) : new Uint8Array(GLYPH_SIZE * GLYPH_SIZE),
  );
  const ink = $derived(locked ? stationHue(locked.glyphSeed) : WHITE);
  const bar = $derived(now === null ? null : barAt(now, clock.bpm, clock.beatsPerBar));
  const fragment = $derived(formatFragment(frequency));
  const position = (f: number) => ((f - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 100;

  const ticks = Array.from({ length: Math.round((DIAL_MAX - DIAL_MIN) / 0.5) + 1 }, (_, i) => DIAL_MIN + i * 0.5);
  const labels = ticks.filter((f) => Number.isInteger(f) && f % 2 === 0);

  function set(next: number) {
    const tuned = tune(next);
    if (tuned !== frequency) frequency = tuned;
    touched = true;
  }

  function open(station: DialStation) {
    void goto(`/s/${station.slug}`);
  }

  function onkey(event: KeyboardEvent): boolean {
    const moves: Record<string, () => number> = {
      ArrowLeft: () => frequency - STEP,
      ArrowDown: () => frequency - STEP,
      ArrowRight: () => frequency + STEP,
      ArrowUp: () => frequency + STEP,
      PageDown: () => frequency - 1,
      PageUp: () => frequency + 1,
      Home: () => DIAL_MIN,
      End: () => DIAL_MAX,
    };
    const move = moves[event.key];
    if (move) {
      set(move());
      return true;
    }
    if (event.key === "Enter" && locked) {
      open(locked);
      return true;
    }
    return false;
  }

  function onSliderKey(event: KeyboardEvent) {
    if (onkey(event)) event.preventDefault();
  }

  // Arrow keys tune from anywhere, as long as focus isn't somewhere that uses them.
  function onWindowKey(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    if (onkey(event)) event.preventDefault();
  }

  let dragX: number | null = null;
  let dragAccum = 0;

  function onpointerdown(event: PointerEvent) {
    if (event.button !== 0) return;
    // Drag only from the field itself; capturing the pointer elsewhere would swallow clicks on links and buttons.
    if (!(event.target as Element).closest(".field")) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragX = event.clientX;
    dragAccum = frequency;
  }

  function onpointermove(event: PointerEvent) {
    if (dragX === null) return;
    dragAccum += ((event.clientX - dragX) / window.innerWidth) * MHZ_PER_SCREEN;
    dragAccum = Math.min(DIAL_MAX, Math.max(DIAL_MIN, dragAccum));
    dragX = event.clientX;
    set(dragAccum);
  }

  function onpointerup() {
    dragX = null;
  }

  /** A click or drag on the scale jumps straight to that frequency. */
  function onScalePointer(event: PointerEvent) {
    if (event.type === "pointerdown") {
      if (event.button !== 0) return;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } else if (!(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) {
      return;
    }
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const t = (event.clientX - rect.left) / rect.width;
    set(DIAL_MIN + t * (DIAL_MAX - DIAL_MIN));
  }

  // Wheel listeners must be non-passive to stop the page from scrolling.
  function wheel(node: HTMLElement) {
    let accum = 0;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      accum += delta * scale;
      const steps = Math.trunc(accum / WHEEL_PX_PER_STEP);
      if (steps !== 0) {
        accum -= steps * WHEEL_PX_PER_STEP;
        set(frequency + steps * STEP);
      }
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }

  onMount(() => {
    const probe = document.createElement("canvas").getContext("webgl2");
    if (!probe) {
      // No WebGL: the index is the tuner's accessible twin.
      location.replace("/index/");
      return;
    }
    webgl = "yes";

    const fromHash = parseFragment(location.hash);
    if (fromHash !== null) {
      frequency = fromHash;
      touched = true;
    }
    const onhash = () => {
      const next = parseFragment(location.hash);
      if (next !== null && next !== frequency) frequency = next;
    };
    window.addEventListener("hashchange", onhash);
    tapeLength = readTape().length;

    // Silence sound while the tab is hidden.
    const onvisibility = () => sound?.setAudible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onvisibility);

    // The clock does the arithmetic locally; it only needs to wake once per bar.
    now = Date.now();
    const timer = setInterval(() => (now = Date.now()), msPerBar(clock.bpm, clock.beatsPerBar) / 4);

    return () => {
      window.removeEventListener("hashchange", onhash);
      document.removeEventListener("visibilitychange", onvisibility);
      clearInterval(timer);
      sound?.stop();
    };
  });

  // Every new lock goes on the tape.
  $effect(() => {
    if (!locked) return;
    tapeLength = recordLock({
      slug: locked.slug,
      title: locked.title,
      frequency: locked.frequency,
      at: Date.now(),
    }).length;
  });

  $effect(() => {
    sound?.update(frequency, sigma, nearest?.index ?? null);
  });

  async function toggleSound() {
    if (soundOn) {
      sound?.stop();
      sound = null;
      soundOn = false;
      return;
    }
    soundOn = true;
    const started = await (await import("./sound.ts")).startSound();
    if (!soundOn) return started.stop();
    sound = started;
    sound.update(frequency, sigma, nearest?.index ?? null);
  }

  // Carry the dial position in the fragment, without adding history entries.
  $effect(() => {
    if (!touched) return;
    const hash = formatFragment(frequency);
    const timeout = setTimeout(() => {
      if (location.hash !== hash) history.replaceState(history.state, "", hash);
    }, 150);
    return () => clearTimeout(timeout);
  });
</script>

<svelte:window onkeydown={onWindowKey} />

<div
  class="tuner"
  role="presentation"
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={onpointerup}
  {@attach wheel}
>
  <div class="field" aria-hidden="true">
    {#if webgl === "yes"}
      <Canvas
        renderMode="on-demand"
        createRenderer={(canvas) =>
          new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" })}
      >
        <Field
          {sigma}
          {glyph}
          glyphSize={GLYPH_SIZE}
          {ink}
          panel={panelHeight}
          header={headerHeight + 16}
          animate={!prefersReducedMotion.current}
          stillFrame={Math.round(frequency * 10)}
        />
      </Canvas>
    {/if}
  </div>

  <header class="top" bind:clientHeight={headerHeight}>
    <div class="plate left">
      <a class="wordmark" href="/">datspace</a>
      <BandSelector fragment={touched ? fragment : ""} />
    </div>
    <nav class="plate" aria-label="Site">
      <button type="button" class="sound" aria-pressed={soundOn} onclick={toggleSound}>Sound</button>
      <a href="/index/">Index</a>
      <a href="/about">About</a>
      <a href="/tape">Tape{#if tapeLength > 0}&nbsp;<span class="readout count">{tapeLength}</span>{/if}</a>
    </nav>
  </header>

  <section class="panel" bind:clientHeight={panelHeight} aria-label="Tuner">
    <div class="instruments">
      <p class="frequency readout" aria-hidden="true">
        {formatFrequency(frequency)}<span class="unit">MHz</span>
      </p>
      <dl class="meters readout">
        <div><dt>σ</dt><dd>{sigma.toFixed(2)}</dd></div>
        <div><dt>SNR</dt><dd>{snr >= 0 ? "+" : "−"}{Math.abs(snr).toFixed(1)} dB</dd></div>
        {#if bar !== null}
          <div title="Bars since January 1, 1973, at {clock.bpm} BPM">
            <dt>bar</dt><dd>{bar.toLocaleString("en-US")}</dd>
          </div>
        {/if}
      </dl>
    </div>

    <div class="station" aria-live="polite">
      {#if locked}
        <a class="title" href="/s/{locked.slug}">{locked.title}</a>
        <p class="summary">{locked.summary}</p>
        <p class="hint"><span class="fine">Press Enter to open.</span><span class="coarse">Tap the title to open.</span></p>
      {:else if !touched}
        <p class="hint">
          <span class="fine">Drag, scroll, or use the arrow keys to tune.</span>
          <span class="coarse">Drag across the screen to tune.</span>
        </p>
      {/if}
    </div>

    <div
      class="scale"
      role="slider"
      tabindex="0"
      aria-label="Frequency"
      aria-orientation="horizontal"
      aria-valuemin={DIAL_MIN}
      aria-valuemax={DIAL_MAX}
      aria-valuenow={frequency}
      aria-valuetext={valueText(frequency, locked)}
      onkeydown={onSliderKey}
      onpointerdown={onScalePointer}
      onpointermove={onScalePointer}
    >
      {#each ticks as f (f)}
        <span class="tick" class:major={Number.isInteger(f)} style:left="{position(f)}%"></span>
      {/each}
      {#each stations as station (station.slug)}
        <span
          class="marker"
          class:unlit={station.status === "unlit"}
          class:on={locked?.slug === station.slug}
          style:left="{position(station.frequency)}%"
        ></span>
      {/each}
      <span class="needle" style:left="{position(frequency)}%"></span>
      {#each labels as f (f)}
        <span class="label readout" class:minor={f % 4 !== 0} style:left="{position(f)}%">{f}</span>
      {/each}
    </div>
  </section>

  <noscript>
    <p class="plate noscript">The tuner needs JavaScript. <a href="/index/">Browse the index</a> instead.</p>
  </noscript>
</div>

<style>
  .tuner {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--paper);
    touch-action: none;
    user-select: none;
    cursor: ew-resize;
  }

  .field {
    position: absolute;
    inset: 0;
  }

  .plate {
    background: var(--paper);
    padding: 0.35rem 0.6rem;
  }

  .top {
    position: absolute;
    inset: 1rem 1rem auto;
    display: flex;
    justify-content: space-between;
    align-items: start;
    cursor: auto;
  }

  .wordmark {
    font-weight: 600;
    text-decoration: none;
    letter-spacing: -0.01em;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  nav {
    display: flex;
    gap: 1.25rem;
    align-items: center;
  }

  .sound {
    padding: 0.1rem 0.5rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }

  .sound[aria-pressed="true"] {
    background: var(--ink);
    color: var(--paper);
  }

  .count {
    font-size: 0.85em;
  }

  @media (max-width: 40rem) {
    .top {
      flex-direction: column;
      gap: 0.5rem;
    }

    .left {
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
    }

    nav {
      gap: 0.9rem;
    }

    .panel .meters {
      font-size: 0.8rem;
    }

    .panel .meters div {
      grid-template-columns: 2.75em auto;
    }
  }

  .panel {
    position: absolute;
    inset: auto 0 0;
    padding: 1.25rem clamp(1rem, 3vw, 2.5rem) 1.5rem;
    background: var(--paper);
    cursor: auto;
  }

  .instruments {
    display: flex;
    align-items: end;
    gap: clamp(1rem, 4vw, 3rem);
  }

  .frequency {
    margin: 0;
    font-size: clamp(4rem, 12vw, 8.5rem);
    line-height: 0.85;
    letter-spacing: -0.04em;
    font-weight: 500;
  }

  .unit {
    font-size: 0.18em;
    letter-spacing: 0;
    margin-left: 0.4em;
  }

  .meters {
    margin: 0 0 0.4rem;
    display: grid;
    gap: 0.15rem;
    font-size: clamp(0.95rem, 1.6vw, 1.25rem);
  }

  .meters div {
    display: grid;
    grid-template-columns: 3.5em auto;
    white-space: nowrap;
  }

  .meters dt,
  .meters dd {
    margin: 0;
  }

  .station {
    min-height: 5.5rem;
    margin: 1rem 0 1.25rem;
    max-width: 40rem;
  }

  .title {
    font-size: clamp(1.4rem, 2.6vw, 2rem);
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .summary {
    margin: 0.25rem 0 0;
  }

  .hint {
    margin: 0.25rem 0 0;
    opacity: 0.7;
  }

  .scale {
    position: relative;
    height: 3rem;
    cursor: pointer;
  }

  .scale:focus-visible {
    outline-offset: 6px;
  }

  .tick {
    position: absolute;
    top: 0.6rem;
    width: 1px;
    height: 0.5rem;
    background: var(--ink);
  }

  .tick.major {
    top: 0.3rem;
    height: 0.8rem;
  }

  .marker {
    position: absolute;
    top: 0;
    width: 7px;
    height: 7px;
    margin-left: -3px;
    border: 1px solid var(--ink);
  }

  .marker.on {
    background: var(--ink);
  }

  .marker.unlit {
    border-style: dotted;
    opacity: 0.5;
  }

  .needle {
    position: absolute;
    top: -0.5rem;
    width: 2px;
    margin-left: -1px;
    height: 2rem;
    background: var(--ink);
  }

  .label {
    position: absolute;
    top: 1.5rem;
    transform: translateX(-50%);
    font-size: 0.75rem;
  }

  @media (max-width: 40rem) {
    .label.minor {
      display: none;
    }
  }

  .coarse {
    display: none;
  }

  @media (pointer: coarse) {
    .fine {
      display: none;
    }

    .coarse {
      display: inline;
    }
  }

  .noscript {
    position: absolute;
    top: 40%;
    left: 1rem;
    right: 1rem;
    text-align: center;
  }
</style>
