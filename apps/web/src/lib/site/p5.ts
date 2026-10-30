import p5 from "p5/core";
import accessibility from "p5/accessibility";

/**
 * p5's core build, for the studies and the scope. The full build ("p5") adds a checker that validates the
 * arguments of every call, and non-passive pointer, wheel, and key listeners on the window, which make a phone
 * wait on this thread before it scrolls. These sketches write pixels and read no input. The core still calls the
 * accessibility addon when it sizes a canvas, so that comes along.
 */
p5.registerAddon(accessibility);

export default p5;
