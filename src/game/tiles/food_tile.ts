import { type Mutable } from "@goldenratio/core-utils";
import type { DrawTextureOptions, Karlib } from "@goldenratio/karlib";

import type { Resource } from "../../resource.js";

import { attack_food_tile_texture_name, type Tileable } from "./types.js";
import { TILE_SIZE } from "../../game_config.js";
import type { FramesType } from "../../gen/gfx_types.js";
import type { TileHud } from "../tile_hud.js";
import { play_sound, SFX } from "../sound.js";

export class FoodTile implements Tileable {
  private readonly kl: Karlib;
  private readonly tile_overlay: TileHud;
  private readonly texture_options: Mutable<DrawTextureOptions>;

  readonly food_points: number = 0;
  readonly is_attack_power_up: boolean;

  visible: boolean = true;
  tile_active: boolean = true;

  constructor(
    texture_name: FramesType,
    x: number,
    y: number,
    kl: Karlib,
    res: Resource,
    tile_overlay: TileHud,
  ) {
    const pos_x = x + (TILE_SIZE >> 1);
    const pos_y = y + (TILE_SIZE - 8);
    this.is_attack_power_up = texture_name === attack_food_tile_texture_name;

    this.texture_options = {
      texture: res.texture.get(texture_name),
      scale: 3,
      pivot: { x: 0.5, y: 1 },
      x: pos_x,
      y: pos_y
    };

    this.kl = kl;
    this.tile_overlay = tile_overlay;
    this.food_points = this.is_attack_power_up ? 1 : 5;
  }

  dispose(): void {
    // empty
  }

  perform_hit_action(target_grid_x: number, target_grid_y: number): void {
    // empty
  }

  receive_hit_action(_damage: number): void {
    this.visible = false;
    this.tile_active = false;
    const str = this.is_attack_power_up ? "+attack" : `+${this.food_points}`;
    this.tile_overlay.show_overlay_text_animation(
      str,
      this.texture_options.x! + 10,
      this.texture_options.y! - 32,
      "#fff",
    );
    play_sound(this.is_attack_power_up ? SFX.levelUpAttack : SFX.collectHealth);
  }

  /**
   * @param dt Scalar representing the delta time factor, value between 0 to 1
   */
  update(dt: number): void {
    // empty
  }

  draw(): void {
    if (this.visible) {
      this.kl.draw_texture(this.texture_options);
    }
  }
}
