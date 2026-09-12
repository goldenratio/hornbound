import { level_01 } from "./level_config/level_01.js";
import { level_02 } from "./level_config/level_02.js";
import { level_03 } from "./level_config/level_03.js";
import { level_04 } from "./level_config/level_04.js";
import { level_05 } from "./level_config/level_05.js";
import { level_06 } from "./level_config/level_06.js";
import { level_07 } from "./level_config/level_07.js";

type TextureId = number; // 0 to 15
export type OverlayMapConfig = readonly [grid_x: number, grid_y: number, texture_id: TextureId];

export interface LevelConfig {
  readonly level_map: ReadonlyArray<ReadonlyArray<TextureId>>;
  readonly overlay_map: ReadonlyArray<OverlayMapConfig>;
}

export const level_config: ReadonlyArray<LevelConfig> = [
  level_01,
  level_02,
  level_03,
  level_04,
  level_05,
  level_06,
  level_07,
] as const;
