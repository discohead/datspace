<script lang="ts">
  import { runCase, type Case } from "./answerability.ts";
  import { jsonPieces } from "./wrap.ts";

  interface Props {
    cases: Case[];
    apiVersion: string;
  }

  let { cases, apiVersion }: Props = $props();

  const BASE = "https://datspace.ai";

  /** Each finished case's problems, by index. An empty list is a pass. */
  let results = $state<Record<number, string[]>>({});
  let running = $state(false);
  let ran = $state(false);

  const passed = $derived(Object.values(results).filter((problems) => problems.length === 0).length);

  const status = $derived.by(() => {
    if (running) return `Running ${cases.length} cases against ${BASE}.`;
    if (!ran) return "";
    return passed === cases.length ? `All ${cases.length} cases passed.` : `${passed} of ${cases.length} cases passed.`;
  });

  async function run() {
    if (running) return;
    running = true;
    results = {};
    await Promise.all(
      cases.map(async (c, i) => {
        results[i] = await runCase(c, BASE, apiVersion);
      }),
    );
    running = false;
    ran = true;
  }
</script>

<div class="controls">
  <button type="button" onclick={run} aria-disabled={running}>Run against production</button>
  <p class="status" role="status">{status}</p>
</div>

<!-- svelte-ignore a11y_no_noninteractive_tabindex On a narrow screen the table scrolls sideways, and a keyboard can only scroll what it can focus. -->
<div class="scroll" role="region" aria-labelledby="answerability-cases" tabindex="0">
  <table>
    <caption id="answerability-cases">The cases in tests/answerability.yaml</caption>
    <thead>
      <tr>
        <th scope="col">Question</th>
        <th scope="col">Call</th>
        <th scope="col">Expects</th>
        <th scope="col">Result</th>
      </tr>
    </thead>
    <tbody>
      {#each cases as c, i (i)}
        {@const problems = results[i]}
        <tr>
          <th scope="row">{c.question}</th>
          <td>
            <code>{c.tool}</code>
            <code>{#each jsonPieces(JSON.stringify(c.input)) as piece, k (k)}{#if k > 0}<wbr />{/if}{piece}{/each}</code>
          </td>
          <td>
            {#if c.mustError}
              error <code>{c.mustError}</code>
            {:else}
              contains {#each c.mustContain ?? [] as fact, j (j)}{#if j > 0}{", "}{/if}<code>{fact}</code>{/each}
            {/if}
          </td>
          <td class="result">
            {#if problems === undefined}
              {running ? "Running" : "Not run"}
            {:else if problems.length === 0}
              Pass
            {:else}
              <strong>Fail</strong>: {problems.join("; ")}
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
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

  button[aria-disabled="true"] {
    border-style: dotted;
    background: var(--paper);
    color: var(--ink);
    cursor: progress;
  }

  .status {
    margin: 0;
  }

  .scroll {
    margin-top: 1.5rem;
    overflow-x: auto;
  }

  /* On a narrow screen the table scrolls inside its region instead of squeezing its cells. */
  table {
    width: 100%;
    min-width: 40rem;
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
    padding: 0.45rem 1rem 0.45rem 0;
    border-top: 1px solid var(--ink);
    vertical-align: top;
  }

  tbody th {
    font-weight: 400;
  }

  code {
    font-family: var(--mono);
    font-size: 0.9em;
  }

  .result {
    overflow-wrap: anywhere;
  }
</style>
