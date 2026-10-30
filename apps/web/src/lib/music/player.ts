/**
 * Plays a sleeve's score: a sine with a moment of FM at the start of each
 * note, through a little reverb. Tone.js is imported when the first sleeve is
 * pressed, never before.
 */

import type { FMSynth, Gain, Loop, PolySynth } from "tone";
import { frequency, type Score } from "./score.ts";

export interface Player {
  /** Loops a score from its first row, in place of anything playing. `onStep` gets each row as it sounds. */
  play(score: Score, onStep: (step: number) => void): void;
  stop(): void;
  dispose(): void;
}

/** A stopped sleeve fades this fast, in seconds; the reverb rings on after it. */
const FADE = 0.25;
/** Each note is released this long after it starts, in seconds, and then rings out. */
const NOTE = 0.4;

interface Session {
  loop: Loop;
  synth: PolySynth<FMSynth>;
  gain: Gain;
}

export async function startPlayer(): Promise<Player> {
  const Tone = await import("tone");
  await Tone.start();
  const transport = Tone.getTransport();
  const draw = Tone.getDraw();
  const reverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.02, wet: 0.25 }).toDestination();
  await reverb.ready;

  let session: Session | null = null;

  function end() {
    if (!session) return;
    const { loop, synth, gain } = session;
    session = null;
    loop.dispose();
    transport.stop();
    draw.cancel(0);
    gain.gain.rampTo(0, FADE);
    // Disposing the synth also drops notes it had scheduled but not yet played.
    setTimeout(() => {
      synth.dispose();
      gain.dispose();
    }, FADE * 2000);
  }

  return {
    play(score, onStep) {
      end();
      const gain = new Tone.Gain(1).connect(reverb);
      // The modulator's envelope is short, so each note starts bright and settles into a sine.
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 2,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { attack: 0.003, decay: 1.2, sustain: 0, release: 1.2 },
        modulationEnvelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.1 },
      }).connect(gain);
      // Tone's FM voices already run their carriers at −10 dB; at −2 dB here, the loudest sleeve peaks near −6 dBFS.
      synth.volume.value = -2;

      let row = 0;
      const loop = new Tone.Loop((time) => {
        const step = row;
        row = (row + 1) % score.steps.length;
        for (const note of score.steps[step]!) {
          synth.triggerAttackRelease(frequency(note.midi), NOTE, time, note.velocity);
        }
        // A hidden tab draws nothing, so it gets no frames queued.
        if (!document.hidden) draw.schedule(() => onStep(step), time);
      }, "8n").start(0);

      transport.bpm.value = score.bpm;
      // Just after the previous sleeve's stop, so the two never land on the same instant.
      transport.start("+0.05");
      session = { loop, synth, gain };
    },
    stop: end,
    dispose() {
      end();
      setTimeout(() => reverb.dispose(), FADE * 2000);
    },
  };
}
