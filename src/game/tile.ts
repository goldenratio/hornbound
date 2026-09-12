import type { Karlib, Point } from "@goldenratio/karlib";
import { assert_never, type DeepReadonly } from "@goldenratio/core-utils";

import type { Resource } from "../resource.js";
import { TILE_SIZE } from "../game_config.js";

import { BreakableTile } from "./tiles/breakable_tile.js";
import { FoodTile } from "./tiles/food_tile.js";
import { GenericTile } from "./tiles/generic_tile.js";
import { TileType } from "./tiles/types.js";
import type { BitmapText } from "../text.js";
import { MovingTile } from "./tiles/moving_tile.js";
import { parse_tile_texture_id } from "./tiles/tile_utils.js";
import { ExitTile } from "./tiles/exit_tile.js";
import type { TileHud } from "./tile_hud.js";

export type Tile =
  | { readonly tile_type: TileType.Block; readonly tile: DeepReadonly<GenericTile>; }
  | { readonly tile_type: TileType.Empty; readonly tile: DeepReadonly<GenericTile>; }
  | { readonly tile_type: TileType.Exit; readonly tile: DeepReadonly<ExitTile>; }
  | { readonly tile_type: TileType.Breakable; readonly tile: DeepReadonly<BreakableTile>; }
  | { readonly tile_type: TileType.Food; readonly tile: DeepReadonly<FoodTile>; }
  | { readonly tile_type: TileType.Enemy; readonly tile: DeepReadonly<MovingTile>; }
  | { readonly tile_type: TileType.Hero; readonly tile: DeepReadonly<MovingTile>; }

type TileInstance<T extends TileType = TileType> =
  Extract<Tile, { readonly tile_type: T }>["tile"];

export function create_tile<T extends TileType>(
  tile_type: T,
  id: number,
  initial_grid: Point,
  kl: Karlib,
  res: Resource,
  tile_overlay: TileHud,
  on_turn_animation_complete?: () => void,
): TileInstance<T> {
  let tile: TileInstance;
  const x = initial_grid.x * TILE_SIZE;
  const y = initial_grid.y * TILE_SIZE;
  const texture_name = parse_tile_texture_id(id);

  switch (tile_type) {
    case TileType.Empty:
    case TileType.Block:
      tile = new GenericTile(texture_name, x, y, kl, res);
      break;
    case TileType.Exit:
      tile = new ExitTile(texture_name, x, y, kl, res);
      break;

    case TileType.Breakable:
      tile = new BreakableTile(texture_name, x, y, kl, res);
      break;

    case TileType.Food:
      tile = new FoodTile(texture_name, x, y, kl, res, tile_overlay);
      break;

    case TileType.Enemy:
      tile = new MovingTile(texture_name, kl, res, tile_overlay, initial_grid,
        id === 19 ? 6 : 3,
        3,
        "#631D76",
        false,
        on_turn_animation_complete);
      break;

    case TileType.Hero:
      tile = new MovingTile(texture_name, kl, res, tile_overlay, initial_grid,
        20,
        3,
        "#F64740",
        true,
        on_turn_animation_complete);
      break;

    default:
      return assert_never(tile_type);
  }

  return tile as TileInstance<T>;
}
