import { debounce } from "@goldenratio/core-utils";

// import { is_game_in_fullscreen } from "./fullscreen.js";
import { GAME_HEIGHT, GAME_WIDTH } from "./game_config.js";

interface Resizable {
  resize(): void;
}

export function setup_canvas_resize(source: HTMLCanvasElement, canvas_interaction?: Resizable): void {
  const g = globalThis;
  function resize_canvas(): void {
    console.log("resize canvas");
    const { innerWidth, innerHeight } = g;

    // const in_fullscreen = is_game_in_fullscreen();
    const in_fullscreen = false;

    if (in_fullscreen || innerWidth < GAME_WIDTH || innerHeight < GAME_HEIGHT) {
      // Scale proportionally to fit globalThis
      const scale = Math.min(innerWidth / GAME_WIDTH, innerHeight / GAME_HEIGHT);
      source.style.width = `${(GAME_WIDTH * scale) | 0}px`;
      source.style.height = `${(GAME_HEIGHT * scale) | 0}px`;
    } else {
      // Default size
      source.style.width = `${GAME_WIDTH}px`;
      source.style.height = `${GAME_HEIGHT}px`;
    }

    canvas_interaction?.resize();
  }

  const debounced_resize_canvas = debounce(resize_canvas, 50);
  g.addEventListener("resize", debounced_resize_canvas);
  if (g.screen && g.screen.orientation) {
    g.screen.orientation.addEventListener("change", debounced_resize_canvas);
  }

  resize_canvas();
}
