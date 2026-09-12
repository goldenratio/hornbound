import type { Disposable, Mutable } from "@goldenratio/core-utils";
import type { DrawTextureOptions, Karlib, TickerData } from "@goldenratio/karlib";
import type { Resource } from "../resource.js";
import type { GameCanvasInteraction } from "./game_canvas_interaction.js";
import { GAME_HEIGHT, GAME_WIDTH } from "../game_config.js";
import { BitmapText, type BitmapTextOptions } from "../text.js";
import { hero_tile_texture_name } from "./tiles/types.js";
import { play_sound, SFX } from "./sound.js";

// Extended interface to attach dynamic motion properties to each cloud texture
interface CloudOption extends Mutable<DrawTextureOptions> {
  speed: number;
}

export class TitleScreen implements Disposable {
  private readonly game_title_texture_options: DrawTextureOptions;
  private readonly bg_texture: DrawTextureOptions;
  private readonly rainbow_texture: DrawTextureOptions;
  private readonly hero_texture: Mutable<DrawTextureOptions>;
  private readonly text: BitmapText;
  private readonly black_overlay_texture: Mutable<DrawTextureOptions>;
  private readonly cloud_textures: CloudOption[];

  private readonly tap_text_options: Mutable<BitmapTextOptions>;
  private readonly credit_text_options: BitmapTextOptions;

  // Accumulator for tracking elapsed animation time
  private anim_timer: number = 0;

  // Speed multiplier for the oscillation cycle
  private readonly anim_speed: number = 0.05;

  private readonly hero_base_y: number;

  private on_tap_callback: (() => void) | undefined = undefined;
  private start_fade_out_animation: boolean = false;

  constructor(
    private readonly kl: Karlib,
    readonly res: Resource,
    private readonly canvas_interaction: GameCanvasInteraction,
    readonly tap_callback: () => void,
  ) {
    this.text = new BitmapText(kl, res);
    this.on_tap_callback = tap_callback;
    this.bg_texture = {
      texture: res.texture.get("t00"),
      tint_color: "#57bafd",
      tint_alpha: 1,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    };

    this.black_overlay_texture = {
      texture: res.texture.get("t00"),
      tint_color: "#000",
      tint_alpha: 1,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      alpha: 0
    };

    this.rainbow_texture = {
      texture: res.rainbow_texture,
      pivot: { x: 0.5, y: 0.5 },
      x: GAME_WIDTH >> 1,
      y: 120,
      alpha: 0.94,
    };

    this.game_title_texture_options = {
      texture: res.texture.get("gt"),
      scale: 5,
      pivot: { x: 0.5, y: 0.5 },
      x: GAME_WIDTH >> 1,
      y: this.rainbow_texture.y! + 170
    };

    this.credit_text_options = {
      x: GAME_WIDTH >> 1,
      y: this.game_title_texture_options.y! + 60,
      pivot: { x: 0.5, y: 0.5 },
      color: "#2e0a60"
    };

    this.hero_base_y = this.credit_text_options.y! + 120;
    this.hero_texture = {
      texture: res.texture.get(hero_tile_texture_name),
      scale: 3,
      pivot: { x: 0.5, y: 0.5 },
      x: GAME_WIDTH >> 1,
      y: this.hero_base_y,
    };

    this.tap_text_options = {
      x: GAME_WIDTH >> 1,
      y: 660,
      pivot: { x: 0.5, y: 0.5 },
    };

    this.cloud_textures = Array.from({ length: 20 }, () => {
      const scale = 3 + Math.random() * 6;
      return {
        texture: res.texture.get("c1"),
        x: Math.random() * (GAME_WIDTH + 200) - 100,
        y: Math.random() * (GAME_HEIGHT * 0.6),
        scale: scale,
        alpha: 0.6 + Math.random() * 0.4,
        flip_x: Math.random() > 0.5,
        // Parallax effect: larger/closer clouds move faster
        speed: (scale / 4) * (0.2 + Math.random() * 0.3)
      };
    });
  }

  dispose(): void {
    this.text.dispose();
    this.cloud_textures.length = 0;
    this.on_tap_callback = undefined;
  }

  update(ticker_data: TickerData): void {
    if (this.black_overlay_texture.alpha! >= 1) {
      return;
    }

    const dt = ticker_data.delta_time;
    const TWO_PI = Math.PI * 2;
    // Increment timer and keep it strictly wrapped within 0 to 2*PI
    this.anim_timer = (this.anim_timer + dt * this.anim_speed) % TWO_PI;
    this.hero_texture!.y = this.hero_base_y + Math.sin(this.anim_timer) * 10;

    this.tap_text_options.alpha = 0.35 + (Math.sin(this.anim_timer * 2.5) + 1) * 0.325;

    // Update cloud positions and handle screen wrapping
    const max_screen_x = GAME_WIDTH + 150;
    for (let i = 0; i < this.cloud_textures.length; i++) {
      const cloud = this.cloud_textures[i];
      cloud.x! += cloud.speed * dt;

      // Wrap back to the left side when completely offscreen right
      if (cloud.x! > max_screen_x) {
        cloud.x = -150;
        cloud.y = Math.random() * (GAME_HEIGHT * 0.6);
        cloud.scale = 3 + Math.random() * 4;
        cloud.speed = (cloud.scale / 4) * (0.2 + Math.random() * 0.3);
      }
    }

    if (this.start_fade_out_animation) {
      this.black_overlay_texture.alpha! += 0.05 * dt;
      if (this.black_overlay_texture.alpha! >= 1) {
        this.on_tap_callback?.();
      }
      return;
    }

    if (this.canvas_interaction.is_canvas_tapped() ||
      this.canvas_interaction.is_key_pressed("Space")) {
      console.log("hide screen!");
      play_sound(SFX.click);
      this.start_fade_out_animation = true;
    }
  }

  draw(): void {
    this.kl.draw_texture(this.bg_texture);
    this.cloud_textures.forEach(cloud_texture => this.kl.draw_texture(cloud_texture));
    this.kl.draw_texture(this.rainbow_texture);
    this.kl.draw_texture(this.game_title_texture_options);
    this.kl.draw_texture(this.hero_texture);
    this.text.draw("tap to start", this.tap_text_options);
    this.text.draw("labrat.mobi", this.credit_text_options);
    this.kl.draw_texture(this.black_overlay_texture);
  }
}
