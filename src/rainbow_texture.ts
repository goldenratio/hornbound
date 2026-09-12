import { SCALE_MODE, Texture, type EnvProvider } from "@goldenratio/karlib";

export function create_rainbow_texture(env: EnvProvider): Texture {
  const width = 600;
  const height = 600;
  const outerRadius = 220;

  const canvas = env.create_canvas(width, height);
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const cx = width / 2;
    const cy = height * 0.82;
    const band = 30;
    const pixel = 3;

    const colors = [
      "#f04c5f",
      "#ff8b3d",
      "#ffd447",
      "#54c66d",
      "#3d89e8",
      "#8458c8",
    ];

    for (let y = cy - outerRadius; y < cy; y += pixel) {
      for (
        let x = cx - outerRadius;
        x <= cx + outerRadius;
        x += pixel
      ) {
        const dx = x + pixel / 2 - cx;
        const dy = y + pixel / 2 - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const colorIndex = Math.floor(
          (outerRadius - distance) / band,
        );

        if (colorIndex >= 0 && colorIndex < colors.length) {
          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(x, y, pixel, pixel);
        }
      }
    }
  }

  const image = env.create_image_from_canvas(canvas);
  return new Texture(image, width, height, SCALE_MODE.Nearest);
}
