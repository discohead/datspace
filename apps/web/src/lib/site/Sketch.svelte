<script lang="ts">
  import type p5 from "p5";
  import { onMount } from "svelte";

  interface Props {
    /** A p5 sketch in instance mode, on p5's core build (see p5.ts): no input events, no friendly errors, no p5 math. */
    sketch: (p: p5) => void;
    /** Whether the sketch loops. A looping sketch draws only while some of it is on screen. */
    animate: boolean;
    /** The running sketch, once p5 has loaded. */
    instance?: p5 | null;
  }

  let { sketch, animate, instance = $bindable(null) }: Props = $props();
  let container: HTMLDivElement;

  onMount(() => {
    let local: p5 | null = null;
    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    void (async () => {
      const { default: P5 } = await import("./p5.ts");
      if (cancelled) return;
      local = new P5(sketch, container);
      instance = local;
      if (!animate) return;
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) local?.loop();
        else local?.noLoop();
      });
      observer.observe(container);
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      local?.remove();
      local = null;
      instance = null;
    };
  });
</script>

<div bind:this={container}></div>
