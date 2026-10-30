<script lang="ts">
  import {
    BANK,
    BANK_VERSION,
    SCALES,
    SYSTEMS,
    answerId,
    draw,
    localDecision,
    stationKey,
    type Answer,
    type Decided,
    type FallbackReason,
    type Question,
    type System,
  } from "@datspace/fm";
  import { onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import { replaceState } from "$app/navigation";
  import type { Broadcast } from "#lib/fm/engine.ts";
  import Scope from "#lib/fm/Scope.svelte";
  import { knot, type ScopeState } from "#lib/fm/scope.ts";
  import { position, station, type Station } from "#lib/fm/systems.ts";
  import Header from "#lib/site/Header.svelte";
  import Meta from "#lib/site/Meta.svelte";
  import { stationHue } from "#lib/tuner/glyph.ts";

  const FIRST_QUESTIONS = 3;
  const MAX_ANSWERS = 7;
  const LOCK_SIGMA = 0.12;
  /** The answers behind "skip the questions": a dance floor at 6 a.m., black rubber, four kicks forever. */
  const HOUSE: Answer[] = [
    { q: "q007", a: "a" },
    { q: "q008", a: "a" },
    { q: "q009", a: "a" },
  ];

  const NAMES: Record<System, string> = {
    sine: "Sine",
    pulse: "Pulse",
    grain: "Grain",
    drone: "Drone",
    fold: "Fold",
    bits: "Bits",
  };
  const FIGURES: Record<System, [number, number, number, number]> = {
    sine: [2, 3, 5, 0.1],
    pulse: [3, 4, 5, 0.3],
    grain: [5, 6, 7, 0.2],
    drone: [1, 1, 2, 0],
    fold: [1, 2, 3, 0.4],
    bits: [1, 3, 5, 0.9],
  };
  const REASONS: Record<FallbackReason, string> = {
    rate_limited: "this address asked too many times in the last minute",
    over_budget: "the network has used today's budget for it",
    unavailable: "it didn't answer",
  };

  let questions = $state<Question[]>([]);
  let answers = $state<Answer[]>([]);
  let decided = $state<Decided | null>(null);
  let deciding = $state(false);
  let playing = $state(false);
  let starting = $state(false);
  let failure = $state<string | null>(null);
  let now = $state<number | null>(null);
  let clockOffset = 0;
  let broadcast: Broadcast | null = null;
  let current: Station | null = null;
  let nodeBase = 1001;
  let copied = $state(false);

  const scopeState: ScopeState = $state({ left: null, right: null, figure: null, sigma: 1, ink: [1, 1, 1] });

  const asking = $derived(questions.find((q) => !answers.some((a) => a.q === q.id)) ?? null);
  const decision = $derived(decided?.decision ?? null);
  const locked = $derived(decision !== null && decision.sigma < LOCK_SIGMA);
  const ranked = $derived(
    decision ? (Object.entries(decision.systems) as [System, number][]).sort((a, b) => b[1] - a[1]) : [],
  );
  const where = $derived(decision && now !== null ? position(decision.bpm, now + clockOffset) : null);

  function decideUrl(): string {
    return location.hostname === "datspace.fm" ? "/decide" : "https://datspace.fm/decide";
  }

  function fragment(list: Answer[]): string {
    return list.map((a) => `${a.q}${a.a}`).join(".");
  }

  function parseFragment(hash: string): Answer[] | null {
    const parts = hash.replace(/^#/, "").split(".").filter(Boolean);
    if (parts.length === 0 || parts.length > MAX_ANSWERS) return null;
    const list: Answer[] = [];
    for (const part of parts) {
      const match = /^(q\d{3})([abcd])$/.exec(part);
      const q = match && BANK.find((x) => x.id === match[1]);
      if (!match || !q || "abcd".indexOf(match[2]!) >= q.answers.length || list.some((a) => a.q === q.id)) return null;
      list.push({ q: match[1]!, a: match[2] as Answer["a"] });
    }
    return list;
  }

  async function decide(list: Answer[]) {
    deciding = true;
    failure = null;
    const started = Date.now();
    let result: Decided;
    try {
      const res = await fetch(decideUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ v: BANK_VERSION, answers: list }),
      });
      if (!res.ok) throw new Error(String(res.status));
      result = (await res.json()) as Decided;
      clockOffset = result.serverTime - Date.now();
    } catch {
      // The station never waits on the network: the same seeded draw the Worker would make.
      result = {
        decision: localDecision(list),
        key: stationKey(list),
        source: "local",
        reason: "unavailable",
        cached: false,
        ms: Date.now() - started,
        serverTime: Date.now(),
      };
    }
    decided = result;
    deciding = false;
    replaceState(`#${fragment(list)}`, {});
    tuneScope(result);
    if (broadcast) {
      current = next(result);
      broadcast.tune(current);
    }
  }

  function next(result: Decided): Station {
    nodeBase += 2;
    return station(result.decision, result.key, { primary: nodeBase, second: nodeBase + 1 });
  }

  function tuneScope(result: Decided) {
    const [a, b, c, feedback] = FIGURES[result.decision.system];
    scopeState.figure = knot(a, b, c, feedback + result.decision.brightness * 0.3);
    scopeState.sigma = result.decision.sigma;
    scopeState.ink = result.decision.sigma < LOCK_SIGMA ? stationHue(result.key.padStart(64, "0")) : [1, 1, 1];
  }

  function answer(q: Question, index: number) {
    answers = [...answers, { q: q.id, a: answerId(index) }];
    if (!questions.some((x) => !answers.some((a) => a.q === x.id))) void decide(answers);
  }

  function another() {
    const asked = new Set(answers.map((a) => a.q));
    questions = [...questions, ...draw(1, Math.random, asked)];
  }

  function retune() {
    answers = [];
    questions = draw(FIRST_QUESTIONS);
  }

  function skip() {
    questions = HOUSE.map((a) => BANK.find((q) => q.id === a.q)!);
    answers = HOUSE;
    void decide(HOUSE);
  }

  async function play() {
    if (!decided || starting) return;
    starting = true;
    failure = null;
    try {
      const { tuneIn } = await import("#lib/fm/engine.ts");
      current = next(decided);
      broadcast = await tuneIn(current, clockOffset);
      scopeState.left = broadcast.scope.left;
      scopeState.right = broadcast.scope.right;
      playing = true;
    } catch (err) {
      failure = `The engine didn't start in this browser: ${(err as Error).message}`;
      broadcast = null;
    } finally {
      starting = false;
    }
  }

  async function stop() {
    const ending = broadcast;
    broadcast = null;
    playing = false;
    scopeState.left = null;
    scopeState.right = null;
    await ending?.stop();
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Clipboard access can be refused; the address bar has the same link.
    }
  }

  function onHashChange() {
    const list = parseFragment(location.hash);
    if (list && fragment(list) !== fragment(answers)) {
      questions = list.map((a) => BANK.find((q) => q.id === a.q)!);
      answers = list;
      void decide(list);
    }
  }

  onMount(() => {
    const list = parseFragment(location.hash);
    if (list) {
      questions = list.map((a) => BANK.find((q) => q.id === a.q)!);
      answers = list;
      void decide(list);
    } else {
      questions = draw(FIRST_QUESTIONS);
    }
    now = Date.now();
    const timer = setInterval(() => (now = Date.now()), 100);
    return () => {
      clearInterval(timer);
      void broadcast?.stop();
    };
  });

  const percent = (p: number) => `${Math.round(p * 100)}%`;
  const cost = (usd: number) => `$${usd.toFixed(7)}`;
</script>

<svelte:window onhashchange={onHashChange} />

<Meta
  title="datspace.fm"
  description="A station that plays in your browser, in time with a clock that started in 1973. Three questions decide what it plays."
  path="/"
  origin="https://datspace.fm"
/>

<Header />

<main class="page fm">
  <h1>datspace.fm</h1>
  <p class="lede">
    A station that plays in your browser, in time with a clock that started in 1973. Three questions decide what it
    plays.
  </p>

  <section class="receiver" aria-label="Receiver">
    <div class="screen">
      <Scope signal={scopeState} animate={!prefersReducedMotion.current} />
      <p class="caption">
        {#if playing}
          The scope is the sound before the room: the left channel moves the beam across, the right moves it up.
        {:else if decision}
          The station's curves, before it plays: a {FIGURES[decision.system].slice(0, 3).join(":")} Lissajous knot.
        {:else}
          Static, until the station is decided.
        {/if}
      </p>
    </div>

    <div class="panel">
      <dl class="readouts readout" aria-label="Readouts">
        <div><dt>bar</dt><dd>{where ? where.bar.toLocaleString("en-US") : "—"}</dd></div>
        <div><dt>beat</dt><dd>{where ? where.beat : "—"}</dd></div>
        <div><dt>bpm</dt><dd>{decision ? decision.bpm : "—"}</dd></div>
        <div><dt>σ</dt><dd>{decision ? decision.sigma.toFixed(2) : "1.00"}</dd></div>
      </dl>

      {#if asking && !deciding}
        <fieldset class="question">
          <legend>
            <span class="readout count">{answers.length + 1} / {questions.length}</span>
            {asking.prompt}
          </legend>
          <div class="answers">
            {#each asking.answers as text, i (text)}
              <button type="button" onclick={() => answer(asking, i)}>{text}</button>
            {/each}
          </div>
        </fieldset>
        {#if !decided && answers.length === 0}
          <p class="aside">
            <button type="button" class="link" onclick={skip}>Skip the questions</button> and play the house station.
          </p>
        {/if}
      {:else if deciding}
        <p class="status" aria-live="polite">Asking Clef Flash.</p>
      {/if}

      {#if decided && decision && !asking && !deciding}
        <div class="station" aria-live="polite">
          <p class="system">
            <span class="name">{NAMES[decision.system]}</span>
            <span class="readout scale">{decision.scale}</span>
            {#if locked}<span class="readout lock">locked</span>{/if}
          </p>
          <p class="said">{SYSTEMS[decision.system]}</p>
          <p class="said small">{SCALES[decision.scale]}</p>

          <ul class="odds" aria-label="Probability of each system">
            {#each ranked as [name, p] (name)}
              <li class:won={name === decision.system}>
                <span class="label">{NAMES[name]}</span>
                <span class="bar" style:width={percent(p)}></span>
                <span class="readout">{percent(p)}</span>
              </li>
            {/each}
          </ul>

          <p class="facts">
            {#if decided.source === "clef-flash" && decided.cached}
              Decided by Clef Flash and served from the cache, so it cost nothing this time{#if decided.costUsd !== undefined}; the first answer cost {cost(decided.costUsd)}{/if}.
            {:else if decided.source === "clef-flash"}
              Decided by Clef Flash in {decided.ms} ms{#if decided.inputTokens !== undefined}: {decided.inputTokens.toLocaleString("en-US")} input tokens, {cost(decided.costUsd ?? 0)}{/if}.
            {:else}
              Decided here, by a seeded draw from your answers, because Clef Flash wasn't asked: {REASONS[decided.reason ?? "unavailable"]}.
            {/if}
            {#if locked}
              The winner left the runner-up under 12% of its probability, so the station locked.
            {:else if ranked[1]}
              σ is {ranked[1][1] > 0 ? `${NAMES[ranked[1][0]]}'s ${percent(ranked[1][1])} over ${NAMES[ranked[0]![0]]}'s ${percent(ranked[0]![1])}` : "1"}{#if decision.sigma > 0.55}, close enough that both play{/if}.
            {/if}
          </p>

          <div class="controls">
            {#if playing}
              <button type="button" class="primary" onclick={stop}>Stop</button>
            {:else}
              <button type="button" class="primary" onclick={play} disabled={starting}>{starting ? "Tuning in" : "Play"}</button>
            {/if}
            {#if answers.length < MAX_ANSWERS}
              <button type="button" onclick={another}>Answer another</button>
            {/if}
            <button type="button" onclick={retune}>New questions</button>
            <button type="button" onclick={share}>{copied ? "Copied" : "Copy this station's link"}</button>
          </div>
          {#if failure}<p class="failure" role="alert">{failure}</p>{/if}
        </div>
      {/if}
    </div>
  </section>

  <section class="prose" aria-labelledby="decides">
    <h2 id="decides">How it decides</h2>
    <p>
      The questions come from a bank of {BANK.length} in the repository, three at a time. Your answers leave this page as
      ids. The Worker looks up their text and asks Clef Flash, a decision model on Cloudflare Workers AI, seven typed
      questions: which of six systems, which of seven scales, and five ratings from tempo to motion. Clef returns a
      probability for every option. It writes no text, and the text it reads is all in the repository.
    </p>
    <p>
      The station plays the winning system. When the runner-up gets more than half the winner's probability, it plays
      too, quieter. σ is the runner-up's probability divided by the winner's, on the tuner's scale: under 0.12 the
      station locks and takes its color, and above that you hear static in proportion.
    </p>
    <p>
      The same answers always get the same decision, so each one is cached by a hash of the answers, and asking again is
      free. A decision reads about 1,300 tokens, at $0.038 a million. Each address can ask twenty times a minute, and
      the network asks at most 20,000 times a day. When it can't ask, a seeded draw from your answers decides, and the
      station says so. Nothing on datspace.ai calls a model. This page is the one exception on the network.
    </p>

    <h2>What you're hearing</h2>
    <p>
      SuperCollider's synthesis server, scsynth, compiled to WebAssembly by
      <a href="https://github.com/samaaron/supersonic" rel="noopener">SuperSonic</a> and running in an AudioWorklet in
      this tab. Ten SynthDefs, written in SuperCollider, make every sound. The patterns come from
      <a href="https://github.com/discohead/curves-for-processing" rel="noopener">Curves</a>, which this is the sixth
      port of, and from the Numeric Repetitor's rhythms as Curves implements them.
    </p>
    <p>
      Every event is a function of your answers, the bar, and the step. Bars count from January 1, 1973, at the
      station's tempo, and every tempo is a simple ratio of the network clock's 120 BPM, so anyone with the same answers
      hears the same bar at the same moment. Send someone this station's link and you're listening together.
    </p>
    <p>
      The six systems take after what they borrow from: Ryoji Ikeda's test tones (Sine), Mark Fell's shifting patterns
      (Pulse), Curtis Roads' grains (Grain), La Monte Young's just-intonation drones (Drone), hypnotic techno (Fold), and
      the one-bit music of early home computers (Bits).
    </p>

    <h2>Source</h2>
    <p>
      This page, its SynthDefs, and the question bank are at
      <a href="https://github.com/discohead/datspace" rel="noopener">github.com/discohead/datspace</a>, in
      <code>apps/web/src/lib/fm</code> and <code>packages/fm</code>. SuperSonic is by Sam Aaron and licensed
      AGPL-3.0-or-later; because this page includes it, the page's source is offered under the AGPL too.
    </p>
  </section>
</main>

<style>
  .receiver {
    display: grid;
    grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
    margin: 0 0 3.5rem;
  }

  @media (max-width: 44rem) {
    .receiver {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .caption {
    margin: 0.6rem 0 0;
    font-size: 0.85rem;
  }

  .readouts {
    display: grid;
    grid-template-columns: repeat(4, auto);
    justify-content: start;
    gap: 0 1.5rem;
    margin: 0 0 1.5rem;
  }

  .readouts dt {
    font-size: 0.8rem;
  }

  .readouts dd {
    margin: 0;
    font-size: 1.05rem;
  }

  .question {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .question legend {
    padding: 0;
    font-size: 1.25rem;
    line-height: 1.35;
    margin-bottom: 1rem;
  }

  .count {
    display: block;
    font-size: 0.8rem;
    margin-bottom: 0.35rem;
  }

  .answers {
    display: grid;
    gap: 0.5rem;
  }

  button {
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  button:hover,
  button:active {
    background: var(--ink);
    color: var(--paper);
  }

  button:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  button.link {
    padding: 0;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  button.link:hover {
    background: none;
    color: var(--ink);
  }

  .aside,
  .status {
    margin: 1rem 0 0;
    font-size: 0.95rem;
  }

  .system {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem 0.9rem;
    margin: 0 0 0.75rem;
  }

  .name {
    font-size: 2rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .scale,
  .lock {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .lock {
    padding: 0 0.35rem;
    background: var(--ink);
    color: var(--paper);
  }

  .said {
    margin: 0 0 0.5rem;
  }

  .small {
    font-size: 0.9rem;
  }

  .odds {
    list-style: none;
    margin: 1.25rem 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
    max-width: 24rem;
  }

  .odds li {
    display: grid;
    grid-template-columns: 4rem 1fr 2.75rem;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
  }

  .odds .bar {
    display: block;
    height: 0.55rem;
    background: var(--ink);
    min-width: 1px;
    justify-self: start;
  }

  .odds li:not(.won) .bar {
    background: repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 3px);
  }

  .odds .readout {
    text-align: right;
  }

  .facts {
    font-size: 0.9rem;
    margin: 0 0 1.25rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .primary {
    min-width: 6rem;
    text-align: center;
    font-weight: 600;
  }

  .failure {
    margin-top: 1rem;
  }

  .prose code {
    font-family: var(--mono);
    font-size: 0.9em;
  }
</style>
