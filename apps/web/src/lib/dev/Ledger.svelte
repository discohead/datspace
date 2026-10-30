<script lang="ts">
  import type { LedgerEvent } from "@datspace/contract";
  import { canonicalJson } from "@datspace/contract/hash";
  import { onMount } from "svelte";
  import { countTypes, ledgerUrl, readLog, verifyChain, type Verification } from "./chain.ts";
  import { jsonPieces } from "./wrap.ts";

  /** Rows shown. Every event is checked. */
  const SHOWN = 50;

  interface Result {
    events: LedgerEvent[];
    verification: Verification;
    readAt: Date;
  }

  let url = $state("");
  let running = $state(false);
  let read = $state(0);
  let failure = $state<string | null>(null);
  let result = $state.raw<Result | null>(null);

  const counts = $derived(result ? countTypes(result.events) : []);
  const newest = $derived(result ? [...result.events].sort((a, b) => b.seq - a.seq).slice(0, SHOWN) : []);

  const status = $derived.by(() => {
    if (running) return result ? "Reading the log again." : "Reading the log.";
    if (failure) return `The log didn't load. ${failure}`;
    if (!result) return "";
    const { checked, verified, broken } = result.verification;
    if (checked === 0) return "The log is empty.";
    if (broken) return `The chain breaks at seq ${broken.seq}. ${broken.reason}`;
    return `Verified: ${checked} events, seq 1 to ${verified?.to}. Every hash was recomputed in this browser.`;
  });

  async function verify() {
    if (running) return;
    running = true;
    failure = null;
    read = 0;
    try {
      const events = await readLog(url, { onPage: (n) => (read = n) });
      result = { events, verification: await verifyChain(events), readAt: new Date() };
    } catch (err) {
      failure = err instanceof Error ? err.message : String(err);
      result = null;
    } finally {
      running = false;
    }
  }

  onMount(() => {
    url = ledgerUrl(location.hostname);
    void verify();
  });

  /** "2026-10-29T20:07:55.104Z" as "2026-10-29 20:07:55". */
  const utc = (at: string) => at.slice(0, 19).replace("T", " ");
</script>

<div class="ledger">
  <div class="controls">
    <button type="button" onclick={verify} aria-disabled={running}>{result || failure ? "Verify again" : "Verify"}</button>
    <p class="status" role="status">{status}</p>
  </div>
  {#if running && read > 0}
    <p class="progress readout">{read} events read</p>
  {/if}
  <noscript>
    <p>Checking the chain needs JavaScript. The log is at <a href="https://datspace.ai/ledger.json">datspace.ai/ledger.json</a>.</p>
  </noscript>

  {#if result && result.verification.checked > 0}
    {@const { checked, verified, broken } = result.verification}
    <dl class="facts">
      <div>
        <dt>Events checked</dt>
        <dd class="readout">{checked}</dd>
      </div>
      <div>
        <dt>Verified</dt>
        <dd class="readout">{verified ? `seq ${verified.from} to ${verified.to}` : "none"}</dd>
      </div>
      <div>
        <dt>First break</dt>
        <dd>{broken ? `seq ${broken.seq}. ${broken.reason}` : "none"}</dd>
      </div>
      <div>
        <dt>Read from</dt>
        <dd><code>{url}</code> at {result.readAt.toLocaleTimeString()}</dd>
      </div>
    </dl>

    <table class="counts">
      <caption>Events by type</caption>
      <thead>
        <tr><th scope="col">Type</th><th scope="col">Events</th></tr>
      </thead>
      <tbody>
        {#each counts as { type, count } (type)}
          <tr><th scope="row"><code>{type}</code></th><td class="readout">{count}</td></tr>
        {/each}
      </tbody>
    </table>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex On a narrow screen the table scrolls sideways, and a keyboard can only scroll what it can focus. -->
    <div class="scroll" role="region" aria-labelledby="ledger-events" tabindex="0">
      <table class="events">
        <caption id="ledger-events">The newest {newest.length} events, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Seq</th>
            <th scope="col">Time (UTC)</th>
            <th scope="col">Type</th>
            <th scope="col">Data</th>
            <th scope="col">Hash</th>
          </tr>
        </thead>
        <tbody>
          {#each newest as event (event.seq)}
            <tr>
              <td class="readout">{event.seq}</td>
              <td class="readout">{utc(event.at)}</td>
              <td><code>{event.type}</code></td>
              <td>
                <code>{#each jsonPieces(canonicalJson(event.data)) as piece, k (k)}{#if k > 0}<wbr />{/if}{piece}{/each}</code>
              </td>
              <td class="readout">{event.hash.slice(0, 8)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.75rem 1rem;
  }

  button {
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }

  button:hover {
    background: var(--ink);
    color: var(--paper);
  }

  /* Like an unlit band: dotted while it works. */
  button[aria-disabled="true"] {
    border-style: dotted;
    background: var(--paper);
    color: var(--ink);
    cursor: progress;
  }

  .status,
  .progress {
    margin: 0;
  }

  .progress {
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }

  .facts {
    display: grid;
    gap: 0.4rem;
    margin: 1.5rem 0 0;
  }

  .facts div {
    display: grid;
    grid-template-columns: 9rem 1fr;
    gap: 1rem;
  }

  .facts dt {
    font-weight: 600;
  }

  .facts dd {
    margin: 0;
  }

  @media (max-width: 40rem) {
    .facts div {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }

  code {
    font-family: var(--mono);
    font-size: 0.9em;
    overflow-wrap: anywhere;
  }

  table {
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  caption {
    text-align: left;
    font-weight: 600;
    padding-bottom: 0.5rem;
  }

  th {
    text-align: left;
    font-weight: 600;
    padding: 0 1rem 0.4rem 0;
    vertical-align: top;
  }

  td,
  tbody th {
    padding: 0.4rem 1rem 0.4rem 0;
    border-top: 1px solid var(--ink);
    vertical-align: top;
  }

  tbody th {
    font-weight: 400;
  }

  .counts {
    margin-top: 2rem;
  }

  .scroll {
    margin-top: 2rem;
    overflow-x: auto;
  }

  /* Cells keep whole tokens; on a narrow screen the table scrolls inside its region instead of squeezing them. */
  .events {
    width: 100%;
    min-width: 40rem;
  }

  .events code {
    overflow-wrap: normal;
  }

  .events td:not(:nth-child(4)) {
    white-space: nowrap;
  }
</style>
