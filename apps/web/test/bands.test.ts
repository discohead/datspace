import { describe, expect, it } from "vitest";
import { bandHref, BANDS, currentBand, dialHref } from "../src/lib/site/bands.ts";

describe("bands", () => {
  it("knows which band a host is", () => {
    expect(currentBand("datspace.fm")).toBe("fm");
    expect(currentBand("datspace.io")).toBe("io");
    expect(currentBand("datspace-ai.datspace-web.workers.dev")).toBe("ai");
    expect(currentBand("localhost")).toBe("io");
  });

  it("links each band to its own domain, with the dial position", () => {
    const fm = BANDS.find((b) => b.band === "fm")!;
    expect(bandHref(fm, "#96.1")).toBe("https://datspace.fm/#96.1");
  });

  it("sends the dial to datspace.io from another band's domain, and keeps it local otherwise", () => {
    expect(dialHref("datspace.fm", "#106.7")).toBe("https://datspace.io/#106.7");
    expect(dialHref("datspace.ai")).toBe("https://datspace.io/");
    expect(dialHref("datspace.io", "#88.7")).toBe("/#88.7");
    expect(dialHref("localhost")).toBe("/");
  });
});
