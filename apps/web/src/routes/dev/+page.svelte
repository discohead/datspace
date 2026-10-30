<script lang="ts">
  import Answerability from "#lib/dev/Answerability.svelte";
  import Ledger from "#lib/dev/Ledger.svelte";
  import { REPO, blob, tree } from "#lib/dev/links.ts";
  import Header from "#lib/site/Header.svelte";
  import Meta from "#lib/site/Meta.svelte";

  let { data } = $props();

  const DIAGRAM = `Browsers  datspace.io ──────────────────────> datspace-web
Browsers  datspace.ai, .dev, .fm, .music ───> datspace-ai ── WEB ──> datspace-web
Agents    MCP  datspace.ai/mcp ─────────────> datspace-ai
CLI       JSON datspace.ai/api ─────────────> datspace-ai
CI        POST datspace.ai/admin/deploy ────> datspace-ai
Browsers  POST datspace.fm/decide ──────────> datspace-ai ──> Clef Flash, Workers AI
Browsers  datspace.studio ──────────────────> patter, a Worker of its own

          datspace-ai ─┬─ Ledger   every deploy and tool call, hash-chained
                       ├─ Inbox    messages to Jared, sent by email
                       └─ Budget   what the network spends each day`;
</script>

<Meta
  title="datspace.dev"
  description="The source of datspace: the architecture, the contract every surface derives from, the whole ledger checked in your browser, and how it was built."
  path="/"
  origin="https://datspace.dev"
/>

<Header />

<main class="page">
  <h1>datspace.dev</h1>
  <p class="lede">
    The source of the network: how it's built, the contract every surface derives from, the whole ledger checked in
    your browser, and how it was built. The code is MIT licensed at
    <a href={REPO}>github.com/discohead/datspace</a>.
  </p>

  <nav class="contents" aria-label="On this page">
    <ol>
      <li><a href="#shape">The shape</a></li>
      <li><a href="#contract">The contract</a></li>
      <li><a href="#ledger">The ledger</a></li>
      <li><a href="#answerability">Answerability</a></li>
      <li><a href="#built">How it was built</a></li>
    </ol>
  </nav>

  <section aria-labelledby="shape">
    <h2 id="shape">The shape</h2>
    <p>
      Two Workers and three Durable Objects, all in this repository, and patter on a Worker of its own. Every page is
      prerendered from the repository; the actors hold what changes.
    </p>
    <figure>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex On a narrow screen the diagram scrolls sideways, and a keyboard can only scroll what it can focus. -->
      <pre
        class="diagram"
        role="img"
        tabindex="0"
        aria-label="Browsers reach datspace-web at datspace.io. Browsers at datspace.ai, .dev, .fm, and .music, agents over MCP, the CLI over JSON, and CI reach datspace-ai, which forwards pages to datspace-web, asks Clef Flash for datspace.fm's decisions, and holds the Ledger, the Inbox, and the Budget. datspace.studio reaches patter.">{DIAGRAM}</pre>
      <figcaption>Callers on the left; the Workers that answer them on the right.</figcaption>
    </figure>

    <dl class="owns">
      <div>
        <dt><code>datspace-web</code></dt>
        <dd>
          <a href={tree("apps/web")}>apps/web</a>. SvelteKit, prerendered from <code>packages/content</code> and
          served as static assets. It serves datspace.io, and the pages of datspace.ai, .dev, .fm, and .music through
          datspace-ai. It binds nothing.
        </dd>
      </div>
      <div>
        <dt><code>datspace-ai</code></dt>
        <dd>
          <a href={tree("apps/ai")}>apps/ai</a>. MCP at <code>/mcp</code>, the JSON API at
          <code>/api/*</code>, <code>/llms.txt</code>, <code>/live.json</code>, <code>/ledger.json</code>, and
          <code>/admin/*</code> behind a token. It holds the custom domains of every band but datspace.io, rewrites
          <code>/</code> on each to that band's page, and forwards every other page to datspace-web over the
          <code>WEB</code> service binding. It answers <code>POST /decide</code> on every host but datspace.ai.
          <code>/mcp</code> and <code>/api/*</code> allow 120 requests a minute per client.
        </dd>
      </div>
      <div>
        <dt><code>Ledger</code></dt>
        <dd>
          <a href={blob("apps/ai/src/ledger.ts")}>apps/ai/src/ledger.ts</a>. A Durable Object in datspace-ai. It
          owns the append-only, hash-chained event log: <code>deploy</code>, <code>agent.call</code>, and
          <code>message.received</code>. It never stores arguments, IP addresses, user agents, or message contents.
        </dd>
      </div>
      <div>
        <dt><code>Inbox</code></dt>
        <dd>
          <a href={blob("apps/ai/src/inbox.ts")}>apps/ai/src/inbox.ts</a>. A Durable Object in datspace-ai. It owns
          messages to Jared and the limits on sending them: 3 per sender per 24 hours, and 30 a day in all. A sender
          is a salted hash that changes daily, never an address. Mail goes out through a <code>send_email</code>
          binding.
        </dd>
      </div>
      <div>
        <dt><code>Budget</code></dt>
        <dd>
          <a href={blob("apps/ai/src/budget.ts")}>apps/ai/src/budget.ts</a>. A Durable Object in datspace-ai. It owns
          daily spending counters, one row per budget per UTC day. Today it caps datspace.fm's Clef Flash decisions
          at 20,000 a day, about a dollar.
        </dd>
      </div>
      <div>
        <dt><code>patter</code></dt>
        <dd>
          <a href="https://github.com/discohead/patter">github.com/discohead/patter</a>, AGPL-3.0. A separate Worker
          and repository with Durable Objects of its own. Its route on datspace.studio takes precedence over
          datspace-ai's custom domain.
        </dd>
      </div>
      <div>
        <dt><code>datspace</code></dt>
        <dd>
          <a href={tree("apps/cli")}>apps/cli</a>, on npm. The CLI calls the JSON API and sends
          <code>x-datspace-client: cli/&lt;version&gt;</code>, so the Ledger records its calls with surface
          <code>cli</code>.
        </dd>
      </div>
      <div>
        <dt>CI</dt>
        <dd>
          <a href={blob(".github/workflows/deploy.yml")}>.github/workflows/deploy.yml</a>. On every push to main:
          build, typecheck, and test; deploy datspace-web, then datspace-ai; wait until the Worker and the Ledger both
          report the new commit; record the deploy in the Ledger; then check accessibility, rendering, and
          answerability against production.
        </dd>
      </div>
    </dl>

    <p>
      Nothing agent-facing calls a model; agents bring their own. The one model call a visitor can cause is datspace.fm's
      <a href={blob("apps/ai/src/decide.ts")}><code>POST /decide</code></a>: Clef Flash, a decision model on Workers
      AI, chooses the station's system, scale, and five rubric scores from options in <code>packages/fm</code>. It
      writes no text. Decisions are cached by a hash of the request; after the cache come a limit of 20 a minute per
      address and the Budget's 20,000 a day. Past either, or if Clef fails, the visitor's answers seed a local draw.
    </p>
  </section>

  <section aria-labelledby="contract">
    <h2 id="contract">The contract</h2>
    <p>
      Seven tools, defined once in <a href={blob("packages/contract/src/tools.ts")}>packages/contract/src/tools.ts</a>:
      a name, a title, a one-sentence description, a zod input schema, and a <code>run</code> function that reads
      only a <code>Source</code>. MCP, the JSON API, and the CLI wrap the same definitions.
    </p>
    <ul class="surfaces">
      <li>
        <strong>MCP</strong>: POST to <code>https://datspace.ai/mcp</code> with
        <code>accept: application/json, text/event-stream</code>. The server keeps no sessions, so a
        <code>tools/call</code> needs no handshake.
      </li>
      <li>
        <strong>JSON</strong>: GET for the tools that only read, POST with a JSON body for <code>transmit</code>.
        Every response carries <code>apiVersion</code>, now <code class="readout">{data.apiVersion}</code>.
      </li>
      <li><strong>CLI</strong>: <code>npx datspace</code>, on Node 22 or later.</li>
    </ul>
    <p>
      Input schemas are JSON Schema (draft 2020-12), as MCP's <code>tools/list</code> returns them. Each example call
      is checked against its tool's schema when this page is built.
    </p>

    {#each data.tools as tool (tool.name)}
      <article class="tool">
        <h3><code>{tool.name}</code></h3>
        <p>{tool.description}</p>
        <dl class="calls">
          <div>
            <dt>Title</dt>
            <dd>{tool.title}</dd>
          </div>
          <div>
            <dt>Read-only</dt>
            <dd>{tool.readOnly ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>JSON</dt>
            <dd><pre>{tool.json}</pre></dd>
          </div>
          <div>
            <dt>MCP</dt>
            <dd><pre>{tool.mcp}</pre></dd>
          </div>
          <div>
            <dt>CLI</dt>
            <dd>
              {#if tool.cli}<pre>{tool.cli}</pre>{:else}None{/if}
            </dd>
          </div>
        </dl>
        <details>
          <summary>Input schema</summary>
          <pre class="schema">{tool.inputSchema}</pre>
        </details>
      </article>
    {/each}
  </section>

  <section aria-labelledby="ledger">
    <h2 id="ledger">The ledger</h2>
    <p>Every deploy and every tool call is an event in the Ledger. Each event's hash covers the one before it:</p>
    <pre class="formula">hash = SHA-256(prevHash + "\n" + canonicalJson(&lbrace; seq, at, type, data &rbrace;))</pre>
    <p>
      <code>canonicalJson</code> sorts object keys at every depth, and the first event's <code>prevHash</code> is 64
      zeros. Changing any event changes its hash and every hash after it.
    </p>
    <p>
      This page reads the whole log from <code>/ledger.json</code>, 100 events at a time, and recomputes every hash
      in your browser with Web Crypto, using the Ledger's own code from
      <a href={blob("packages/contract/src/hash.ts")}>packages/contract/src/hash.ts</a>. Reading
      <code>/ledger.json</code> isn't a tool call, so it adds nothing to the log. From a clone of the repository,
      <code>AI_URL=https://datspace.ai pnpm verify:ledger</code> checks the newest 100 events the same way.
    </p>
    <Ledger />
  </section>

  <section aria-labelledby="answerability">
    <h2 id="answerability">Answerability</h2>
    <p>
      Questions a recruiter's agent would ask, each with the tool that answers it and the facts its answer must
      contain, from <a href={blob("tests/answerability.yaml")}>tests/answerability.yaml</a>. No model is in the loop:
      each check is a substring or an error code. CI runs every case over MCP and over JSON after each deploy.
    </p>
    <p>
      The button runs every case over JSON from this browser, the way any client calls datspace.ai, so each case adds
      an <code>agent.call</code> event to the ledger above. The <code>transmit</code> case gives an invalid address,
      so no message is sent.
    </p>
    <Answerability cases={data.cases} apiVersion={data.apiVersion} />
  </section>

  <section aria-labelledby="built">
    <h2 id="built">How it was built</h2>
    <p>
      In phases. Each phase's goal, done-when checks, and status are from
      <a href={blob(".planning/ROADMAP.md")}>.planning/ROADMAP.md</a>; its plan, summary, and notes are in
      <a href={tree(".planning/phases")}>.planning/phases</a>. The architecture is in
      <a href={blob(".planning/ARCHITECTURE.md")}>.planning/ARCHITECTURE.md</a>.
    </p>

    {#each data.phases as phase (phase.number)}
      <article class="phase">
        <h3>Phase {phase.number}: {phase.title}</h3>
        <dl class="plan">
          <div>
            <dt>Status</dt>
            <dd>{phase.status}{phase.completed ? `, ${phase.completed}` : ""}</dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd>{@html phase.goal}</dd>
          </div>
          <div>
            <dt>Done when</dt>
            <dd>{@html phase.doneWhen}</dd>
          </div>
          {#if phase.files.length}
            <div>
              <dt>Files</dt>
              <dd>
                {#each phase.files as file, i (file.url)}{#if i > 0}{", "}{/if}<a href={file.url}>{file.name}</a>{/each}
              </dd>
            </div>
          {/if}
        </dl>
        {#if phase.summary}
          <details>
            <summary>Summary</summary>
            <div class="prose summary">{@html phase.summary}</div>
          </details>
        {/if}
      </article>
    {/each}

    <article class="phase">
      <h3>October 29 and 30: the other bands</h3>
      <p>
        datspace.dev, <a href="https://datspace.fm">datspace.fm</a>, <a href="https://datspace.music">datspace.music</a>,
        and <a href="https://datspace.studio">datspace.studio</a> went live overnight. datspace.fm is a station that plays in the
        browser on SuperSonic, SuperCollider's scsynth compiled to WebAssembly, with a system chosen from a visitor's
        answers to a few questions. Choosing it is the one model call a visitor can cause, an exception Jared made on
        October 29 to the rule against inference: Clef Flash picks among options in the repository and writes no text, behind a
        cache, a limit per address, a daily budget, and a local fallback. datspace.music is a catalog with nothing
        pressed yet. datspace.studio is <a href="https://github.com/discohead/patter">patter</a>, Jared's synthesizer
        you talk to, in listener mode: anyone can watch and turn its knobs, and only Jared can prompt it, which is the
        only way its own model is ever called.
      </p>
    </article>

    <article class="phase">
      <h3>The cut line</h3>
      <div class="cut">{@html data.cutLine}</div>
    </article>
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

  h3 {
    font-size: 1.1rem;
    margin: 0 0 0.5rem;
  }

  p {
    margin: 0 0 1rem;
  }

  code,
  pre {
    font-family: var(--mono);
  }

  code {
    font-size: 0.9em;
    overflow-wrap: anywhere;
  }

  pre {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .contents ol {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  figure {
    margin: 1.5rem 0;
  }

  /* The diagram keeps its columns, so it scrolls sideways on a narrow screen instead of wrapping. */
  .diagram {
    overflow-x: auto;
    padding: 1rem;
    border: 1px solid var(--ink);
    font-size: 0.78rem;
    line-height: 1.45;
    white-space: pre;
    overflow-wrap: normal;
  }

  figcaption {
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }

  dl {
    margin: 0;
  }

  dt {
    font-weight: 600;
  }

  dd {
    margin: 0;
  }

  dd :global(p) {
    margin: 0;
  }

  /* Rendered markdown: long paths in code wrap instead of widening the page. */
  dd :global(code),
  .summary :global(code),
  .cut :global(code) {
    overflow-wrap: anywhere;
  }

  .owns,
  .calls,
  .plan {
    display: grid;
    gap: 0.6rem;
  }

  .owns {
    margin: 1.5rem 0;
  }

  .owns div,
  .calls div,
  .plan div {
    display: grid;
    grid-template-columns: 8.5rem 1fr;
    gap: 1rem;
  }

  .calls div,
  .plan div {
    grid-template-columns: 6rem 1fr;
  }

  @media (max-width: 40rem) {
    .owns div,
    .calls div,
    .plan div {
      grid-template-columns: 1fr;
      gap: 0.15rem;
    }
  }

  .surfaces {
    padding-left: 1.1rem;
    margin: 0 0 1rem;
  }

  .surfaces li + li {
    margin-top: 0.4rem;
  }

  .tool,
  .phase {
    margin-top: 2rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--ink);
  }

  details {
    margin-top: 0.75rem;
  }

  summary {
    cursor: pointer;
    width: fit-content;
  }

  .schema {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--ink);
  }

  .formula {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--ink);
  }

  .summary {
    margin-top: 1rem;
  }

  /* SUMMARY.md's own headings, moved under the phase's h3. */
  .summary :global(h4) {
    font-size: 1rem;
    margin: 1.75rem 0 0.5rem;
  }

  .summary :global(h5),
  .summary :global(h6) {
    font-size: 0.95rem;
    margin: 1.25rem 0 0.4rem;
  }

  .cut :global(p) {
    margin: 0 0 1rem;
  }
</style>
