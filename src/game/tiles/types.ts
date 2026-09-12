import type { Disposable } from "@goldenratio/core-utils";
import type { Drawable } from "../types.js";

export interface Tileable extends Drawable, Disposable {
  readonly visible: boolean;
  readonly tile_active: boolean;
  perform_hit_action(target_grid_x: number, target_grid_y: number): void;
  receive_hit_action(damage: number): void;
}

export const enum TileType {
  Empty = 1,
  Block,
  Breakable,
  Food,
  Enemy,
  Hero,
  Exit
}

export const attack_food_tile_texture_name = "t18";
export const static_block_tile_texture_name = "t13";
export const hero_tile_texture_name = "t15";

const breakable_ids: ReadonlyArray<number> = [12];
const food_ids: ReadonlyArray<number> = [17, 18]
const blocked_ids: ReadonlyArray<number> = [0, 1, 2, 13];
const enemy_ids: ReadonlyArray<number> = [14, 19];
const exit_tile_id = 16;
const hero_tile_id = 15;

export function get_tile_type_from_id(id: number): TileType {
  if (blocked_ids.includes(id)) {
    return TileType.Block;
  }

  if (breakable_ids.includes(id)) {
    return TileType.Breakable;
  }

  if (food_ids.includes(id)) {
    return TileType.Food;
  }

  if (enemy_ids.includes(id)) {
    return TileType.Enemy;
  }

  if (id === exit_tile_id) {
    return TileType.Exit;
  }

  if (id === hero_tile_id) {
    return TileType.Hero;
  }

  return TileType.Empty;
}
