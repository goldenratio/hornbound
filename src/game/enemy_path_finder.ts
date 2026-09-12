import type { DeepReadonly, Disposable } from "@goldenratio/core-utils";
import type { Point } from "@goldenratio/karlib";

import { TileType } from "./tiles/types.js";
import type { Tile } from "./tile.js";
import type { MovingTile } from "./tiles/moving_tile.js";

type SearchNode = {
  readonly x: number;
  readonly y: number;
  readonly first_step: Point | undefined;
};

// This order also provides deterministic tie-breaking between equal paths.
const directions: ReadonlyArray<Readonly<Point>> = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

export class EnemyPathFinder implements Disposable {
  private readonly queue: SearchNode[];
  private readonly visited: Set<string>;

  private get_tile_from_grid_pos: (x: number, y: number) => DeepReadonly<Tile> | undefined;

  constructor(get_tile_from_grid_pos: (x: number, y: number) => DeepReadonly<Tile> | undefined) {
    this.queue = [];
    this.visited = new Set();
    this.get_tile_from_grid_pos = get_tile_from_grid_pos;
  }

  dispose(): void {
    this.queue.length = 0;
    this.visited.clear();
    this.get_tile_from_grid_pos = (x: number, y: number) => {
      return undefined;
    }
  }

  reset(): void {
    this.queue.length = 0;
    this.visited.clear();
  }

  /**
   * Uses BFS (Breadth-First Search)
   */
  find_next_step(enemy: DeepReadonly<MovingTile>): Point | undefined {
    this.reset();

    const start_x = enemy.tile_grid.x;
    const start_y = enemy.tile_grid.y;

    this.queue.push({ x: start_x, y: start_y, first_step: undefined });
    this.visited.add(`${start_x}-${start_y}`);

    let queue_index = 0;


    while (queue_index < this.queue.length) {
      const current = this.queue[queue_index++];

      for (const direction of directions) {
        const x = current.x + direction.x;
        const y = current.y + direction.y;
        const tile_key = `${x}-${y}`;

        if (this.visited.has(tile_key)) {
          continue;
        }
        this.visited.add(tile_key);

        const target_tile = this.get_tile_from_grid_pos(x, y);
        if (!target_tile) {
          continue;
        }

        const first_step = current.first_step ?? { x, y };
        if (target_tile.tile_type === TileType.Hero) {
          return first_step;
        }

        if (target_tile.tile_type !== TileType.Empty) {
          continue;
        }

        this.queue.push({ x, y, first_step });
      }
    }

    return undefined;
  }
}
