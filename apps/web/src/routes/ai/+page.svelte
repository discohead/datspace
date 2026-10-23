<script lang="ts">
  import { onMount } from "svelte";
  import Header from "#lib/site/Header.svelte";

  let { data } = $props();

  interface Event {
    seq: number;
    at: string;
    type: string;
    data: Record<string, string | number | boolean | null>;
    hash: string;
  }

  const FEED = "https://datspace.ai/live.json";
  const POLL_MS = 5000;
  const MCP_URL = "https://datspace.ai/mcp";

  let events = $state<Event[] | null>(null);
  let failed = $state(false);
  let updated = $state<Date | null>(null);

  async function poll() {
    try {
      const res = await fetch(FEED, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      events = ((await res.json()) as { events: Event[] }).events;
      updated = new Date();
      failed = false;
    } catch {
      failed = true;
    }
  }

  onMount(() => {
    void poll();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    return () => clearInterval(timer);
  });

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });

  function describe(event: Event): string {
    if (event.type === "agent.call") return `${event.data.tool}`;
    if (event.type === "deploy") return `deploy ${String(event.data.commit).slice(0, 7)}`;
    return event.type;
  }
</script>

<svelte:head>
  <title>datspace.ai</title>
  <meta
    name="description"
    content="Jared McFarland's portfolio as typed tools for agents: MCP, a JSON API, llms.txt, and a CLI, with a public feed of agent activity."
  />
</svelte:head>

<Header />

<main class="page">
  <h1>datspace.ai</h1>
  <p class="lede">
    The same work as datspace.io, as typed tools for agents. Agents bring their own models; nothing on this side
    calls one.
  </p>

  <section aria-labelledby="connect">
    <h2 id="connect">Connect</h2>
    <dl class="connect">
      <div>
        <dt>MCP</dt>
        <dd>
          <code>{MCP_URL}</code>
          <p>In Claude Code: <code>claude mcp add --transport http datspace {MCP_URL}</code></p>
        </dd>
      </div>
      <div>
        <dt>CLI</dt>
        <dd><code>npx datspace ls</code></dd>
      </div>
      <div>
        <dt>llms.txt</dt>
        <dd><a href="https://datspace.ai/llms.txt">datspace.ai/llms.txt</a></dd>
      </div>
      <div>
        <dt>JSON</dt>
        <dd><a href="https://datspace.ai/api/stations">datspace.ai/api/stations</a>, and one endpoint per tool</dd>
      </div>
    </dl>
  </section>

  <section aria-labelledby="tools">
    <h2 id="tools">Tools</h2>
    <ul class="tools">
      {#each data.tools as tool (tool.name)}
        <li><code>{tool.name}</code> {tool.description}</li>
      {/each}
    </ul>
  </section>

  <section aria-labelledby="live">
    <h2 id="live">Agent activity</h2>
    <p>
      Every tool call, as it happens: the time, the surface, and the tool. Never the arguments. Each row's hash covers
      the row before it.
    </p>
    {#if failed && events === null}
      <p>The feed didn't load. It retries every few seconds.</p>
    {:else if events === null}
      <p>Loading the feed.</p>
    {:else if events.length === 0}
      <p>No activity yet.</p>
    {:else}
      <table class="feed">
        <caption class="visually-hidden">Recent network events, newest first</caption>
        <thead>
          <tr><th scope="col">Time</th><th scope="col">Surface</th><th scope="col">Event</th><th scope="col">Hash</th></tr>
        </thead>
        <tbody>
          {#each events as event (event.seq)}
            <tr>
              <td class="readout">{time(event.at)}</td>
              <td>{event.type === "agent.call" ? event.data.surface : "ci"}</td>
              <td><code>{describe(event)}</code></td>
              <td class="readout hash">{event.hash.slice(0, 8)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if updated}<p class="updated">Updated {updated.toLocaleTimeString()}.</p>{/if}
    {/if}
  </section>
</main>

<style>
  section {
    margin-top: 2.75rem;
  }

  h2 {
    font-size: 1.35rem;
    letter-spacing: -0.015em;
    margin: 0 0 1rem;
  }

  code {
    font-family: var(--mono);
    font-size: 0.9em;
    overflow-wrap: anywhere;
  }

  .connect {
    margin: 0;
    display: grid;
    gap: 1rem;
  }

  .connect div {
    display: grid;
    grid-template-columns: 6rem 1fr;
    gap: 1rem;
  }

  .connect dt {
    font-weight: 600;
  }

  .connect dd,
  .connect p {
    margin: 0;
  }

  .connect p {
    margin-top: 0.35rem;
  }

  @media (max-width: 40rem) {
    .connect div {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
  }

  .tools {
    padding-left: 1.1rem;
  }

  .tools li + li {
    margin-top: 0.4rem;
  }

  .feed {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .feed th {
    text-align: left;
    font-weight: 600;
    padding: 0 0.75rem 0.5rem 0;
  }

  .feed td {
    padding: 0.45rem 0.75rem 0.45rem 0;
    border-top: 1px solid var(--ink);
  }

  .hash {
    font-size: 0.85rem;
  }

  .updated {
    font-size: 0.85rem;
    opacity: 0.75;
  }
</style>
