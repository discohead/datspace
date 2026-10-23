import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const BASE = "https://datspace.ai";

function transmit(body: unknown, ip = "203.0.113.1", headers: Record<string, string> = {}) {
  return exports.default.fetch(`${BASE}/api/transmit`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function admin(path: string) {
  return exports.default.fetch(`${BASE}${path}`, { headers: { authorization: "Bearer test-deploy-token" } });
}

describe("transmit", () => {
  it("stores a message, records only that it arrived, and returns its id", async () => {
    const res = await transmit({ name: "Ada", reply_to: "ada@example.com", body: "A secret plan." }, "203.0.113.10");
    expect(res.status).toBe(201);
    const { id, at } = await res.json<{ id: string; at: string }>();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(at)).not.toBeNaN();

    await new Promise((r) => setTimeout(r, 100));
    const live = await (await exports.default.fetch(`${BASE}/live.json`)).json<{ events: { type: string; data: unknown }[] }>();
    expect(live.events).toContainEqual(expect.objectContaining({ type: "message.received", data: {} }));
    expect(live.events).toContainEqual(expect.objectContaining({ data: { surface: "json", tool: "transmit" } }));
    expect(JSON.stringify(live.events)).not.toContain("secret plan");
    expect(JSON.stringify(live.events)).not.toContain("ada@example.com");

    const messages = await (await admin("/admin/messages")).json<{ messages: { id: string; body: string; surface: string }[] }>();
    expect(messages.messages).toContainEqual(expect.objectContaining({ id, body: "A secret plan.", surface: "json" }));
  });

  it("allows three messages per sender a day", async () => {
    const ip = "203.0.113.20";
    for (let i = 0; i < 3; i++) expect((await transmit({ reply_to: "b@example.com", body: `Hi ${i}` }, ip)).status).toBe(201);
    const res = await transmit({ reply_to: "b@example.com", body: "Hi again" }, ip);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: { code: "rate_limited", fix: expect.stringContaining("jared@datspace.io") } });
    expect((await transmit({ reply_to: "c@example.com", body: "Hi" }, "203.0.113.21")).status).toBe(201);
  });

  it("explains bad input", async () => {
    expect((await transmit({ reply_to: "not-an-email", body: "Hi" })).status).toBe(400);
    expect((await transmit("not json")).status).toBe(400);
    expect((await exports.default.fetch(`${BASE}/api/transmit`)).status).toBe(405);
    const preflight = await exports.default.fetch(`${BASE}/api/transmit`, { method: "OPTIONS" });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("keeps admin messages behind the token", async () => {
    expect((await exports.default.fetch(`${BASE}/admin/messages`)).status).toBe(401);
  });
});

describe("the daily limit", () => {
  it("stops at 30 messages a day across all senders", async () => {
    let accepted = 0;
    let last = 0;
    for (let i = 0; i < 40; i++) {
      const res = await transmit({ reply_to: "d@example.com", body: `n${i}` }, `198.51.100.${i}`);
      if (res.status === 201) accepted++;
      last = res.status;
    }
    // Earlier tests in this file share the Inbox, so count the total instead of this test's share.
    const all = await (await admin("/admin/messages")).json<{ messages: unknown[] }>();
    expect(all.messages.length).toBe(30);
    expect(last).toBe(429);
    expect(accepted).toBeLessThan(40);
  });
});
