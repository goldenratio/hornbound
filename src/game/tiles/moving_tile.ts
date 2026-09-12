import type { DrawTextureOptions, Karlib, Point } from "@goldenratio/karlib";
import type { Mutable } from "@goldenratio/core-utils";

import type { Resource } from "../../resource.js";
import { TILE_SIZE } from "../../game_config.js";
import { Direction } from "../types.js";

import { hero_tile_texture_name, type Tileable } from "./types.js";
import type { FramesType } from "../../gen/gfx_types.js";
import type { TileHud } from "../tile_hud.js";
import { play_sound, SFX } from "../sound.js";

const POSITION_EPSILON = 0.1;
const MOVE_SPEED = 0.5;
const ATTACK_SPEED = 0.6;

export class MovingTile implements Tileable {
  private readonly kl: Karlib;
  private readonly tile_overlay: TileHud;

  private readonly default_scale: number;
  private readonly scale: Mutable<Point>;

  private readonly target_pos: Mutable<Point> = { x: 0, y: 0 };
  private readonly attack_target_pos: Mutable<Point> = { x: 0, y: 0 };

  private show_damage_animation: boolean = false;
  private damage_animation_ticker: number = 0;
  private show_tint_animation: boolean = false;
  private show_death_animation: boolean = false;
  private attack_arc_alpha: number = 0;
  private readonly attack_arc_scale: number = 3;

  private readonly texture_options: Mutable<DrawTextureOptions>;
  private readonly attack_arc_texture_options: Mutable<DrawTextureOptions>;
  private death_texture_options: Mutable<DrawTextureOptions> | undefined = undefined;
  private ghost_texture_options: Mutable<DrawTextureOptions> | undefined = undefined;

  is_moving: boolean = false;
  is_attack_animation_active: boolean = false;
  tile_grid: Mutable<Point> = { x: 0, y: 0 };
  attack_tile_grid: Mutable<Point> = { x: 0, y: 0 };
  visible: boolean = true;
  tile_active: boolean = true;
  direction: Direction = Direction.Left;

  attack_power: number = 1;
  health: number = 0;
  current_damage: number = 0;
  level_completed: boolean = false;

  readonly pos: Mutable<Point> = { x: 0, y: 0 };

  private is_returning_from_attack: boolean = false;
  private turn_animation_complete: (() => void) | undefined = undefined;
  private death_animation_callback?: (() => void) | undefined = undefined;
  private readonly damage_text_color: string;
  private readonly show_attack_arc: boolean;

  constructor(
    texture_name: FramesType,
    kl: Karlib,
    res: Resource,
    tile_overlay: TileHud,
    initial_grid: Point,
    initial_health: number,
    default_scale: number,
    damage_text_color: string,
    show_attack_arc: boolean,
    turn_animation_complete?: () => void,
  ) {
    this.kl = kl;
    this.tile_overlay = tile_overlay;
    this.turn_animation_complete = turn_animation_complete ?? undefined;
    this.tile_grid.x = initial_grid.x;
    this.tile_grid.y = initial_grid.y;
    this.health = initial_health;
    this.default_scale = default_scale;
    this.scale = { x: default_scale, y: default_scale };
    this.show_attack_arc = show_attack_arc;
    this.damage_text_color = damage_text_color; // this.is_hero ? "#F64740" : "#631D76";

    this.texture_options = {
      texture: res.texture.get(texture_name),
      scale: default_scale,
      pivot: { x: 0.5, y: 0.5 },
      x: this.pos.x,
      y: this.pos.y,
    };

    this.attack_arc_texture_options = {
      texture: res.texture.get("aa"),
      scale: this.attack_arc_scale,
      pivot: { x: 0.5, y: 0.5 },
      x: this.pos.x,
      y: this.pos.y,
      alpha: 0
    };

    const death_texture_name = `${texture_name}a` as FramesType;
    const has_death_texture = res.texture.has(death_texture_name);
    if (has_death_texture) {
      this.death_texture_options = {
        texture: res.texture.get(death_texture_name),
        scale: default_scale,
        pivot: { x: 0.5, y: 0.5 },
        x: this.pos.x,
        y: this.pos.y,
      };
    }

    const ghost_texture_name = `${texture_name}b` as FramesType;
    const has_ghost_texture = res.texture.has(ghost_texture_name);
    if (has_ghost_texture) {
      this.ghost_texture_options = {
        texture: res.texture.get(ghost_texture_name),
        scale: 2,
        pivot: { x: 0.5, y: 0.5 },
        x: this.pos.x,
        y: this.pos.y,
        alpha: 0.4,
      };
    }

    this.update_target_position();
    this.snap_to_target();
  }

  dispose(): void {
    this.turn_animation_complete = undefined;
    this.death_animation_callback = undefined;
  }

  is_turn_animation_finished(): boolean {
    return !this.is_moving && !this.is_attack_animation_active;
  }

  reduce_health(damage: number = 1): void {
    this.health -= damage;
    this.current_damage = damage;
    this.show_damage_animation = true;
    this.damage_animation_ticker = 0;
    this.show_tint_animation = false;
    this.tile_overlay.show_overlay_text_animation(
      `-${this.current_damage}`,
      this.pos.x,
      this.pos.y,
      this.damage_text_color,
    );
  }

  increase_health(value: number): void {
    this.health += value;
  }

  increase_attack(value: number): void {
    this.attack_power += value;
  }

  set_level_completed(): void {
    this.level_completed = true;
  }

  perform_death_animation(fn?: () => void): void {
    console.log("tile died, perform death animation");
    this.show_death_animation = true;
    if (this.ghost_texture_options) {
      this.ghost_texture_options.x = this.pos.x;
      this.ghost_texture_options.y = this.pos.y;
    }

    if (this.show_attack_arc) {
      play_sound(SFX.die);
    }

    this.death_animation_callback = fn;
  }

  set_direction(direction: Direction): void {
    this.direction = direction;
    if (direction === Direction.Right) {
      this.scale.x = this.default_scale;
    } else if (direction === Direction.Left) {
      this.scale.x = this.default_scale * -1;
    }
  }

  set_grid(grid_x: number, grid_y: number): void {
    if (this.is_moving || this.is_attack_animation_active) {
      return;
    }
    this.tile_grid.x = grid_x;
    this.tile_grid.y = grid_y;

    this.begin_movement();

    if (this.show_attack_arc) {
      play_sound(SFX.walk);
    }
  }

  /**
   * @param dt Scalar representing the delta time factor, value between 0 to 1
   */
  update(dt: number): void {
    if (this.show_damage_animation) {
      this.damage_animation_ticker += 0.05 * dt;

      const show_red_tint: boolean = this.show_tint_animation && this.damage_animation_ticker <= 0.5;
      if (show_red_tint) {
        this.texture_options.tint_color = "red";
        this.texture_options.tint_alpha = 0.5;
      } else {
        this.texture_options.tint_color = undefined;
        this.texture_options.tint_alpha = undefined;
      }

      if (this.damage_animation_ticker >= 1) {
        this.damage_animation_ticker = 0;
        this.show_damage_animation = false;
        this.show_tint_animation = false;
        this.on_damage_animation_complete();
      }
    }

    // attack animation
    if (this.is_attack_animation_active) {
      const destination = this.is_returning_from_attack
        ? this.target_pos
        : this.attack_target_pos;

      const attack_speed = ATTACK_SPEED * dt;

      this.pos.x += (destination.x - this.pos.x) * attack_speed;
      this.pos.y += (destination.y - this.pos.y) * attack_speed;

      const remaining_x = Math.abs(destination.x - this.pos.x);
      const remaining_y = Math.abs(destination.y - this.pos.y);

      if (
        remaining_x <= POSITION_EPSILON &&
        remaining_y <= POSITION_EPSILON
      ) {
        this.pos.x = destination.x;
        this.pos.y = destination.y;

        if (this.is_returning_from_attack) {
          this.attack_arc_texture_options.alpha = 0;
          this.is_returning_from_attack = false;
          this.is_attack_animation_active = false;
          this.turn_animation_complete?.();
        } else {
          this.is_returning_from_attack = true;
          if (this.show_attack_arc) {
            this.attack_arc_texture_options.alpha = this.attack_arc_alpha;
          }
        }
      }

      return;
    }

    if (this.show_death_animation && this.ghost_texture_options) {
      this.ghost_texture_options.y! -= 0.9 * dt;
      this.ghost_texture_options.alpha! -= 0.004 * dt;

      if (this.ghost_texture_options.alpha! <= 0) {
        this.show_death_animation = false;
        this.death_animation_callback?.();
      }
      return;
    }

    // moving walk animation
    if (this.is_moving) {
      const walk_speed = MOVE_SPEED * dt;

      this.pos.x += (this.target_pos.x - this.pos.x) * walk_speed;
      this.pos.y += (this.target_pos.y - this.pos.y) * walk_speed;

      const remaining_x = Math.abs(this.target_pos.x - this.pos.x);
      const remaining_y = Math.abs(this.target_pos.y - this.pos.y);

      if (
        remaining_x <= POSITION_EPSILON &&
        remaining_y <= POSITION_EPSILON
      ) {
        this.snap_to_target();
        this.is_moving = false;
        this.turn_animation_complete?.();
      }
    }
  }

  private begin_movement(): void {
    this.update_target_position();
    this.is_moving = true;
  }

  private update_target_position(): void {
    this.target_pos.x = (this.tile_grid.x * TILE_SIZE) + (TILE_SIZE >> 1);
    this.target_pos.y = (this.tile_grid.y * TILE_SIZE) + (TILE_SIZE >> 1);
  }

  private snap_to_target(): void {
    this.pos.x = this.target_pos.x;
    this.pos.y = this.target_pos.y;
  }

  perform_hit_action(grid_x: number, grid_y: number, is_target_blocking_tile: boolean = false): void {
    if (this.is_attack_animation_active) {
      return;
    }
    this.is_attack_animation_active = true;
    this.is_returning_from_attack = false;

    this.attack_tile_grid.x = grid_x;
    this.attack_tile_grid.y = grid_y;

    const half_tile = TILE_SIZE >> 1;
    this.attack_target_pos.x = (grid_x * TILE_SIZE) + (half_tile);
    this.attack_target_pos.y = (grid_y * TILE_SIZE) + (half_tile);

    this.attack_arc_texture_options.x = this.attack_target_pos.x;
    this.attack_arc_texture_options.y = this.attack_target_pos.y;
    this.attack_arc_texture_options.rotate = 0;
    this.attack_arc_alpha = this.show_attack_arc && !is_target_blocking_tile ? 0.8 : 0;

    if (grid_x > this.tile_grid.x) {
      // right
      this.attack_target_pos.x -= half_tile;
      this.attack_arc_texture_options.x -= (half_tile - 20);
      this.attack_arc_texture_options.scale = this.attack_arc_scale;
    } else if (grid_x < this.tile_grid.x) {
      // left
      this.attack_target_pos.x += half_tile;
      this.attack_arc_texture_options.x += (half_tile - 20);
      this.attack_arc_texture_options.scale = -this.attack_arc_scale;
    }

    if (grid_y > this.tile_grid.y) {
      // down
      this.attack_target_pos.y -= half_tile;
      this.attack_arc_texture_options.y -= (half_tile - 20);
      this.attack_arc_texture_options.rotate = 90;
      this.attack_arc_texture_options.scale = this.attack_arc_scale;
    } else if (grid_y < this.tile_grid.y) {
      // up
      this.attack_target_pos.y += half_tile;
      this.attack_arc_texture_options.y += (half_tile - 20);
      this.attack_arc_texture_options.rotate = 270;
      this.attack_arc_texture_options.scale = this.attack_arc_scale;
    }

    if (this.show_attack_arc) {
      play_sound(is_target_blocking_tile ? SFX.hitWall : SFX.attack);
    }
  }

  receive_hit_action(damage: number): void {
    if (!this.tile_active) {
      return;
    }

    this.current_damage = damage;
    this.health -= damage;
    this.show_damage_animation = true;
    this.damage_animation_ticker = 0;
    this.tile_overlay.show_overlay_text_animation(
      `-${this.current_damage}`,
      this.pos.x,
      this.pos.y,
      this.damage_text_color,
    );
    this.show_tint_animation = true;

    play_sound(SFX.receiveDamage);
    if (this.health <= 0) {
      this.health = 0;
      this.tile_active = false;
    }
  }

  protected on_damage_animation_complete(): void {
    if (this.health <= 0 && !this.ghost_texture_options) {
      this.visible = false;
    }
  }

  draw(): void {
    if (!this.visible) {
      return;
    }

    if (this.show_death_animation && this.ghost_texture_options) {
      this.kl.draw_texture(this.ghost_texture_options);
    }

    if (!this.is_turn_animation_finished() || this.health > 0 || this.level_completed) {
      this.texture_options.x = this.pos.x;
      this.texture_options.y = this.pos.y;
      this.texture_options.scale = this.scale;
      this.kl.draw_texture(this.texture_options);
    } else if (this.health <= 0 && this.death_texture_options) {
      this.death_texture_options.x = this.pos.x;
      this.death_texture_options.y = this.pos.y;
      this.death_texture_options.scale = this.scale;
      this.kl.draw_texture(this.death_texture_options);
    }

    this.kl.draw_texture(this.attack_arc_texture_options);
  }
}
