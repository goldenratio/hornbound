import type { DrawTextureOptions, Karlib } from "@goldenratio/karlib";
import type { Mutable } from "@goldenratio/core-utils";

import type { Resource } from "../../resource.js";

import { type Tileable } from "./types.js";
import type { FramesType } from "../../gen/gfx_types.js";
import { TILE_SIZE } from "../../game_config.js";
import { play_sound, SFX } from "../sound.js";

export class ExitTile implements Tileable {
  private readonly kl: Karlib;
  private readonly texture_options: Mutable<DrawTextureOptions>;

  // Base Y position to offset from
  private readonly base_y: number;

  // Accumulator for tracking elapsed animation time
  private anim_timer: number = 0;

  // Speed multiplier for the oscillation cycle
  private readonly anim_speed: number = 0.05;

  readonly visible: boolean = true;
  readonly tile_active: boolean = true;

  constructor(
    texture_name: FramesType,
    x: number,
    y: number,
    kl: Karlib,
    res: Resource,
  ) {
    this.base_y = y + (TILE_SIZE >> 1);

    this.texture_options = {
      texture: res.texture.get(texture_name),
      scale: 4,
      pivot: { x: 0.5, y: 0.5 },
      x: x + (TILE_SIZE >> 1),
      y: this.base_y
    };
    this.kl = kl;
  }

  dispose(): void {
    // empty
  }

  perform_hit_action(target_grid_x: number, target_grid_y: number): void {
    // empty
  }

  receive_hit_action(): void {
    play_sound(SFX.finishLevel);
  }

  /**
   * @param dt Scalar representing the delta time factor, value between 0 to 1
   */
  update(dt: number): void {
    const TWO_PI = Math.PI * 2;
    // Increment timer and keep it strictly wrapped within 0 to 2*PI
    this.anim_timer = (this.anim_timer + dt * this.anim_speed) % TWO_PI;
    this.texture_options.y = this.base_y + Math.sin(this.anim_timer) * 10;
  }

  draw(): void {
    this.kl.draw_texture(this.texture_options);
  }
}
