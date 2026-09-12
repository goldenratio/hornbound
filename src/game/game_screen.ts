import type { DeepMutable, DeepReadonly, Disposable, Mutable } from "@goldenratio/core-utils";
import type { Camera2D, Karlib, Point, TickerData } from "@goldenratio/karlib";

import type { Resource } from "../resource.js";
import { create_tile, type Tile } from "./tile.js";
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "../game_config.js";
import type { GameCanvasInteraction } from "./game_canvas_interaction.js";
import { Direction } from "./types.js";
import { level_config, type LevelConfig, type OverlayMapConfig } from "./level_config.js";
import { get_tile_type_from_id, TileType, type Tileable } from "./tiles/types.js";
import type { FoodTile } from "./tiles/food_tile.js";
import { EnemyPathFinder } from "./enemy_path_finder.js";
import { BitmapText } from "../text.js";
import { GameHud } from "./game_hud.js";
import type { MovingTile } from "./tiles/moving_tile.js";
import { LevelTransition } from "./level_transition.js";
import { TileHud } from "./tile_hud.js";

export class GameScreen implements Disposable {
  private hero: { tile_type: TileType.Hero, tile: DeepReadonly<MovingTile> } | undefined = undefined;
  private readonly tiles: Map<string, Tile>;
  private readonly overlay_tiles: Map<string, Tile>;
  private readonly camera: DeepMutable<Camera2D>;
  private readonly enemy_path_finder: EnemyPathFinder;
  private readonly text: BitmapText;
  private readonly hud: GameHud;
  private readonly tile_overlay: TileHud;
  private readonly level_transition: LevelTransition;

  private level_width: number = 0;
  private level_height: number = 0;

  private enemy_tiles: MovingTile[];
  private current_level: number = 0;

  // resetable data
  private player_grid: Mutable<Point> = { x: 0, y: 0 };
  private is_turn_pending: boolean = false;
  private is_level_complete: boolean = false;
  private is_player_reached_exit: boolean = false;

  private camera_target_pos: Mutable<Point> = { x: 0, y: 0 };
  private max_camera_x: number = 0;
  private max_camera_y: number = 0;
  private camera_dead_zone_width: number = 0;
  private camera_dead_zone_height: number = 0;

  constructor(
    private readonly kl: Karlib,
    private readonly res: Resource,
    private readonly canvas_interaction: GameCanvasInteraction,
  ) {
    this.tiles = new Map();
    this.overlay_tiles = new Map();
    this.enemy_tiles = [];

    this.camera = {
      target: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
      rotation: 0,
      zoom: 1,
    };

    this.enemy_path_finder = new EnemyPathFinder((x, y) => this.get_tile_from_grid_pos(x, y));
    this.text = new BitmapText(kl, res);
    this.hud = new GameHud(kl, res, this.text);
    this.tile_overlay = new TileHud(this.text);
    this.level_transition = new LevelTransition(kl, res);

    // this.init_level();
    this.level_transition.start_animation(() => {
      this.hud.set_visible(true);
      this.init_level();
    }, true);

    __DEBUG__: {
      if (typeof window !== "undefined") {
        window.addEventListener("message", (event) => {
          const type = event?.data?.type as string | undefined;
          if (type === "LOAD_LEVEL") {
            const level_map = event.data.level_map as ReadonlyArray<ReadonlyArray<number>>;
            const overlay_map = event.data.overlay_map as ReadonlyArray<OverlayMapConfig>;
            const level_config = { level_map, overlay_map } as LevelConfig;
            this.reset();
            this.init_level(level_config);
          }
        });

        window.addEventListener("keypress", (event: KeyboardEvent) => {
          console.log(event);
          if (event.key === "]") {
            // next level
            const total_levels = level_config.length;
            if (this.current_level >= total_levels - 1) {
              this.game_completed();
              this.current_level = -1;
              return;
            }

            this.current_level++;
            this.init_level();
          } else if (event.key === "[") {
            // prev level
            this.current_level--;
            if (this.current_level < 0) {
              this.current_level = 0;
            }
            this.init_level();
          }
        });
      }
    }
  }

  dispose(): void {
    this.reset();
    this.text.dispose();
    this.hud.dispose();
    this.tile_overlay.dispose();
    this.level_transition.dispose();
    this.enemy_path_finder.dispose();
  }

  private reset(): void {
    console.log("reset game!");
    this.is_turn_pending = false;
    this.player_grid.x = 0;
    this.player_grid.y = 0;

    this.camera_target_pos.x = 0;
    this.camera_target_pos.y = 0;
    this.camera.target.x = 0;
    this.camera.target.y = 0;
    this.max_camera_x = 0;
    this.max_camera_y = 0;
    this.camera_dead_zone_width = 0;
    this.camera_dead_zone_width = 0;
    this.camera_dead_zone_height = 0;

    this.is_level_complete = false;
    this.is_player_reached_exit = false;

    this.enemy_path_finder.reset();
    this.hud.reset();
    this.tile_overlay.reset();

    // tiles
    this.enemy_tiles.length = 0;
    this.tiles.forEach(({ tile }) => tile.dispose());
    this.tiles.clear();

    this.overlay_tiles.forEach(({ tile }) => tile.dispose());
    this.overlay_tiles.clear();

    // hero
    if (this.hero) {
      this.hero.tile.dispose();
      this.hero = undefined;
    }
  }

  private init_level(override_level_data?: LevelConfig): void {
    this.reset();
    console.log("current level: ", this.current_level);
    const current_level_data = override_level_data ?? level_config[this.current_level];
    if (!current_level_data) {
      return;
    }
    const level_map = current_level_data.level_map;

    let tile_y: number = 0;
    for (let i = 0; i < level_map.length; i++) {
      const row = level_map[i];
      let tile_x: number = 0;
      for (let j = 0; j < row.length; j++) {
        const tile_texture_id = row[j];
        const tile_type = get_tile_type_from_id(tile_texture_id);
        const initial_grid = { x: j, y: i };
        const tile_impl = create_tile(
          tile_type,
          tile_texture_id,
          initial_grid,
          this.kl,
          this.res,
          this.tile_overlay,
          () => this.on_npc_turn_complete()
        );
        const tile = { tile_type, tile: tile_impl } as Tile;
        const tile_key = `${j}-${i}`;
        this.tiles.set(tile_key, tile);
        tile_x += TILE_SIZE;
      }
      tile_y += TILE_SIZE;
    }

    const overlay_map = current_level_data.overlay_map;
    for (let i = 0; i < overlay_map.length; i++) {
      const [grid_x, grid_y, texture_id] = overlay_map[i];
      const tile_key = `${grid_x}-${grid_y}`;
      const tile_type = get_tile_type_from_id(texture_id);
      const initial_grid = { x: grid_x, y: grid_y };
      const turn_complete_callback = tile_type === TileType.Hero
        ? () => this.on_player_turn_complete()
        : () => this.on_npc_turn_complete();
      const tile_impl = create_tile(
        tile_type,
        texture_id,
        initial_grid,
        this.kl,
        this.res,
        this.tile_overlay,
        turn_complete_callback,
      );

      if (tile_type === TileType.Hero) {
        this.hero = { tile_type, tile: tile_impl as MovingTile };
      } else {
        const tile = { tile_type, tile: tile_impl } as Tile;
        this.overlay_tiles.set(tile_key, tile);
      }
    }

    // init data
    if (this.hero) {
      const hero_tile = this.hero.tile;
      this.player_grid.x = hero_tile.tile_grid.x;
      this.player_grid.y = hero_tile.tile_grid.y;
      this.hud.set_health_left(hero_tile.health);
    }

    this.level_width = Math.max(...current_level_data.level_map.map(row => row.length)) * TILE_SIZE;
    this.level_height = current_level_data.level_map.length * TILE_SIZE;

    const enemy_tiles = [... this.overlay_tiles.values()]
      .filter(({ tile_type }) => tile_type === TileType.Enemy)
      .map(({ tile }) => tile as MovingTile);
    this.enemy_tiles = enemy_tiles;

    // camera
    this.max_camera_x = Math.max(0, this.level_width - GAME_WIDTH);
    this.max_camera_y = Math.max(0, this.level_height - GAME_HEIGHT);
    const dead_zone_ratio = 0.2;
    this.camera_dead_zone_width = this.level_width * dead_zone_ratio;
    this.camera_dead_zone_height = this.level_height * dead_zone_ratio;

    this.update_camera_target_position();
    this.canvas_interaction.set_touch_controls_visible(true);
  }

  update(ticker_data: TickerData): void {
    const dt = ticker_data.delta_time;

    this.hero?.tile.update(dt);

    if (this.is_level_complete) {
      // handle level complete animations
    } else {
      // hero
      if (this.hero) {
        const move_direction = this.canvas_interaction.get_move_direction();
        if (move_direction) {
          this.perform_player_turn(move_direction);
        }
      }
    }

    // camera
    const camera_speed = 0.2 * dt;
    this.update_camera_target_position();
    this.camera.target.x += ((this.camera_target_pos.x - this.camera.target.x) * camera_speed) | 0;
    this.camera.target.y += ((this.camera_target_pos.y - this.camera.target.y) * camera_speed) | 0;

    // tiles
    this.tiles.forEach(({ tile }) => tile.update(dt));
    this.overlay_tiles.forEach(({ tile }) => tile.update(dt));

    // hud
    this.hud.set_health_left(this.hero?.tile.health ?? 0);
    this.hud.update(dt);

    this.tile_overlay.update(dt);

    this.level_transition.update(dt);
  }

  private update_camera_target_position(): void {
    if (!this.hero) {
      return;
    }

    const hero_x = this.hero.tile.pos.x;
    const hero_y = this.hero.tile.pos.y;

    const half_dz_w = this.camera_dead_zone_width >> 1;
    const half_dz_h = this.camera_dead_zone_height >> 1;

    // Current camera center in world coordinates
    const current_cam_center_x = this.camera_target_pos.x + (GAME_WIDTH >> 1);
    const current_cam_center_y = this.camera_target_pos.y + (GAME_HEIGHT >> 1);

    // Define dead zone boundaries centered on current camera view
    const dead_zone_left = current_cam_center_x - half_dz_w;
    const dead_zone_right = current_cam_center_x + half_dz_w;
    const dead_zone_top = current_cam_center_y - half_dz_h;
    const dead_zone_bottom = current_cam_center_y + half_dz_h;

    let new_cam_center_x = current_cam_center_x;
    let new_cam_center_y = current_cam_center_y;

    // Shift camera target only when hero pushes past dead zone bounds
    if (hero_x < dead_zone_left) {
      new_cam_center_x = hero_x + half_dz_w;
    } else if (hero_x > dead_zone_right) {
      new_cam_center_x = hero_x - half_dz_w;
    }

    if (hero_y < dead_zone_top) {
      new_cam_center_y = hero_y + half_dz_h;
    } else if (hero_y > dead_zone_bottom) {
      new_cam_center_y = hero_y - half_dz_h;
    }

    // Convert centered camera position back to top-left camera origin and clamp to max level bounds
    this.camera_target_pos.x = Math.max(0, Math.min(new_cam_center_x - (GAME_WIDTH >> 1), this.max_camera_x));
    this.camera_target_pos.y = Math.max(0, Math.min(new_cam_center_y - (GAME_HEIGHT >> 1), this.max_camera_y));
  }

  private get_player_next_turn_grid_x(direction: Direction): number {
    if (direction === Direction.Right) {
      return this.player_grid.x + 1;
    }

    if (direction === Direction.Left) {
      return this.player_grid.x - 1;
    }
    return this.player_grid.x;
  }

  private get_player_next_turn_grid_y(direction: Direction): number {
    if (direction === Direction.Up) {
      return this.player_grid.y - 1;
    }

    if (direction === Direction.Down) {
      return this.player_grid.y + 1;
    }
    return this.player_grid.y;
  }

  private get_tile_from_grid_pos(grid_x: number, grid_y: number): DeepReadonly<Tile> | undefined {
    if (this.player_grid.x === grid_x && this.player_grid.y === grid_y) {
      return this.hero;
    }

    const tile_key = `${grid_x}-${grid_y}`;
    const overlay_tile = this.overlay_tiles.get(tile_key);
    if (overlay_tile && overlay_tile.tile.tile_active) {
      return overlay_tile;
    }

    return this.tiles.get(tile_key);
  }

  private set_turn_pending(value: boolean): void {
    this.is_turn_pending = value;
  }

  private game_completed(): void {
    console.log("no more levels! Game compete!");
    this.canvas_interaction.set_touch_controls_visible(false);
    this.level_transition.start_animation(() => {
      this.reset();
      this.hud.on_game_finished();
    });
  }

  private level_completed(): void {
    if (this.is_level_complete) {
      return;
    }

    console.log("level completed");
    this.is_level_complete = true;
    this.hero!.tile.set_level_completed();
    this.canvas_interaction.set_touch_controls_visible(false);
    const total_levels = level_config.length;
    if (this.current_level >= total_levels - 1) {
      this.game_completed();
      return;
    }

    this.level_transition.start_animation(() => {
      this.current_level++;
      this.init_level();
    });
  }

  private player_died(): void {
    console.log("Player Died! Restart level!");
    this.canvas_interaction.set_touch_controls_visible(false);
    this.hero!.tile.perform_death_animation(() => {
      this.level_transition.start_animation(() => {
        this.init_level();
      });
    });
  }

  private perform_player_turn(direction: Direction): void {
    // console.log("perform player turn ", this.turn_pending);
    if (this.is_turn_pending || !this.hero || this.hero.tile.health <= 0) {
      return;
    }

    const next_grid_x = this.get_player_next_turn_grid_x(direction);
    const next_grid_y = this.get_player_next_turn_grid_y(direction);
    const next_tile = this.get_tile_from_grid_pos(next_grid_x, next_grid_y);

    if (!next_tile) {
      return;
    }

    this.set_turn_pending(true);

    // consume food
    this.hero.tile.set_direction(direction);
    this.hero.tile.reduce_health();

    if (next_tile.tile_type === TileType.Block) {
      // invalid
      this.hero.tile.perform_hit_action(next_grid_x, next_grid_y, true);
      return;
    }

    next_tile.tile.receive_hit_action(this.hero.tile.attack_power);

    if (
      (next_tile.tile_type === TileType.Breakable && next_tile.tile.hits_left > 0) ||
      (next_tile.tile_type === TileType.Enemy && next_tile.tile.health > 0)
    ) {
      this.hero.tile.perform_hit_action(next_grid_x, next_grid_y);
      return;
    }

    if (next_tile.tile_type === TileType.Food) {
      this.player_collect_food(next_tile.tile);
    }

    if (next_tile.tile_type === TileType.Exit) {
      this.is_player_reached_exit = true;
    }

    this.player_grid.x = next_grid_x;
    this.player_grid.y = next_grid_y;
    this.hero.tile.set_grid(this.player_grid.x, this.player_grid.y);
  }

  private enemy_attack_player_tile(enemy: DeepReadonly<MovingTile>): void {
    console.log("enemy attack's player enemy! ", enemy.attack_power);
    const attack_power = enemy.attack_power;
    enemy.perform_hit_action(this.player_grid.x, this.player_grid.y);
    this.hero!.tile.receive_hit_action(attack_power);
  }

  private player_collect_food(target_tile: DeepReadonly<FoodTile>): void {
    console.log("food collected!");
    if (target_tile.is_attack_power_up) {
      this.hero!.tile.increase_attack(target_tile.food_points);
    } else {
      this.hero!.tile.increase_health(target_tile.food_points);
    }
    this.hud.set_health_left(this.hero!.tile.health);
  }

  private on_player_turn_complete(): void {
    console.log("player turn complete!");
    this.step_world_forward();
  }

  private on_npc_turn_complete(): void {
    const all_enemies_finished_turn = this.enemy_tiles
      .every(item => item.is_turn_animation_finished());

    if (all_enemies_finished_turn) {
      console.log("npc turn complete!");
      this.on_world_turn_complete();
    }
  }

  private step_world_forward(): void {
    const len = this.enemy_tiles.length;
    let min_one_active_action: boolean = false;

    for (let i = len - 1; i >= 0; i--) {
      const enemy = this.enemy_tiles[i];
      if (enemy.health <= 0) {
        this.enemy_tiles.splice(i, 1);
        continue;
      }

      const next_grid = this.enemy_path_finder.find_next_step(enemy);
      if (!next_grid) {
        continue;
      }

      const next_grid_x = next_grid.x;
      const next_grid_y = next_grid.y;
      const next_tile = this.get_tile_from_grid_pos(next_grid_x, next_grid_y);

      if (!next_tile) {
        continue;
      }

      const delta_x = this.player_grid.x - enemy.tile_grid.x;
      if (delta_x > 0) {
        enemy.set_direction(Direction.Left);
      } else if (delta_x < 0) {
        enemy.set_direction(Direction.Right);
      }

      if (next_tile.tile_type === TileType.Hero) {
        min_one_active_action = true;
        if (enemy.health > 0) {
          this.enemy_attack_player_tile(enemy);
        }
        continue;
      }

      if (next_tile.tile_type !== TileType.Empty) {
        continue;
      }

      const source_tile_key = `${enemy.tile_grid.x}-${enemy.tile_grid.y}`;
      const dest_tile_key = `${next_grid_x}-${next_grid_y}`;
      this.updateEnemyTileKeysInOverlayMap(enemy, source_tile_key, dest_tile_key);

      enemy.set_grid(next_grid_x, next_grid_y);
      min_one_active_action = true;
    }

    if (!min_one_active_action) {
      this.on_world_turn_complete();
    }
  }

  private updateEnemyTileKeysInOverlayMap(source_tile: Tileable, source_tile_key: string, dest_tile_key: string): void {
    const previous_overlay_tile = this.overlay_tiles.get(source_tile_key);
    if (previous_overlay_tile?.tile === source_tile) {
      this.overlay_tiles.delete(source_tile_key);
    }

    this.overlay_tiles.set(dest_tile_key, { tile_type: TileType.Enemy, tile: source_tile as MovingTile });
  }

  private on_world_turn_complete(): void {
    console.log(`world turn complete, food left: ${this.hero?.tile.health}`);
    this.set_turn_pending(false);

    if (this.is_player_reached_exit) {
      this.level_completed();
      return;
    }

    if (this.hero!.tile.health <= 0) {
      this.player_died();
    }
  }

  draw(): void {
    this.kl.draw_mode_2d(() => {
      this.tiles.forEach(({ tile }) => tile.draw());
      this.overlay_tiles.forEach(({ tile }) => tile.draw());
      this.hero?.tile.draw();
      this.tile_overlay.draw();
      // __DEBUG__: {
      //   // grid
      //   let x = 0;
      //   const i_limit = (this.level_width / TILE_SIZE) | 0;
      //   for (let i = 0; i < i_limit; i++) {
      //     this.kl.draw_line({
      //       start: { x: x, y: 0, }, end: { x: x, y: this.level_height },
      //       fill_style: "white",
      //       thickness: 0.5,
      //     });
      //     x += TILE_SIZE;
      //   }

      //   let y = 0;
      //   const j_limit = (this.level_height / TILE_SIZE) | 0;
      //   for (let j = 0; j < j_limit; j++) {
      //     this.kl.draw_line({
      //       start: { x: 0, y: y, }, end: { x: this.level_width, y: y },
      //       fill_style: "white",
      //       thickness: 0.5
      //     });
      //     y += TILE_SIZE;
      //   }
      // }
    }, this.camera);

    this.hud.draw();
    this.level_transition.draw();
  }
}
