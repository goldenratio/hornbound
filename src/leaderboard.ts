import { to_number, type Disposable } from "@goldenratio/core-utils";
import type { StorageLike } from "./types.js";

export class LeaderBoard implements Disposable {
  private readonly storage: StorageLike;
  private current_score: number = 0;

  constructor(storage: StorageLike) {
    this.storage = storage;
  }

  async init(): Promise<void> {
    const score = await this.storage.get_value(`${process.env.GAME_META_URL_SLUG}_score`);
    if (typeof score === "string") {
      this.current_score = to_number(score) ?? 0;
    }
  }

  dispose(): void {
    //
  }

  async save_score(value: number): Promise<void> {
    await this.storage.save(`${process.env.GAME_META_URL_SLUG}_score`, value.toString());
    this.current_score = value;
  }

  get_score(): number {
    return this.current_score;
  }
}
