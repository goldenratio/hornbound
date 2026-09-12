import type { Disposable, Mutable } from "@goldenratio/core-utils";
import type { DrawTextureOptions, Karlib, Rectangle } from "@goldenratio/karlib";
import { create_hit_rect } from "./util.js";
import type { Resource } from "./resource.js";

export interface IButton extends Disposable {
  readonly normal: DrawTextureOptions;
  readonly hover: DrawTextureOptions;
  readonly hit_rect: Rectangle;

  set_x(value: number): void;
  set_y(value: number): void;
  set_alpha(value: number): void;
  set_hover(value: boolean): void;

  get_hit_rect(): Rectangle | undefined;

  draw(): void;
}

export class Button implements IButton {
  private readonly kl: Karlib;
  private readonly res: Resource;
  private is_hovered: boolean;

  readonly normal: Mutable<DrawTextureOptions>;
  readonly hover: Mutable<DrawTextureOptions>;
  readonly hit_rect: Rectangle;

  constructor(
    kl: Karlib,
    x: number,
    y: number,
    texture: DrawTextureOptions,
    res: Resource,
    hover_texture?: Partial<DrawTextureOptions>,
    hit_rect_options?: Rectangle,
  ) {
    this.kl = kl;
    this.res = res;

    const normal: DrawTextureOptions = {
      x,
      y,
      pivot: { x: 0.5, y: 0.5 },
      alpha: 1,
      ...texture
    };

    this.normal = normal;
    this.hover = { ...normal, ...hover_texture };
    this.hit_rect = hit_rect_options ?? create_hit_rect(kl, normal);
    this.is_hovered = false;
  }

  dispose(): void {
    // empty
  }

  update(dt: number): void {
    //
  }

  draw(): void {
    if (this.is_hovered) {
      this.kl.draw_texture(this.hover);
    } else {
      this.kl.draw_texture(this.normal);
    }

    // this.kl.draw_rectangle({ ... this.hit_rect, alpha: 0.3 });
  }

  set_x(value: number): void {
    this.normal.x = value;
    this.hover.x = value;
  }

  set_y(value: number): void {
    this.normal.y = value;
    this.hover.y = value;
  }

  set_alpha(value: number): void {
    this.normal.alpha = value;
    this.hover.alpha = value;
  }

  set_scale(value: number): void {
    this.normal.scale = value;
    this.hover.scale = value;
  }

  set_hover(value: boolean): void {
    if (this.is_hovered !== value) {
      this.is_hovered = value;
      if (value) {
        // this.res.sound.play("rollover");
      }
    }
  }

  get_is_hovered(): boolean {
    return this.is_hovered;
  }

  get_hit_rect(): Rectangle | undefined {
    if (this.normal.alpha ?? 0 >= 1) {
      return this.hit_rect;
    }
    return undefined;
  }
}
