import type { DeepReadonly, Disposable, Mutable } from "@goldenratio/core-utils";
import type { DrawTextureOptions, Karlib } from "@goldenratio/karlib";

import type { BitmapText, BitmapTextOptions } from "../text.js";
import type { Resource } from "../resource.js";
import { GAME_WIDTH } from "../game_config.js";

const ENABLE_RAINBOW_EFFECT = true;

export class GameHud implements Disposable {
  private readonly kl: Karlib;
  private readonly text: DeepReadonly<BitmapText>;

  private readonly food_left_text_options: Mutable<BitmapTextOptions>;
  private readonly food_left_text_options_shadow: Mutable<BitmapTextOptions>;

  private readonly heart_texture_options: Mutable<DrawTextureOptions>;
  private readonly heart_texture_options_shadow: Mutable<DrawTextureOptions>;

  private readonly win_message_text_options: Mutable<BitmapTextOptions>;

  private readonly hero_texture_options: Mutable<DrawTextureOptions> | undefined = undefined;

  private health_left: number = 0;
  private is_game_finished: boolean = false;
  private visible: boolean = false;

  // Accumulator for tracking elapsed animation time
  private anim_timer: number = 0;

  // Speed multiplier for the oscillation cycle
  private readonly anim_speed: number = 0.05;

  private readonly rainbow_textures: Mutable<DrawTextureOptions>[] = [];

  constructor(
    kl: Karlib,
    res: Resource,
    text: DeepReadonly<BitmapText>,
  ) {
    this.kl = kl;
    this.text = text;

    this.win_message_text_options = {
      x: 0,
      y: 0,
      color: "#fff",
    };

    this.food_left_text_options = {
      x: 44,
      y: 16,
      color: "#fff",
    };

    this.food_left_text_options_shadow = {
      x: this.food_left_text_options.x + 1,
      y: this.food_left_text_options.y + 1,
      color: "#000",
      alpha: 0.4,
    };

    this.heart_texture_options = {
      texture: res.texture.get("hh"),
      scale: 3,
      x: 10,
      y: 10,
    };

    this.heart_texture_options_shadow = {
      texture: this.heart_texture_options.texture,
      scale: this.heart_texture_options.scale,
      x: this.heart_texture_options.x! + 1,
      y: this.heart_texture_options.y! + 1,
      tint_color: "#000",
      alpha: 0.4,
    };

    if (ENABLE_RAINBOW_EFFECT) {
      this.hero_texture_options = {
        texture: res.texture.get("t15"),
        scale: 4,
        pivot: { x: 0.5, y: 0.5 },
        x: GAME_WIDTH >> 1,
        y: 400
      };

      let start_x = GAME_WIDTH >> 1;
      const total_segments = 200;

      for (let i = 0; i < total_segments; i++) {
        // Linearly scale alpha from 1.0 down to 0.0 at the end of the tail
        const alpha = 1 - i / total_segments;

        this.rainbow_textures.push({
          texture: res.texture.get("rr"),
          scale: { x: 1, y: 6 },
          x: start_x,
          y: 400 - 18,
          alpha: alpha,
        });
        start_x -= 1;
      }
    }
  }

  dispose(): void {
    // empty
  }

  reset(): void {
    this.health_left = 0;
    this.is_game_finished = false;
  }

  set_health_left(value: number): void {
    this.health_left = value;
  }

  set_visible(value: boolean): void {
    this.visible = value;
  }

  /**
   * @param dt Scalar representing the delta time factor, value between 0 to 1
   */
  update(dt: number): void {
    if (!ENABLE_RAINBOW_EFFECT) {
      return;
    }

    if (!this.is_game_finished) {
      return;
    }

    const TWO_PI = Math.PI * 2;
    // Increment timer and keep it strictly wrapped within 0 to 2*PI
    this.anim_timer = (this.anim_timer + dt * this.anim_speed) % TWO_PI;
    this.hero_texture_options!.y = 400 + Math.sin(this.anim_timer) * 10;

    // Shift trail positions back-to-front so segment i follows segment i - 1
    for (let i = this.rainbow_textures.length - 1; i > 0; i--) {
      this.rainbow_textures[i].y = this.rainbow_textures[i - 1].y;
    }

    // Direct the lead rainbow segment to follow the hero's vertical position
    this.rainbow_textures[0].y = this.hero_texture_options!.y! - 18;
  }

  on_game_finished(): void {
    this.is_game_finished = true;
  }

  draw(): void {
    if (!this.visible) {
      return;
    }
    if (this.is_game_finished) {
      this.win_message_text_options.x = (GAME_WIDTH >> 1) - (270 >> 1);
      this.win_message_text_options.y = 200;
      this.text.draw("congratulations", this.win_message_text_options);

      this.win_message_text_options.x = (GAME_WIDTH >> 1) - (434 >> 1);
      this.win_message_text_options.y += 60;
      this.text.draw("you have finished the game.", this.win_message_text_options);

      this.win_message_text_options.x = (GAME_WIDTH >> 1) - (416 >> 1);
      this.win_message_text_options.y += 30;
      this.text.draw("now you can fart rainbows.", this.win_message_text_options);

      if (ENABLE_RAINBOW_EFFECT) {
        for (let i = 0; i < this.rainbow_textures.length; i++) {
          this.kl.draw_texture(this.rainbow_textures[i]);
        }
        this.kl.draw_texture(this.hero_texture_options!);
      }
      return;
    }

    this.kl.draw_texture(this.heart_texture_options_shadow);
    this.kl.draw_texture(this.heart_texture_options);

    this.text.draw(this.health_left, this.food_left_text_options_shadow);
    this.text.draw(this.health_left, this.food_left_text_options);
  }
}
