import { type Karlib, type Texture } from "@goldenratio/karlib";

import { type FramesType as TextureFrameType, json_content as gfx_json } from "./gen/gfx_types.js";
import { create_rainbow_texture } from "./rainbow_texture.js";

export interface Resource {
  readonly texture: TextureResource;
  readonly rainbow_texture: Texture;
}

type TextureResource = Omit<Map<TextureFrameType, Texture>, 'get'> & {
  get(key: TextureFrameType): Texture;
};

export class AssetLoader {
  constructor(
    private readonly kl: Karlib,
  ) {
    // empty
  }

  async load(): Promise<Resource | undefined> {
    try {
      const sprite_map = await this.kl.load_spritesheet_tp<TextureFrameType>(gfx_json);
      const env_provider = this.kl.get_env();

      const res: Resource = {
        texture: sprite_map as TextureResource,
        rainbow_texture: create_rainbow_texture(env_provider),
      };
      return res;
    } catch (err) {
      console.error("Error loading resource: ", err);
      return undefined;
    }
  }

  // async load_sound(): Promise<Howl | undefined> {
  //   return new Promise<Howl | undefined>((resolve) => {
  //     const sound = this.howler.createHowl({
  //       src: sfx_json.src,
  //       sprite: sfx_json.sprite,
  //       onload: () => resolve(sound),
  //       onloaderror: (_, errorMsg?: string) => {
  //         console.log("load error! ", errorMsg);
  //         resolve(undefined)
  //       },
  //       onloadprogress: (_, pct) => {
  //         console.log(`Sound loading percent: ${pct}`);
  //       },
  //       onunlock: () => {
  //         console.log("Audio unlocked!");
  //       },
  //     });
  //     if (!sound) {
  //       console.log("failed to cerate howl instance!");
  //       resolve(undefined);
  //       return;
  //     }
  //   });
  // }
}
