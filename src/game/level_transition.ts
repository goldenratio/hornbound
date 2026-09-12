import type { Disposable, Mutable } from "@goldenratio/core-utils";
import type { DrawTextureOptions, Karlib } from "@goldenratio/karlib";
import type { Resource } from "../resource.js";
import type { Drawable } from "./types.js";
import { TILE_SIZE } from "../game_config.js";

const enum TransitionState {
  Start = 1,
  Middle,
  End,
}

interface TileTexture extends DrawTextureOptions {
  tile_delay: number;
  readonly default_tile_delay: number;
  readonly reverse_tile_delay: number;
}

const TRANSITION_SPEED_FACTOR = 2;

export class LevelTransition implements Drawable, Disposable {
  private readonly kl: Karlib;
  private readonly tiles: Mutable<TileTexture>[] = [];

  private state: TransitionState | undefined = undefined;
  private transition_callback: (() => void) | undefined = undefined;
  private direction: 1 | -1 = 1;

  private readonly cols = 8;
  private readonly rows = 15;

  constructor(
    kl: Karlib,
    res: Resource,
  ) {
    const total_tiles = this.cols * this.rows;
    const max_diagonal = (this.rows - 1) + (this.cols - 1);

    let tx = TILE_SIZE >> 1;
    let ty = TILE_SIZE >> 1;
    let row = 0;
    let col = 0;

    for (let i = 0; i < total_tiles; i++) {
      // Forward delay wave (top-left to bottom-right)
      const delay = (row + col) * TRANSITION_SPEED_FACTOR;
      const reverse_delay = (max_diagonal - (row + col)) * TRANSITION_SPEED_FACTOR;
      const texture_options: TileTexture = {
        texture: res.texture.get("t00"),
        scale: 4,
        x: tx,
        y: ty,
        pivot: { x: 0.5, y: 0.5 },
        tint_color: "#000",
        alpha: 0,
        tile_delay: delay,
        default_tile_delay: delay,
        reverse_tile_delay: reverse_delay,
      };
      tx += TILE_SIZE;
      col++;
      if (col >= this.cols) {
        col = 0;
        row++;
        tx = TILE_SIZE >> 1;
        ty += TILE_SIZE;
      }
      this.tiles.push(texture_options);
    }

    this.kl = kl;
  }

  private reset(): void {
    this.transition_callback = undefined;
    this.state = undefined;
    this.direction = 1;

    for (let i = 0; i < this.tiles.length; i++) {
      const texture_options = this.tiles[i];
      texture_options.alpha = 0;
      texture_options.tile_delay = texture_options.default_tile_delay;
    }
  }

  dispose(): void {
    this.reset();
  }

  /**
   * @param dt Scalar representing the delta time factor, value between 0 to 1
   */
  update(dt: number): void {
    if (!this.state || this.state === TransitionState.End) {
      return;
    }

    const fade_speed = 0.08;

    let is_screen_blacked_out = true;
    let are_all_tiles_cleared = true;

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      if (tile.tile_delay > 0) {
        tile.tile_delay -= dt;
        if (this.direction === 1) {
          is_screen_blacked_out = false;
        }
        if (this.direction === -1) {
          are_all_tiles_cleared = false;
        }
        continue;
      }

      tile.alpha = (tile.alpha ?? 0) + (fade_speed * dt) * this.direction;
      tile.alpha = Math.max(0, Math.min(1, tile.alpha));

      if (tile.alpha < 1) {
        is_screen_blacked_out = false;
      }

      if (tile.alpha > 0) {
        are_all_tiles_cleared = false;
      }
    }

    if (this.state === TransitionState.Start && is_screen_blacked_out) {
      this.direction = -1;
      this.state = TransitionState.Middle;

      // Invert delays for transition out phase (bottom-right to top-left)
      for (let i = 0; i < this.tiles.length; i++) {
        const tile = this.tiles[i];
        tile.tile_delay = tile.reverse_tile_delay;
      }

      this.on_transition_complete();
      return;
    }

    if (this.state === TransitionState.Middle && are_all_tiles_cleared) {
      this.state = TransitionState.End;
      this.reset();
    }
  }

  draw(): void {
    if (!this.state) {
      return;
    }
    for (let i = 0; i < this.tiles.length; i++) {
      this.kl.draw_texture(this.tiles[i]);
    }
  }

  start_animation(fn: () => void, skip_to_middle: boolean = false): void {
    console.log("level transition start!");
    this.reset();
    this.transition_callback = fn;

    if (skip_to_middle) {
      this.direction = -1;
      this.state = TransitionState.Middle;

      for (let i = 0; i < this.tiles.length; i++) {
        const tile = this.tiles[i];
        tile.alpha = 1;
        tile.tile_delay = tile.reverse_tile_delay;
      }

      this.on_transition_complete();
    } else {
      this.state = TransitionState.Start;
    }
  }

  private on_transition_complete(): void {
    console.log("level transition complete!");
    this.transition_callback?.();
  }
}
