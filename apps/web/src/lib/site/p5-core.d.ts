// p5 publishes types for its full build only. Its core build exports the same class, and an addon is a function
// handed to p5.registerAddon.
declare module "p5/core" {
  import p5 from "p5";
  export default p5;
}

declare module "p5/accessibility" {
  const addon: Function;
  export default addon;
}
