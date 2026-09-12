import { SCALE_MODE, Texture, type EnvProvider } from "@goldenratio/karlib";

export interface BigTextOptions {
  readonly text: string;
  readonly font: string;
  readonly width: number;
  readonly height: number;
  readonly fontHeight: number;
  readonly depth: number;
  readonly colors: [[number, number, number], [number, number, number]];
  readonly threshold?: number;
}

export function create_big_text_texture(options: BigTextOptions, env: EnvProvider): Texture {
  const { text, font, width, height, fontHeight, depth, colors, threshold = 127 } = options;

  const canvas = env.create_canvas(width, height);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.imageSmoothingEnabled = false;

    const lines: string[] = text.split("\n");

    for (let y = depth - 1; y >= 0; --y) {
      ctx.fillStyle = y == 0 ? "#fff" : "#000";
      let line: number = 0;
      for (let l of lines) {
        ctx.fillText(l, width >> 1, y + (line + 1) * fontHeight);
        ++line;
      }
    }

    const image_data: ImageData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < width * height; ++i) {
      if (image_data.data[i * 4 + 3] < threshold) {
        image_data.data[i * 4 + 3] = 0;
        continue;
      }

      const colorIndex: number = image_data.data[i * 4] > 128 ? 0 : 1;
      for (let j = 0; j < 3; ++j) {
        image_data.data[i * 4 + j] = colors[colorIndex][j];
      }
      image_data.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(image_data, 0, 0);
  }
  const canvas_image_data = env.create_image_from_canvas(canvas);
  return new Texture(canvas_image_data, width, height, SCALE_MODE.Nearest);
}
