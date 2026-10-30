// datspace.fm's instruments, in SuperCollider. `pnpm --filter @datspace/web synthdefs`
// compiles them with the sclang in SuperCollider.app into static/fm/synthdefs/,
// where SuperSonic loads them; the compiled files are committed, so builds don't
// need SuperCollider.
//
// Every voice writes stereo to \out (bus 16), and ds_master reads that bus, adds
// the room, limits, and plays it. Voices with a left and a right that differ
// draw Lissajous figures on the page's XY scope: the scope is the sound.

(
var dir = "DATSPACE_SYNTHDEF_DIR".getenv;
var defs = List[];
var add = { |def| defs.add(def) };
var probes, render;

// Test tones: a sine on the left and its ratio on the right.
add.(SynthDef(\ds_sine, { |out = 16, freq = 880, ratio = 1, amp = 0.1, attack = 0.002, dur = 0.08, release = 0.006|
	var env = EnvGen.ar(Env.linen(attack, dur, release, 1, \sine), doneAction: 2);
	Out.ar(out, SinOsc.ar([freq, freq * ratio]) * env * amp);
}));

// One impulse, high-passed: a click with nothing in it.
add.(SynthDef(\ds_click, { |out = 16, amp = 0.3, hp = 3000, pan = 0|
	Line.kr(0, 0, 0.02, doneAction: 2);
	Out.ar(out, Pan2.ar(HPF.ar(Impulse.ar(0), hp) * amp, pan));
}));

// A few milliseconds of white noise: static, or a hat.
add.(SynthDef(\ds_burst, { |out = 16, amp = 0.08, dur = 0.02, hp = 5000, pan = 0|
	var env = EnvGen.ar(Env.linen(0.0005, dur, 0.002), doneAction: 2);
	Out.ar(out, Pan2.ar(HPF.ar(WhiteNoise.ar, hp) * env * amp, pan));
}));

// Two-operator FM whose index falls faster than its level: a blip.
add.(SynthDef(\ds_fm, { |out = 16, freq = 440, ratio = 2, index = 3, amp = 0.1, decay = 0.15, spread = 0.002, pan = 0|
	var env = EnvGen.ar(Env.perc(0.001, decay, 1, -6), doneAction: 2);
	var bright = EnvGen.ar(Env.perc(0.0005, decay * 0.5, 1, -8));
	var mod = SinOsc.ar(freq * ratio) * (freq * ratio * index * bright);
	var car = SinOsc.ar([freq, freq * (1 + spread)] + mod);
	Out.ar(out, Balance2.ar(car[0], car[1], pan) * env * amp);
}));

// A cloud: sine grains at a set density, each pitched from four frequencies.
add.(SynthDef(\ds_cloud, { |out = 16, amp = 0.1, density = 16, grain = 0.05, f0 = 220, f1 = 330, f2 = 440, f3 = 660,
	width = 0.8, lpf = 9000, gate = 1|
	var trig = Dust.ar(Lag.kr(density, 2));
	var freq = Demand.ar(trig, 0, Drand([f0, f1, f2, f3], inf)) * TRand.ar(0.997, 1.003, trig);
	var grains = GrainSin.ar(2, trig, grain, freq, TRand.ar(width.neg, width, trig), -1, 512);
	var env = EnvGen.kr(Env.asr(1.5, 1, 3), gate, doneAction: 2);
	Out.ar(out, LPF.ar(grains, Lag.kr(lpf, 1)) * env * amp);
}));

// Six partials over one root, each a hair apart from left to right, so they beat slowly across the room.
add.(SynthDef(\ds_drone, { |out = 16, amp = 0.06, root = 55, beat = 0.15, lpf = 4000, glide = 6, gate = 1,
	r0 = 1, r1 = 1.5, r2 = 2, r3 = 2.25, r4 = 3, r5 = 3.5|
	var ratios = [r0, r1, r2, r3, r4, r5].collect { |r| Lag.kr(r, glide) };
	var partials = ratios.collect { |r, i|
		var f = root * r;
		var level = LFNoise2.kr(0.03 + (i * 0.011)).range(0.25, 1) / (i + 1).sqrt;
		SinOsc.ar([f, f + (beat * (i + 1) * 0.5)], 0, level)
	};
	var env = EnvGen.kr(Env.asr(6, 1, 6), gate, doneAction: 2);
	Out.ar(out, LPF.ar(partials.sum, Lag.kr(lpf, 2)) * env * amp);
}));

// The bass line: two sines at a ratio, driven past 1 and folded back. Left and right make a Lissajous knot.
add.(SynthDef(\ds_fold, { |out = 16, freq = 55, ratio = 2, drive = 2, amp = 0.12, cutoff = 1800, res = 0.2,
	decay = 0.25, glide = 0.03, t_trig = 0, gate = 1|
	var f = Lag.kr(freq, glide);
	var env = EnvGen.kr(Env.perc(0.003, decay, 1, -4), t_trig);
	var sig = (SinOsc.ar([f, f * ratio]) * (drive * (0.6 + (env * 0.8)))).fold2(1);
	sig = MoogFF.ar(sig, (cutoff * (1 + (env * 2))).clip(40, 18000), res * 3.5);
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
add.(SynthDef(\ds_bits, { |out = 16, f1 = 440, f2 = 110, amp = 0.05, decay = 0.12, lpf = 7000, t_trig = 0, gate = 1|
	var w = EnvGen.kr(Env([0, 0.5, 0], [0.001, decay], -4), t_trig);
	var line = LFPulse.ar(f1, 0, w);
	var both = (line + LFPulse.ar(f2, 0, w * 0.6)).min(1);
	var sig = LPF.ar(LeakDC.ar([line, both] * 2 - 1), Lag.kr(lpf, 0.5));
	Out.ar(out, sig * amp * EnvGen.kr(Env.asr(0.01, 1, 0.2), gate, doneAction: 2));
}));

// The room: a ping-pong echo and reverb, then the static, which rises with the decision's σ,
// a low-pass, and a limiter, out to the speakers. The voices before the room go to \scope, for
// the page's XY scope: reverb decorrelates left and right, which would blur every figure.
add.(SynthDef(\ds_master, { |in = 16, out = 0, scope = 2, level = 1.4, space = 0.25, room = 0.8, damp = 0.4, echo = 0.375,
	feedback = 0.35, echoMix = 0.12, lpf = 18000, static = 0, gate = 1|
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
}));

if(dir.notNil) {
	defs.do { |def| def.writeDefFile(dir) };
	"wrote % SynthDefs to %".format(defs.size, dir).postln;
};

// DATSPACE_NRT_DIR renders four seconds of each voice through the master, offline, so
// scripts/synthdefs.ts can check peak and RMS levels without anyone listening.
probes = [
	[\ds_sine, [\freq, 880, \ratio, 1.5, \dur, 0.2]],
	[\ds_click, []],
	[\ds_burst, [\dur, 0.03]],
	[\ds_fm, [\freq, 330, \ratio, 2, \index, 4]],
	[\ds_cloud, [\density, 40, \grain, 0.06]],
	[\ds_drone, [\root, 55]],
	[\ds_fold, [\freq, 41.2, \drive, 3, \t_trig, 1]],
	[\ds_kick, []],
	[\ds_bits, [\f1, 660, \f2, 165, \t_trig, 1]],
];
render = { |i|
	var nrt = "DATSPACE_NRT_DIR".getenv;
	if(nrt.isNil or: { i >= probes.size }) { 0.exit } {
		var name = probes[i][0], args = probes[i][1];
		var options = ServerOptions.new.numOutputBusChannels_(4).numInputBusChannels_(0).sampleRate_(48000);
		Score([
			[0.0, ["/d_loadDir", dir]],
			[0.0, ["/g_new", 100, 0, 0], ["/g_new", 200, 3, 100]],
			[0.0, ["/s_new", \ds_master, 1000, 0, 200]],
			[0.05, ["/s_new", name, 1001, 0, 100] ++ args],
			[0.55, ["/s_new", name, 1002, 0, 100] ++ args],
			[3.0, ["/n_set", 1001, \gate, 0], ["/n_set", 1002, \gate, 0]],
		]).recordNRT(nil, nrt +/+ name ++ ".wav", sampleRate: 48000, headerFormat: "WAV", sampleFormat: "float",
			options: options, duration: 4, action: { render.(i + 1) });
	};
};
render.(0);
)
