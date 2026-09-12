import type { Disposable, Mutable } from "@goldenratio/core-utils";
import type { Drawable } from "./types.js";
import type { BitmapText, BitmapTextOptions } from "../text.js";

interface CollectTextOptions extends BitmapTextOptions {
  readonly text_value: string;
}

const TEXT_ALPHA_SPEED = 0.02;

export class TileHud implements Drawable, Disposable {
  private readonly text: BitmapText;
  private text_items: Mutable<CollectTextOptions>[] = [];

  constructor(
    text: BitmapText,
  ) {
    this.text = text;
  }

  dispose(): void {
    this.reset();
  }

  reset(): void {
    this.text_items.length = 0;
  }

  show_overlay_text_animation(value: string, pos_x: number, pos_y: number, text_color: string): void {
    this.text_items.push({
      x: pos_x,
      y: pos_y,
      color: text_color,
      text_value: value,
      alpha: 1,
    });
  }

  update(dt: number): void {
    for (let i = this.text_items.length - 1; i >= 0; i--) {
      const collect_text_options = this.text_items[i];
      collect_text_options.y -= dt;
      collect_text_options.alpha! -= TEXT_ALPHA_SPEED * dt;

      if (collect_text_options.alpha! <= 0) {
        this.text_items.splice(i, 1);
      }

    }
  }

  draw(): void {
    for (let i = 0; i < this.text_items.length; i++) {
      const text_options = this.text_items[i];
      this.text.draw(text_options.text_value, text_options);
    }
  }
}
