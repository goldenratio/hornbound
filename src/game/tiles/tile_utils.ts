import type { FramesType } from "../../gen/gfx_types.js";

export function parse_tile_texture_id(id: number): FramesType {
  const texture_id = id < 10 ? `0${id}` : id.toString();
  const texture_name = `t${texture_id}` as FramesType;
  return texture_name;
}
