/**
 * Opt-in sound: static that filters as you tune, and a sine at each lock.
 * Tone.js is imported only when the visitor turns sound on.
 */

import { DIAL_MAX, DIAL_MIN, stationPitch } from "./model.ts";

export interface Sound {
  update(frequency: number, sigma: number, stationIndex: number | null): void;
  setAudible(audible: boolean): void;
  stop(): void;
}

const RAMP = 0.06;
const MASTER = 0.3;

export async function startSound(): Promise<Sound> {
  const Tone = await import("tone");
  await Tone.start();

  const master = new Tone.Gain(0).toDestination();
  const filter = new Tone.Filter({ type: "bandpass", frequency: 1000, Q: 3 });
  const noiseGain = new Tone.Gain(0);
  const noise = new Tone.Noise("white").chain(filter, noiseGain, master);
  const sineGain = new Tone.Gain(0).connect(master);
  const sine = new Tone.Oscillator(110, "sine").connect(sineGain);
  noise.start();
  sine.start();
  master.gain.rampTo(MASTER, 0.2);

  return {
    update(frequency, sigma, stationIndex) {
      const t = (frequency - DIAL_MIN) / (DIAL_MAX - DIAL_MIN);
      // The band-pass sweeps 300 to 2,900 Hz across the dial.
      filter.frequency.rampTo(300 + t * 2600, RAMP);
      noiseGain.gain.rampTo(sigma * 0.6, RAMP);
      if (stationIndex !== null) sine.frequency.rampTo(stationPitch(stationIndex), RAMP);
      sineGain.gain.rampTo((1 - sigma) ** 2 * 0.5, RAMP);
    },
    setAudible(audible) {
      master.gain.rampTo(audible ? MASTER : 0, 0.15);
    },
    stop() {
      master.gain.rampTo(0, 0.15);
      setTimeout(() => {
        noise.dispose();
        sine.dispose();
        filter.dispose();
        noiseGain.dispose();
        sineGain.dispose();
        master.dispose();
      }, 300);
    },
  };
}
