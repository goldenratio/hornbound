import type { DrawTextureOptions, Karlib, Rectangle, Texture } from "@goldenratio/karlib";

export function is_pwa(): boolean {
  return globalThis.location.href.includes("#/homescreen");
}

export function is_mobile_like(): boolean {
  return "ontouchstart" in globalThis
}

export function create_hit_rect(kl: Karlib, source: DrawTextureOptions, scale: number = 1, offset: number = 20): Rectangle {
  let texture: Texture | undefined = typeof source.texture === "string"
    ? kl.get_texture_from_name(source.texture)
    : source.texture;

  if (!texture) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  // 1. Calculate final dimensions
  const w = ((texture.get_width() * scale) | 0) + offset;
  const h = ((texture.get_height() * scale) | 0) + offset;

  // 2. Determine Top-Left based on pivot
  // If pivot is 0.5, source.x is the center. To get top-left, subtract half width.
  // If pivot is 0.0, source.x is the top-left. To center the offset, subtract half offset.
  const is_centered = source.pivot?.x === 0.5;

  const x = is_centered
    ? (source.x ?? 0) - (w >> 1)
    : (source.x ?? 0) - (offset >> 1);

  const y = is_centered
    ? (source.y ?? 0) - (h >> 1)
    : (source.y ?? 0) - (offset >> 1);

  return { x, y, width: w, height: h };
}
