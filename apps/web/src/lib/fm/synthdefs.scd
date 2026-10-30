// datspace.fm's instruments, in SuperCollider. `pnpm --filter @datspace/web synthdefs`
// compiles them with the sclang in SuperCollider.app into static/fm/synthdefs/,
// where SuperSonic loads them; the compiled files are committed, so builds don't
// need SuperCollider.
//
// Every voice writes stereo to \out (bus 16), and ds_master reads that bus, adds
// the room, limits, and plays it. Voices with a left and a right that differ
// draw Lissajous figures on the page's XY scope: the scope is the sound.
//
// The scope is also a pad. ds_master smooths the listener's hand on it onto control
// buses 0 (across) and 1 (up), and the score maps a voice's macro controls to those
// buses when it starts the voice. A macro control runs from -1 to 1, and at 0, the
// pad's centre, the voice plays as scored:
//   stretch  times, from a quarter as long to four times as long
//   bend     pitch, from an octave down to an octave up; for clicks and noise, the filter
//   bright   tone: the FM index, the cutoff, or the overtones
//   swarm    grains, from an eighth as many to eight times as many
//   detune   beating, from a tenth as fast to ten times as fast
//   fold     drive, from a third as hard to three times as hard

(
var dir = "DATSPACE_SYNTHDEF_DIR".getenv;
var defs = List[];
var add = { |def| defs.add(def) };
var probes, positions, jobs, render;

// Test tones: a sine on the left and its ratio on the right.
add.(SynthDef(\ds_sine, { |out = 16, freq = 880, ratio = 1, amp = 0.1, attack = 0.002, dur = 0.08, release = 0.006,
	stretch = 0, bend = 0|
	var time = 4 ** stretch;
	var f = freq * (2 ** bend);
	var env = EnvGen.ar(Env.linen(attack * time, dur * time, release * time, 1, \sine), doneAction: 2);
	Out.ar(out, SinOsc.ar([f, f * ratio]) * env * amp);
}));

// One impulse, high-passed: a click with nothing in it.
add.(SynthDef(\ds_click, { |out = 16, amp = 0.3, hp = 3000, pan = 0, bend = 0|
	Line.kr(0, 0, 0.02, doneAction: 2);
	Out.ar(out, Pan2.ar(HPF.ar(Impulse.ar(0), (hp * (2 ** bend)).clip(20, 16000)) * amp, pan));
}));

// A few milliseconds of white noise: static, or a hat.
add.(SynthDef(\ds_burst, { |out = 16, amp = 0.08, dur = 0.02, hp = 5000, pan = 0, stretch = 0, bend = 0|
	var env = EnvGen.ar(Env.linen(0.0005, dur * (4 ** stretch), 0.002), doneAction: 2);
	Out.ar(out, Pan2.ar(HPF.ar(WhiteNoise.ar, (hp * (2 ** bend)).clip(20, 16000)) * env * amp, pan));
}));

// Two-operator FM whose index falls faster than its level: a blip.
add.(SynthDef(\ds_fm, { |out = 16, freq = 440, ratio = 2, index = 3, amp = 0.1, decay = 0.15, spread = 0.002, pan = 0,
	stretch = 0, bright = 0|
	var time = decay * (4 ** stretch);
	var env = EnvGen.ar(Env.perc(0.001, time, 1, -6), doneAction: 2);
	var sweep = EnvGen.ar(Env.perc(0.0005, time * 0.5, 1, -8));
	// Past an index of 12 the carrier sweeps past the top of hearing, and it's only noise.
	var mod = SinOsc.ar(freq * ratio) * (freq * ratio * (index * (3 ** bright)).min(12) * sweep);
	var car = SinOsc.ar([freq, freq * (1 + spread)] + mod);
	Out.ar(out, Balance2.ar(car[0], car[1], pan) * env * amp);
}));

// A cloud: sine grains at a set density, each pitched from four frequencies.
add.(SynthDef(\ds_cloud, { |out = 16, amp = 0.1, density = 16, grain = 0.05, f0 = 220, f1 = 330, f2 = 440, f3 = 660,
	width = 0.8, lpf = 9000, gate = 1, swarm = 0, stretch = 0|
	var planned = Lag.kr(density, 2);
	// Capped, so the densest, longest corner overlaps at most 120 grains.
	var rate = (planned * (8 ** swarm)).min(400);
	var size = (grain * (4 ** stretch)).min(0.3);
	var trig = Dust.ar(rate);
	var freq = Demand.ar(trig, 0, Drand([f0, f1, f2, f3], inf)) * TRand.ar(0.997, 1.003, trig);
	var grains = GrainSin.ar(2, trig, size, freq, TRand.ar(width.neg, width, trig), -1, 512);
	// The score sets amp for the overlap it planned. Under the macros the cloud keeps its loudness and changes its grain.
	var level = ((planned * grain).max(1) / (rate * size).max(1)).sqrt;
	var env = EnvGen.kr(Env.asr(1.5, 1, 3), gate, doneAction: 2);
	Out.ar(out, LPF.ar(grains, Lag.kr(lpf, 1)) * env * amp * level);
}));

// Six partials over one root, each a hair apart from left to right, so they beat slowly across the room.
add.(SynthDef(\ds_drone, { |out = 16, amp = 0.06, root = 55, beat = 0.15, lpf = 4000, glide = 6, gate = 1,
	r0 = 1, r1 = 1.5, r2 = 2, r3 = 2.25, r4 = 3, r5 = 3.5, detune = 0, bright = 0|
	var ratios = [r0, r1, r2, r3, r4, r5].collect { |r| Lag.kr(r, glide) };
	var beats = beat * (10 ** detune);
	// Partial n falls off as 1/n when bright is -1, as 1/sqrt(n) at 0, and not at all at 1. The sum keeps
	// its level, so brighter changes the tone, not the volume.
	var weights = (1..6) ** ((bright - 1) * 0.5);
	var norm = ((1..6) ** -0.5).sum / weights.sum;
	var partials = ratios.collect { |r, i|
		var f = root * r;
		var level = LFNoise2.kr(0.03 + (i * 0.011)).range(0.25, 1) * weights[i];
		SinOsc.ar([f, f + (beats * (i + 1) * 0.5)], 0, level)
	};
	var env = EnvGen.kr(Env.asr(6, 1, 6), gate, doneAction: 2);
	Out.ar(out, LPF.ar(partials.sum * norm, (Lag.kr(lpf, 2) * (4 ** bright)).clip(40, 18000)) * env * amp);
}));

// The bass line: two sines at a ratio, driven past 1 and folded back. Left and right make a Lissajous knot.
add.(SynthDef(\ds_fold, { |out = 16, freq = 55, ratio = 2, drive = 2, amp = 0.12, cutoff = 1800, res = 0.2,
	decay = 0.25, glide = 0.03, t_trig = 0, gate = 1, fold = 0, bright = 0|
	var f = Lag.kr(freq, glide);
	var env = EnvGen.kr(Env.perc(0.003, decay, 1, -4), t_trig);
	var sig = (SinOsc.ar([f, f * ratio]) * (drive * (3 ** fold) * (0.6 + (env * 0.8)))).fold2(1);
	// Brighter opens the filter, and above the centre it adds resonance. Resonance in a ladder takes level from
	// the passband, and the gain after it gives that back, so opening the filter doesn't turn the line down.
	var q = (res + (bright.max(0) * 0.4)) * 3.5;
	sig = MoogFF.ar(sig, (cutoff * (4 ** bright) * (1 + (env * 2))).clip(40, 18000), q) * ((1 + q) / (1 + (res * 3.5)));
	Out.ar(out, sig * env * amp * EnvGen.kr(Env.asr(0.05, 1, 0.5), gate, doneAction: 2));
}));

// A kick: a sine swept from a click down to the floor.
add.(SynthDef(\ds_kick, { |out = 16, freq = 48, amp = 0.4, decay = 0.4, click = 0.5|
	var pitch = EnvGen.ar(Env([freq * 8, freq * 1.8, freq], [0.004, 0.08], -4));
	var env = EnvGen.ar(Env.perc(0.001, decay, 1, -5), doneAction: 2);
	var sig = (SinOsc.ar(pitch, 0.5pi) * env * (1 + click)).tanh;
	Out.ar(out, sig.dup * amp);
}));

// One bit: a line on the left, the line OR a bass on the right, nothing between on and off.
// Pulse width is the only envelope, the way a beeper fades.
add.(SynthDef(\ds_bits, { |out = 16, f1 = 440, f2 = 110, amp = 0.05, decay = 0.12, lpf = 7000, t_trig = 0, gate = 1,
	stretch = 0, bend = 0|
	var w = EnvGen.kr(Env([0, 0.5, 0], [0.001, decay * (4 ** stretch)], -4), t_trig);
	var pitch = 2 ** bend;
	var line = LFPulse.ar(f1 * pitch, 0, w);
	var both = (line + LFPulse.ar(f2 * pitch, 0, w * 0.6)).min(1);
	var sig = LPF.ar(LeakDC.ar([line, both] * 2 - 1), Lag.kr(lpf, 0.5));
	Out.ar(out, sig * amp * EnvGen.kr(Env.asr(0.01, 1, 0.2), gate, doneAction: 2));
}));

// The room: a ping-pong echo and reverb, then the static, which rises with the decision's σ,
// a low-pass, and a limiter, out to the speakers. The voices before the room go to \scope, for
// the page's XY scope: reverb decorrelates left and right, which would blur every figure.
// The listener's hand on the scope, x and y, goes to control bus \hand and the one after it,
// smoothed over \lag seconds, for the voices' macro controls to read.
add.(SynthDef(\ds_master, { |in = 16, out = 0, scope = 2, hand = 0, x = 0, y = 0, lag = 0.1, level = 1.4, space = 0.25,
	room = 0.8, damp = 0.4, echo = 0.375, feedback = 0.35, echoMix = 0.12, lpf = 18000, static = 0, gate = 1|
	var dry = In.ar(in, 2);
	var fb = LocalIn.ar(2);
	var echoes = DelayC.ar(dry + (fb.reverse * feedback), 2, Lag.kr(echo, 0.5));
	var wet = FreeVerb2.ar(dry[0] + (echoes[0] * echoMix), dry[1] + (echoes[1] * echoMix), Lag.kr(space, 2), room, damp);
	var hiss = BPF.ar(WhiteNoise.ar([1, 1]), LFNoise1.kr(0.3).exprange(600, 3000), 0.9) * Lag.kr(static, 1);
	var sig;
	LocalOut.ar(LPF.ar(echoes, 6000));
	sig = LPF.ar(wet + hiss, Lag.kr(lpf, 0.5));
	sig = Limiter.ar(LeakDC.ar(sig) * level, 0.89, 0.01);
	Out.ar(out, sig * EnvGen.kr(Env.asr(0.3, 1, 0.8), gate, doneAction: 2));
	Out.ar(scope, dry);
	Out.kr(hand, Lag.kr([x, y].clip(-1, 1), lag));
}));

if(dir.notNil) {
	defs.do { |def| def.writeDefFile(dir) };
	"wrote % SynthDefs to %".format(defs.size, dir).postln;
};

// DATSPACE_NRT_DIR renders four seconds of each voice through the master, offline, so
// scripts/synthdefs.ts can check peak and RMS levels without anyone listening: once with the
// hand at the centre of the pad, and once at each corner its macros reach, with the macro
// controls mapped to the hand's buses as the score maps them.
probes = [
	// A voice, its arguments, and its macro controls across and up (nil where the pad moves nothing).
	[\ds_sine, [\freq, 880, \ratio, 1.5, \dur, 0.2], \stretch, \bend],
	[\ds_click, [], nil, \bend],
	[\ds_burst, [\dur, 0.03], \stretch, \bend],
	[\ds_fm, [\freq, 330, \ratio, 2, \index, 4], \stretch, \bright],
	[\ds_cloud, [\density, 40, \grain, 0.06], \swarm, \stretch],
	[\ds_drone, [\root, 55], \detune, \bright],
	[\ds_fold, [\freq, 41.2, \drive, 3, \t_trig, 1], \fold, \bright],
	[\ds_kick, [], nil, nil],
	[\ds_bits, [\f1, 660, \f2, 165, \t_trig, 1], \stretch, \bend],
];
// The centre, then the corners, or the two ends of the one axis a voice follows.
positions = { |across, up|
	var xs = if(across.isNil) { [0] } { [-1, 1] };
	var ys = if(up.isNil) { [0] } { [-1, 1] };
	[[0, 0]] ++ ys.collect { |y| xs.collect { |x| [x, y] } }.flatten(1).reject { |p| p == [0, 0] }
};
jobs = probes.collect { |probe| positions.(probe[2], probe[3]).collect { |p| probe ++ [p] } }.flatten(1);
render = { |i|
	var nrt = "DATSPACE_NRT_DIR".getenv;
	if(nrt.isNil or: { i >= jobs.size }) { 0.exit } {
		var name = jobs[i][0], args = jobs[i][1], across = jobs[i][2], up = jobs[i][3];
		var x = jobs[i][4][0], y = jobs[i][4][1];
		// Where the hand is, as a compass point: "ne" is the top right corner, and the centre has none.
		var corner = ["s", "", "n"][y + 1] ++ ["w", "", "e"][x + 1];
		var mapped = args ++ (if(across.notNil) { [across, "c0"] } { [] }) ++ (if(up.notNil) { [up, "c1"] } { [] });
		var options = ServerOptions.new.numOutputBusChannels_(4).numInputBusChannels_(0).sampleRate_(48000);
		Score([
			[0.0, ["/d_loadDir", dir]],
			[0.0, ["/g_new", 100, 0, 0], ["/g_new", 200, 3, 100]],
			[0.0, ["/s_new", \ds_master, 1000, 0, 200, \x, x, \y, y]],
			[0.05, ["/s_new", name, 1001, 0, 100] ++ mapped],
			[0.55, ["/s_new", name, 1002, 0, 100] ++ mapped],
			[3.0, ["/n_set", 1001, \gate, 0], ["/n_set", 1002, \gate, 0]],
		]).recordNRT(nil, nrt +/+ name ++ (if(corner.isEmpty) { "" } { "-" ++ corner }) ++ ".wav", sampleRate: 48000,
			headerFormat: "WAV", sampleFormat: "float", options: options, duration: 4, action: { render.(i + 1) });
	};
};
render.(0);
)
