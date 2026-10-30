/**
 * The vibe check's question bank. A visit draws a few questions at random;
 * the answers are read as a mood, never literally, by a decision model that
 * picks the station's system. Nothing here is scored by hand: no answer is
 * tagged as dark or fast, so the bank can be as strange as it likes.
 *
 * Ids are stable. Add questions at the end, and bump BANK_VERSION only when
 * an existing question's wording changes, so cached decisions stay honest.
 */

export const BANK_VERSION = 1;

export interface Question {
  id: string;
  prompt: string;
  answers: readonly string[];
}

const ANSWER_IDS = ["a", "b", "c", "d"] as const;
export type AnswerId = (typeof ANSWER_IDS)[number];

const raw: readonly [string, readonly string[]][] = [
  ["A light is on in the house across the lake. You:", ["watch until it goes out", "signal back with a flashlight", "row over", "close the curtains"]],
  ["Pick a material.", ["granite", "glass", "felt", "solder"]],
  ["The best hour of the night is:", ["11:58 p.m.", "2:00 a.m.", "4:12 a.m.", "the one you sleep through"]],
  ["A stranger hands you a cassette. You:", ["play it at double speed", "play it backwards", "keep it sealed", "record over it"]],
  ["Pick a weather.", ["hail on a tin roof", "fog that doesn't lift", "the first warm day", "snow with no wind"]],
  ["What does the machine want?", ["punch cards", "to be left alone", "to be held", "to finish the sentence"]],
  ["The dance floor at 6 a.m. is:", ["still full", "empty except for you", "a parking lot", "a memory by noon"]],
  ["Choose a texture.", ["black rubber", "wet slate", "velvet", "static on a screen"]],
  ["How many kicks in a bar?", ["four, forever", "three and a gap", "none", "one, very late"]],
  ["The radio between stations is:", ["noise", "a message", "the station", "my favorite part"]],
  ["You find a door in a snowbank. You:", ["knock", "dig around it", "open it", "leave it for spring"]],
  ["A clock runs eleven minutes fast. You:", ["set every clock to match", "fix it", "live by it", "take the battery out"]],
  ["Pick one color.", ["electric blue", "red, only where there's data", "the gray of wet pavement", "none"]],
  ["The record skips. You:", ["let it", "lift the needle", "dance to the skip", "sample it"]],
  ["What's in the envelope?", ["a catalog number", "a pressed leaf", "a blank page", "sand"]],
  ["A thousand birds lift off a wire. The sound is:", ["one word", "applause", "rain", "a hard drive"]],
  ["Choose a room.", ["a white gallery with one speaker", "a basement with a low ceiling", "a church with the lights off", "an airport at 3 a.m."]],
  ["The lake froze overnight. In the morning you:", ["walk out to the middle", "listen for it cracking", "skate", "wait for the thaw"]],
  ["What is the last sound in the world?", ["a sine wave", "a held breath", "a kick drum", "a fridge humming"]],
  ["You can keep one machine.", ["a drum machine", "a typewriter", "a shortwave radio", "a calculator"]],
  ["Someone is whistling in the next room. It's:", ["in tune", "a little flat", "the same four notes", "you"]],
  ["Pick a distance.", ["arm's length", "across the room", "across the lake", "the next valley"]],
  ["A pattern repeats. Change it:", ["every bar", "every eight bars", "when no one is listening", "never"]],
  ["Headlights on the pass at night are:", ["slow", "a sequence", "warm", "too bright"]],
  ["Choose a number.", ["1973", "120", "0.03", "7"]],
  ["What is a grain of sand?", ["a sound", "a planet", "a mistake", "a second"]],
  ["You're handed a tuning fork. You:", ["strike it once and listen", "strike it on everything", "press it to your jaw", "put it back"]],
  ["Morning comes through:", ["the blinds, in stripes", "fog", "a skylight", "nothing; the room has no windows"]],
  ["Choose an animal sound.", ["a crow", "an owl", "a dog two houses down", "frogs, thousands of them"]],
  ["A message arrives in Morse code. It's:", ["for you", "a mistake", "a recipe", "beautiful unread"]],
  ["Pines in the wind sound like:", ["the ocean", "traffic", "a crowd waiting", "nothing at all"]],
  ["Pick a speed.", ["33⅓", "45", "78", "paused"]],
  ["Which would you rather hear?", ["one chord for an hour", "a new chord every second", "one chord, slowly changing", "no chords"]],
  ["The pool at night is:", ["lit from below", "black", "perfectly still", "full of leaves"]],
  ["You get one knob. It controls:", ["time", "brightness", "how close", "the weather"]],
  ["Choose a city at 4 a.m.", ["Detroit", "Berlin", "Tokyo", "South Lake Tahoe"]],
  ["What is the photocopier doing?", ["copying the copy", "jamming", "humming", "dreaming"]],
  ["The ski lift stops halfway up. You:", ["enjoy the quiet", "swing the chair", "count the towers", "call someone"]],
  ["Choose a grid.", ["graph paper", "a chessboard", "a city block", "no grid"]],
  ["The neighbor's bass through the wall is:", ["welcome", "a heartbeat", "a puzzle", "too much"]],
  ["Pick a shape.", ["a circle", "a knot", "a staircase", "a cloud"]],
  ["The power goes out. You:", ["light a candle", "listen to the house", "go out to see the stars", "wait for the hum to come back"]],
  ["What's under the floorboards?", ["cables", "a letter", "just floor", "the sea"]],
  ["Choose a voice.", ["a choir, far away", "a newsreader", "a whisper close to the mic", "no voices"]],
  ["A song you love comes on in a supermarket. You:", ["stop and listen", "keep shopping, slower", "leave", "sing along"]],
  ["Pick a line.", ["straight", "curved", "folded back on itself", "dotted"]],
  ["Snow falls on the speakers. The music:", ["muffles", "sharpens", "doesn't notice", "turns to water"]],
  ["What does the satellite hear?", ["everything", "a dial tone", "its own echo", "us"]],
  ["Choose a moment.", ["the second before the drop", "the drop", "the first bar after", "the silence at the end"]],
  ["The fax machine has a message for you. It says:", ["still here", "page 1 of 1", "nothing, only tone", "sell everything"]],
  ["Your hands are:", ["cold", "busy", "in your pockets", "on the faders"]],
  ["Pick a floor to dance on.", ["concrete", "grass", "a wooden floor that gives", "snow"]],
  ["The best part of a train is:", ["the joints in the track", "the horn far away", "the window", "the tunnel"]],
  ["The metronome dies mid-song. You:", ["keep time yourself", "slow down", "stop", "drift"]],
  ["Choose a light.", ["a single bulb", "a strobe", "sodium orange", "moonlight on snow"]],
  ["The water in the glass is:", ["still", "trembling with the bass", "half gone", "ice"]],
  ["Choose a direction.", ["up", "inward", "sideways", "back the way you came"]],
  ["Pick a year for the machines.", ["1973", "1987", "1999", "next year"]],
  ["What does the dial say?", ["87.5", "92.3", "between stations", "nothing; it's dark"]],
  ["Someone leaves the party without saying goodbye. That's:", ["rude", "elegant", "me", "the party"]],
  ["Choose something to fall asleep to.", ["rain", "a fan", "a distant highway", "the click of a record that's run out"]],
  ["The right number of people in the room is:", ["none", "two", "forty", "a thousand"]],
  ["Choose a mistake.", ["a wrong note, held on purpose", "a dropped beat", "a typo that stayed", "an echo that came back wrong"]],
  ["The mountain is:", ["granite", "a shadow", "a long walk", "listening"]],
  ["A rainy Sunday is for:", ["rearranging the records", "sleeping", "writing something", "going out in it"]],
  ["The vending machine hums in:", ["B flat", "a minor key", "a major key", "no key at all"]],
  ["Pick a tool.", ["a scalpel", "a broom", "a magnet", "a tuning fork"]],
  ["A sound with no source. You:", ["follow it", "record it", "ignore it", "answer it"]],
  ["Choose a window.", ["rain on the outside", "frost on the inside", "open", "painted shut"]],
  ["Which do you trust?", ["the map", "the compass", "the stars", "whoever lives here"]],
  ["The best part of a song is:", ["the intro", "the breakdown", "the outro", "the gap between tracks"]],
  ["Pick a fabric.", ["denim", "silk", "wool", "Tyvek"]],
  ["Choose a substance.", ["mercury", "honey", "smoke", "salt"]],
  ["What happened at the lake?", ["nothing, beautifully", "a storm came across", "someone sang", "the ice talked all night"]],
  ["The print comes out of the machine:", ["warm", "wrong", "perfect", "endless"]],
  ["What's the elevator music?", ["bossa nova", "a test tone", "a recording of the lobby", "the elevator"]],
  ["Choose a speed of thought.", ["slow and sure", "fast and wrong", "in loops", "sideways"]],
  ["Pick an hour to drive.", ["dawn", "noon", "dusk", "the middle of the night"]],
  ["A child hits a piano with both fists. You hear:", ["noise", "a cluster chord", "the room ring", "a composer"]],
  ["What sound should a cursor make?", ["a click", "a tick", "a sigh", "none, thank you"]],
  ["Choose a crowd.", ["a festival", "a queue", "a stadium after the game", "a flock"]],
  ["The oscillator is out of tune. You:", ["tune it", "tune everything else to it", "add another, slightly out", "let it drift"]],
  ["Pick a temperature.", ["freezing", "cool", "warm", "a fever"]],
  ["The box at the back of the closet holds:", ["knotted cables", "old flyers", "tapes", "the box it came in"]],
  ["A bell rings once in the valley. You:", ["count the echoes", "walk toward it", "ring back", "wait for the second ring"]],
  ["Choose a kind of quiet.", ["a library", "a snowfield", "a studio after the take", "the second after an alarm stops"]],
  ["What should a ledger record?", ["everything", "only the mistakes", "who came by", "time"]],
  ["The sea is:", ["far away", "in a shell", "loud", "a flat line"]],
  ["Choose how to arrive.", ["early", "late", "unannounced", "by ear"]],
  ["What do you hear through the floor of a club?", ["the kick", "the sub", "voices", "the hats, somehow"]],
  ["Choose a pace.", ["a slow run", "a sprint", "a stroll", "standing still"]],
  ["Pick a code.", ["binary", "Morse", "a barcode", "a phone number from 1998"]],
  ["What would you put on the moon?", ["a speaker", "a mirror", "a flag", "nothing"]],
  ["The screen goes blank. You see:", ["your reflection", "dust", "the room behind you", "a faint afterimage"]],
  ["Choose something to collect.", ["catalog numbers", "rocks", "receipts", "silences"]],
  ["The night bus sounds like:", ["a long sigh", "a drone", "a heartbeat", "home"]],
  ["A drop of water falls every:", ["second", "beat", "minute", "now and then"]],
  ["Choose a frame rate.", ["24", "60", "1", "infinite"]],
  ["What are the wires on the pole saying?", ["everything at once", "nothing", "hold on", "hello again"]],
  ["Pick a vowel.", ["a", "o", "u", "the one in hum"]],
  ["The museum guard is:", ["asleep", "watching you", "humming", "the art"]],
  ["Choose an ending.", ["fade out", "cut", "loop forever", "slow down until it stops"]],
  ["Pick a page of the manual.", ["the safety warnings", "the block diagram", "the index", "the blank one at the back"]],
  ["What's on the other side of the wall?", ["a studio", "the sea", "another wall", "someone listening"]],
  ["The best snow is:", ["fresh powder", "spring corn", "the kind that squeaks", "still falling"]],
  ["Choose a signal.", ["smoke", "a radio beacon", "a lighthouse", "a nod across the room"]],
  ["A sound you can't stop hearing:", ["a fridge", "a ticking clock", "a ringing in your ears", "a song you hate"]],
  ["Choose a step.", ["forward", "to the side", "a dance step", "a missed step"]],
  ["What's in the dark?", ["more dark", "the room", "the bass", "an owl"]],
  ["Pick a knot.", ["a square knot", "a slipknot", "a figure eight", "a Lissajous knot"]],
  ["Which is louder?", ["one sine wave", "a crowd", "snow falling", "a refrigerator"]],
  ["The phone rings at midnight. You:", ["answer", "let it ring", "count the rings", "unplug it"]],
  ["Choose an instrument nobody plays.", ["a theremin", "a church organ", "a pay phone", "a radiator"]],
  ["What does the forest do at night?", ["grows", "listens", "breathes", "keeps time"]],
  ["The DJ plays the same record twice. That's:", ["a mistake", "a statement", "a mix", "the point"]],
  ["A boat on the lake at dawn has:", ["no one in it", "two people, not talking", "a radio playing", "a light still on"]],
  ["Pick a pressure.", ["a fingertip", "a handshake", "the deep sea", "an empty room"]],
  ["Choose an alarm.", ["a beep", "a bell", "the sun", "none, ever"]],
  ["The best way to listen is:", ["loud", "alone", "with friends", "half asleep"]],
  ["What is a loop?", ["a promise", "a trap", "a prayer", "a groove"]],
  ["The snowplow passes at 5 a.m. You:", ["sleep through it", "count the scrapes", "get up", "imagine the driver"]],
  ["Pick a delay time.", ["a dotted eighth", "a quarter note", "one second", "a week"]],
  ["What does the transmitter send?", ["a carrier tone", "the weather", "music", "your name"]],
  ["Choose a place to stand.", ["the summit", "the shore", "the booth", "the back of the room"]],
  ["Pick something that hums.", ["a transformer", "a bee", "a monk", "a server rack"]],
  ["A crowd goes quiet. Why?", ["the music stopped", "the lights went out", "someone's about to speak", "the drop is coming"]],
  ["Choose a gap.", ["between two notes", "between two trees", "between two words", "between stations"]],
  ["What's the moon doing?", ["rising", "full", "hiding", "humming"]],
  ["Tape hiss is:", ["noise", "warmth", "the room it was recorded in", "the whole point"]],
  ["Choose a speed of light.", ["slow, like honey", "instant", "flickering", "late"]],
  ["What's in your pocket?", ["a guitar pick", "a stone", "earplugs", "a key to a house you left"]],
  ["A stranger asks what you listen to. You say:", ["techno", "everything", "the radio", "mostly nothing"]],
  ["Choose a container.", ["a jar", "a crate of records", "a cathedral", "a cassette shell"]],
  ["What is the room tone?", ["the air conditioning", "the street", "your blood", "the speakers, switched off"]],
  ["A sequencer has eight steps. Light up:", ["all of them", "one", "the odd ones", "whichever feel right"]],
  ["Pick a mood for a Tuesday.", ["focused", "sideways", "luminous", "unbothered"]],
  ["Where does the echo come from?", ["the far shore", "the stairwell", "the machine", "last year"]],
  ["Choose a wave.", ["sine", "square", "saw", "ocean"]],
  ["The fire in the stove is:", ["crackling", "low", "out", "the only light"]],
  ["What do you play first?", ["the loudest thing", "the quietest thing", "the oldest thing", "whatever's on top"]],
  ["Pick a horizon.", ["flat", "jagged", "hidden by trees", "the edge of the screen"]],
  ["You and the snooze button are:", ["close", "complicated", "strangers", "a duo"]],
  ["Choose a resolution.", ["1 bit", "8 bits", "24 bits", "film grain"]],
  ["A sound arrives late. It's:", ["an echo", "the bass", "an apology", "on time for itself"]],
  ["The traffic light changes for no one. You:", ["wait anyway", "cross", "watch it cycle", "time the cycle"]],
  ["Pick a hinge.", ["one that creaks", "a silent one", "one that sticks", "a door left open"]],
  ["The best gig was:", ["small", "huge", "outdoors", "never recorded"]],
  ["Choose a liquid.", ["black coffee", "lake water", "rain in a gutter", "ink"]],
  ["What does a dial do?", ["tune", "turn it up", "count", "decide"]],
  ["What's the frequency?", ["88.7", "440", "whatever's free", "too high to hear"]],
  ["Choose a house rule.", ["one in, one out", "no repeats", "always repeat", "no rules after 2 a.m."]],
  ["A plane passes overhead. It's:", ["a long chord", "a cut in the conversation", "a rumble you feel", "headed somewhere warm"]],
  ["Pick a corner of the room.", ["by the speakers", "by the door", "by the window", "under the stairs"]],
];

/** Every question, with ids q001, q002, … in bank order. */
export const BANK: readonly Question[] = raw.map(([prompt, answers], i) => ({
  id: `q${String(i + 1).padStart(3, "0")}`,
  prompt,
  answers,
}));

const byId = new Map(BANK.map((q) => [q.id, q]));

export function question(id: string): Question | undefined {
  return byId.get(id);
}

/** An answer's id is its letter: a for the first, d for the fourth. */
export function answerId(index: number): AnswerId {
  const id = ANSWER_IDS[index];
  if (!id) throw new RangeError(`no answer at index ${index}`);
  return id;
}

/** The text of one answer, or undefined if either id doesn't exist. */
export function answerText(questionId: string, answer: string): string | undefined {
  const index = ANSWER_IDS.indexOf(answer as AnswerId);
  return index < 0 ? undefined : byId.get(questionId)?.answers[index];
}

/** `count` distinct questions, drawn with the given uniform random source. */
export function draw(count: number, random: () => number = Math.random, exclude: ReadonlySet<string> = new Set()): Question[] {
  const pool = BANK.filter((q) => !exclude.has(q.id));
  const picked: Question[] = [];
  while (picked.length < count && pool.length > 0) {
    const [q] = pool.splice(Math.floor(random() * pool.length), 1);
    picked.push(q!);
  }
  return picked;
}
