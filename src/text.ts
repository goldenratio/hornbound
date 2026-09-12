import type { DrawTextureOptions, Karlib, Point, Rectangle } from "@goldenratio/karlib";
import type { Disposable, Mutable } from "@goldenratio/core-utils";

import type { Resource } from "./resource.js";

// Font Config https://stmn.itch.io/font2bitmap-standalone
// font: Kenny Mini Square Mono
// Font Size: 16
// Grid Width: 12
// Grid Height: 24
// Per Row: 26
// Characters:
// +,-./0123456789:
// abcdefghijklmnopqrstuvwxyz

export interface BitmapTextOptions {
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly color?: string;
  readonly alpha?: number;
  readonly pivot?: Point;
}

const LETTER_SPACING = 2;
const SPACE_WIDTH = 6;

const BASE_GLYPH_WIDTH = 16;
const SMALL_GLYPH_WIDTH = 4;

const GLYPH_SOURCE_WIDTH = 11;
const GLYPH_SOURCE_HEIGHT = 16;

const ALPHA_SOURCE_Y = BASE_GLYPH_WIDTH * 2;
const SYMBOL_SOURCE_Y = BASE_GLYPH_WIDTH / 2;

export class BitmapText implements Disposable {
  private readonly draw_opts: Mutable<DrawTextureOptions>;

  constructor(
    private readonly kl: Karlib,
    res: Resource,
  ) {
    this.draw_opts = {
      texture: res.texture.get("ft"),
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      tint_color: "",
      alpha: 1,
      source_rect: {
        x: 0,
        y: 0,
        width: GLYPH_SOURCE_WIDTH,
        height: GLYPH_SOURCE_HEIGHT,
      },
    };

  }

  dispose(): void {
    // no-op
  }

  draw(text: string | number, options: BitmapTextOptions): number {
    const { x, y, scale = 1, alpha = 1, color, pivot } = options;
    const normalized_text = `${text}`;

    const total_width = this.get_width(normalized_text, scale);
    const total_height = this.get_height(scale);

    const start_x = pivot ? x - total_width * pivot.x : x;
    const start_y = pivot ? y - total_height * pivot.y : y;

    let cursor_x = start_x;

    this.draw_opts.tint_color = color;
    this.draw_opts.alpha = alpha;
    this.draw_opts.height = BASE_GLYPH_WIDTH * scale;
    this.draw_opts.y = start_y;

    for (let i = 0; i < normalized_text.length; i++) {
      const chr = normalized_text.charCodeAt(i);

      if (chr === 32) {
        cursor_x += (SPACE_WIDTH + LETTER_SPACING) * scale;
        continue;
      }

      const glyph_width = this.get_glyph_width(chr);
      const source_x = chr >= 97 ? 12 * (chr - 97) : 12 * (chr - 43);
      const source_y = chr >= 97 ? ALPHA_SOURCE_Y : SYMBOL_SOURCE_Y;

      this.draw_opts.x = cursor_x;
      this.draw_opts.width = glyph_width * scale;

      // TODO: fix unsafe type assert
      const source_rect = this.draw_opts.source_rect as Mutable<Rectangle>;
      source_rect.x = source_x;
      source_rect.y = source_y;

      this.kl.draw_texture(this.draw_opts);

      cursor_x += (glyph_width + LETTER_SPACING) * scale;
    }

    return total_width;
  }

  get_width(text: string | number, scale: number = 1): number {
    const normalized_text = `${text}`;
    let total_width = 0;

    for (let i = 0; i < normalized_text.length; i++) {
      const chr = normalized_text.charCodeAt(i);

      if (chr === 32) {
        total_width += (SPACE_WIDTH + LETTER_SPACING) * scale;
        continue;
      }

      total_width += (this.get_glyph_width(chr) + LETTER_SPACING) * scale;
    }

    return total_width;
  }

  get_height(scale: number = 1): number {
    return BASE_GLYPH_WIDTH * scale;
  }

  private get_glyph_width(chr: number): number {
    // '.', ':'
    return chr === 46 || chr === 58 ? SMALL_GLYPH_WIDTH : BASE_GLYPH_WIDTH;
  }
}

interface ShadowTextOptions {
  readonly x: number;
  readonly y: number
  readonly text_color?: string;
  readonly shadow_color?: string;
}

export class ShadowText {
  private readonly text: BitmapText;
  private readonly texture_options: Mutable<BitmapTextOptions>;
  private readonly texture_options_shadow: Mutable<BitmapTextOptions>;

  constructor(text: BitmapText, text_options: ShadowTextOptions) {
    this.text = text;

    const { x, y, text_color = "#fff", shadow_color = "#000" } = text_options;
    this.texture_options = {
      x: x,
      y: y,
      color: text_color,
    };

    this.texture_options_shadow = {
      x: x + 1,
      y: y + 1,
      color: shadow_color,
      alpha: 0.4,
    };
  }

  draw(text: string | number): void {
    const str = `${text}`;
    this.text.draw(str, this.texture_options_shadow);
    this.text.draw(str, this.texture_options);
  }
}
