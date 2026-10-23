<script lang="ts">
  import { T, useTask, useThrelte } from "@threlte/core";
  import {
    DataTexture,
    GLSL3,
    NearestFilter,
    RedFormat,
    ShaderMaterial,
    UnsignedByteType,
    Vector3,
    Vector4,
  } from "three";
  import { fragmentShader, vertexShader } from "./field.glsl.ts";

  interface Props {
    sigma: number;
    /** n×n glyph bits, 1 for lit. */
    glyph: Uint8Array;
    glyphSize: number;
    /** RGB in 0–1. */
    ink: [number, number, number];
    /** CSS pixels at the bottom covered by the receiver panel. */
    panel: number;
    /** CSS pixels at the top taken by the header. */
    header: number;
    /** When false (reduced motion), the noise is fixed to `stillFrame`. */
    animate: boolean;
    stillFrame: number;
  }

  let { sigma, glyph, glyphSize, ink, panel, header, animate, stillFrame }: Props = $props();

  const { size, dpr, invalidate } = useThrelte();

  const CELL_CSS_PX = 3;
  const NOISE_FPS = 24;

  const texture = new DataTexture(new Uint8Array(1), 1, 1, RedFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;

  const material = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uSigma: { value: 1 },
      uFrame: { value: 0 },
      uCell: { value: CELL_CSS_PX },
      uGlyphRect: { value: new Vector4() },
      uGlyph: { value: texture },
      uInk: { value: new Vector3(1, 1, 1) },
    },
  });
  const u = material.uniforms as Record<string, { value: any }>;

  $effect(() => {
    // Scaling 0/1 to 0/255 so the red channel reads as 0 or 1 in the shader.
    const data = new Uint8Array(glyph.length);
    for (let i = 0; i < glyph.length; i++) data[i] = glyph[i] ? 255 : 0;
    texture.image = { data, width: glyphSize, height: glyphSize };
    texture.needsUpdate = true;
    invalidate();
  });

  $effect(() => {
    u.uSigma!.value = sigma;
    (u.uInk!.value as Vector3).set(...ink);
    if (!animate) u.uFrame!.value = stillFrame;
    invalidate();
  });

  $effect(() => {
    const ratio = dpr.current;
    const width = size.current.width * ratio;
    const height = size.current.height * ratio;
    const panelPx = panel * ratio;
    const headerPx = header * ratio;
    const cell = Math.max(1, Math.round(CELL_CSS_PX * ratio));
    // The glyph sits centered between the header and the panel, snapped to whole cells.
    const free = height - panelPx - headerPx;
    const room = Math.min(width, free);
    const side = Math.max(cell * glyphSize, Math.floor((room * 0.8) / (cell * glyphSize)) * cell * glyphSize);
    const x = Math.round((width - side) / 2 / cell) * cell;
    const y = Math.round((panelPx + (free - side) / 2) / cell) * cell;
    u.uCell!.value = cell;
    (u.uGlyphRect!.value as Vector4).set(x, y, side, side);
    invalidate();
  });

  let elapsed = 0;
  useTask(
    (delta) => {
      if (!animate) return;
      elapsed += delta;
      if (elapsed < 1 / NOISE_FPS) return;
      elapsed %= 1 / NOISE_FPS;
      u.uFrame!.value = (u.uFrame!.value + 1) % 1_000_000;
      invalidate();
    },
    { autoInvalidate: false },
  );
</script>

<T.Mesh frustumCulled={false}>
  <T.PlaneGeometry args={[2, 2]} />
  <T is={material} />
</T.Mesh>
