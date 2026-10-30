import { describe, expect, it } from "vitest";
import { duration, takeAudio, takeFileName, takeWav, waveform, wavHeader, type StoredTake } from "../src/lib/patter/takes.ts";

const take = (over: Partial<StoredTake> = {}): StoredTake => ({
  id: "t1",
  kind: "recording",
  name: "take 3",
  created: new Date(2026, 9, 27, 21, 5).getTime(),
  sampleRate: 48000,
  channels: 2,
  frames: 4,
  patch: "Dream Machine / drone",
  peaks: new Float32Array([-0.5, 0.5, -0.25, 0.75]),
  open: false,
  ...over,
});

/** `frames` stereo frames of 24-bit PCM, each byte its own index so the order is checkable. */
const pcm = (frames: number, start = 0) => Uint8Array.from({ length: frames * 6 }, (_, i) => (start + i) % 256);

describe("patter's takes", () => {
  it("writes a 24-bit PCM WAV header", () => {
    const view = new DataView(wavHeader(10, 2, 48000).buffer);
    const ascii = (at: number) => String.fromCharCode(...new Uint8Array(view.buffer, at, 4));
    expect(ascii(0)).toBe("RIFF");
    expect(ascii(8)).toBe("WAVE");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint32(28, true)).toBe(48000 * 6);
    expect(view.getUint16(32, true)).toBe(6);
    expect(view.getUint16(34, true)).toBe(24);
    expect(view.getUint32(40, true)).toBe(60);
    expect(view.getUint32(4, true)).toBe(36 + 60);
  });

  it("stops a finished take at its own length, though its last part runs past it", () => {
    const { body, frames } = takeAudio(take({ frames: 3 }), [pcm(2), pcm(2, 12)]);
    expect(frames).toBe(3);
    expect(body.reduce((n, b) => n + b.length, 0)).toBe(18);
    expect([...body[1]!]).toEqual([12, 13, 14, 15, 16, 17]);
  });

  it("keeps everything stored from a take the page closed on", () => {
    expect(takeAudio(take({ frames: 1, open: true }), [pcm(2), pcm(2, 12)]).frames).toBe(4);
  });

  it("drops a trailing partial frame", () => {
    const parts = [pcm(1), Uint8Array.of(1, 2, 3)];
    expect(takeAudio(take({ open: true }), parts).frames).toBe(1);
  });

  it("assembles a playable file", async () => {
    const blob = takeWav(take({ frames: 2 }), [pcm(2)]);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + 12);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[44]).toBe(0);
    expect(bytes[55]).toBe(11);
  });

  it("names files the way patter did", () => {
    expect(takeFileName(take())).toBe("Dream Machine - drone - take 3 2026-10-27 21.05.wav");
    expect(takeFileName(take({ patch: "" }))).toMatch(/^patter - take 3 /);
  });

  it("reads durations and waveforms", () => {
    expect(duration(48000 * 67, 48000)).toBe("1:07");
    expect(duration(48000 * 3723, 48000)).toBe("1:02:03");
    expect(waveform(new Float32Array([-0.5, 0.5, -0.25, 0.75]), 1)).toEqual([[-0.5, 0.75]]);
    expect(waveform(new Float32Array(), 10)).toEqual([]);
  });
});
