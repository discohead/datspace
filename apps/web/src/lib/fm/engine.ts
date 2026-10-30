import {
  eventsAt,
  initialPackets,
  releasePackets,
  roomPackets,
  startPackets,
  stepAt,
  stopPackets,
  type Packet,
  type Station,
} from "./systems.ts";

/**
 * The broadcast: SuperCollider's scsynth, compiled to WebAssembly by
 * SuperSonic and running in an AudioWorklet in this page. The page schedules
 * timed OSC bundles a little ahead of the clock, and the engine plays them on
 * the sample. SuperSonic loads only after a click, and only on datspace.fm.
 */

const SYNTHDEFS = ["ds_sine", "ds_click", "ds_burst", "ds_fm", "ds_cloud", "ds_drone", "ds_fold", "ds_kick", "ds_bits", "ds_master"];

/** Schedule this far ahead. A hidden tab's timers can slow to once a second, so it looks further. */
const AHEAD_MS = 300;
const AHEAD_HIDDEN_MS = 1600;
const TICK_MS = 50;

export interface Broadcast {
  /** The voices before the room, split for the scope: left on x, right on y. */
  scope: { left: AnalyserNode; right: AnalyserNode };
  /** Switch stations without a gap: the old persistent synths fade as the new ones start. */
  tune(next: Station): void;
  stop(): Promise<void>;
}

/**
 * Boots the engine and starts playing `first`. Call from a click: browsers
 * start audio only after one. `clockOffsetMs` is the server's clock minus this
 * one, so every listener counts the same bar.
 */
export async function tuneIn(first: Station, clockOffsetMs: number): Promise<Broadcast> {
  const { SuperSonic } = await import("supersonic-scsynth");
  const sonic = new SuperSonic({
    workerBaseURL: "/fm/supersonic/workers/",
    coreBaseURL: "/fm/supersonic-core/",
    synthdefBaseURL: "/fm/synthdefs/",
    // postMessage works on any page; the faster SharedArrayBuffer mode would need cross-origin isolation.
    mode: "postMessage",
    midi: false,
    gamepad: false,
    // Outputs 0 and 1 are the speakers; ds_master writes the voices before the room to 2 and 3, for the scope.
    scsynthOptions: { numOutputBusChannels: 4, numInputBusChannels: 0 },
    autoConnect: false,
  });
  await sonic.init();
  await sonic.loadSynthDefs(SYNTHDEFS);

  const context = sonic.audioContext!;
  const split = context.createChannelSplitter(4);
  const speakers = context.createChannelMerger(2);
  const left = context.createAnalyser();
  const right = context.createAnalyser();
  left.fftSize = right.fftSize = 2048;
  const output = sonic.node;
  if (!output) throw new Error("SuperSonic started without an output node");
  // The wrapper types connect() with AudioNode's last overload, the AudioParam one; this is the node-to-node call.
  (output as unknown as { connect(destination: AudioNode): void }).connect(split);
  split.connect(speakers, 0, 0);
  split.connect(speakers, 1, 1);
  speakers.connect(context.destination);
  split.connect(left, 2);
  split.connect(right, 3);

  const now = () => Date.now() + clockOffsetMs;
  /** NTP seconds on the audio thread's clock for a time on the station's clock. */
  const ntp = (at: number) => (at - clockOffsetMs) / 1000 + SuperSonic.osc.NTP_EPOCH_OFFSET + (sonic.clock!.now() - SuperSonic.osc.ntpNow());
  const send = (packets: Packet[]) => {
    for (const [address, ...args] of packets) sonic.send(address, ...(args as never[]));
  };
  const schedule = (at: number, packets: Packet[]) => {
    if (packets.length > 0) sonic.sendOSC(SuperSonic.osc.encodeBundle(ntp(at), packets as never));
  };

  let current = first;
  let next = stepAt(current.decision.bpm, now()) + 1;
  send([...roomPackets(current), ...startPackets(current), ...initialPackets(current, next)]);

  const tick = () => {
    const at = now();
    const ahead = document.visibilityState === "visible" ? AHEAD_MS : AHEAD_HIDDEN_MS;
    const bpm = current.decision.bpm;
    const until = stepAt(bpm, at + ahead);
    for (; next <= until; next++) {
      const events = eventsAt(current, next);
      // A step that's already past is skipped, not played late.
      if (events.at >= at) schedule(events.at, events.packets);
    }
  };
  tick();
  const timer = setInterval(tick, TICK_MS);

  return {
    scope: { left, right },
    tune(station) {
      send([...releasePackets(current), ...startPackets(station)]);
      current = station;
      next = stepAt(current.decision.bpm, now()) + 1;
      send(initialPackets(current, next));
    },
    async stop() {
      clearInterval(timer);
      // Drop what's scheduled, so nothing plays after the fade.
      await sonic.purge();
      send(stopPackets(current));
      // The master's release is 0.8 s.
      await new Promise((resolve) => setTimeout(resolve, 900));
      await sonic.destroy();
    },
  };
}
