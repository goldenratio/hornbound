import type { DrawTextureOptions, Karlib } from "@goldenratio/karlib";
import type { Mutable } from "@goldenratio/core-utils";

import type { Resource } from "../../resource.js";

import { static_block_tile_texture_name, type Tileable } from "./types.js";
import type { FramesType } from "../../gen/gfx_types.js";
import { TILE_SIZE } from "../../game_config.js";

export class GenericTile implements Tileable {
  private readonly kl: Karlib;
  private readonly texture_options: Mutable<DrawTextureOptions>;

  readonly visible: boolean = true;
  readonly tile_active: boolean = true;

  constructor(
    texture_name: FramesType,
    x: number,
    y: number,
    kl: Karlib,
    res: Resource,
  ) {
    const override: Partial<Record<FramesType, number>> = {
      [static_block_tile_texture_name]: 3 // scale
    };

    this.texture_options = {
      texture: res.texture.get(texture_name),
      scale: override[texture_name] ?? 4,
      pivot: override[texture_name] ? { x: 0.5, y: 0.5 } : undefined,
      x: override[texture_name] ? x + (TILE_SIZE >> 1) : x,
      y: override[texture_name] ? y + (TILE_SIZE >> 1) : y,
    };

    this.kl = kl;
  }

  dispose(): void {
    // empty
  }

  perform_hit_action(target_grid_x: number, target_grid_y: number): void {
    // do nothing
  }

  receive_hit_action(_damage: number): void {
    // do nothing
  }

  /**
   * @param dt Scalar representing the delta time factor, value between 0 to 1
   */
  update(dt: number): void {
    // empty
  }

  draw(): void {
    this.kl.draw_texture(this.texture_options);
  }
}
