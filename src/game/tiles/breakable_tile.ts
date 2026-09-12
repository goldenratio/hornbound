import { map_range, type Mutable } from "@goldenratio/core-utils";
import type { DrawTextureOptions, Karlib } from "@goldenratio/karlib";

import type { Resource } from "../../resource.js";

import { type Tileable } from "./types.js";
import type { FramesType } from "../../gen/gfx_types.js";

export class BreakableTile implements Tileable {
  private readonly kl: Karlib;
  private readonly texture_options: Mutable<DrawTextureOptions>;

  default_hits_left: number = 0;
  hits_left: number = 0;

  visible: boolean = true;
  tile_active: boolean = true;

  constructor(
    texture_name: FramesType,
    x: number,
    y: number,
    kl: Karlib,
    res: Resource,
  ) {
    this.texture_options = {
      texture: res.texture.get(texture_name),
      scale: 4,
      x: x,
      y: y,
      alpha: 1,
    };

    this.kl = kl;
    this.default_hits_left = 3;
    this.hits_left = this.default_hits_left;
  }

  dispose(): void {
    // empty
  }

  perform_hit_action(target_grid_x: number, target_grid_y: number): void {
    // empty
  }

  receive_hit_action(damage: number): void {
    if (!this.tile_active) {
      return;
    }

    this.hits_left -= damage;
    if (this.hits_left <= 0) {
      this.tile_active = false;
      this.visible = false;
    }
  }

  /**
   * @param dt Scalar representing the delta time factor, value between 0 to 1
   */
  update(dt: number): void {
    // empty
  }

  draw(): void {
    if (!this.visible) {
      return;
    }
    this.texture_options.alpha = 1 - map_range(this.hits_left, 0, this.default_hits_left, 1, 0);
    this.kl.draw_texture(this.texture_options);
  }
}
