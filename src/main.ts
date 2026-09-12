import { Karlib, BrowserTicker } from "@goldenratio/karlib";

import { AssetLoader } from "./resource.js";
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from "./game_config.js";
import { Stats } from "./stats.js";
import { setup_canvas_resize } from "./canvas_resize_utils.js";
import { GameMain } from "./game/main.js";
import { GameCanvasInteraction } from "./game/game_canvas_interaction.js";
import { setup_fullscreen } from "./fullscreen.js";
import { is_mobile_like } from "./util.js";

async function main(): Promise<void> {
  const d = document;
  // const ofc_supported = "OffscreenCanvas" in globalThis;
  // if (!ofc_supported) {
  //   alert("Your web browser is outdated. Please update your browser to play this game.");
  // }

  // const loader_container = d.getElementById("loader-container");
  // const loader_status = d.getElementById("loader-status");
  // if (loader_status) {
  //   loader_status.innerText = "assets";
  // }
  //

  const canvas = d.createElement("canvas");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;

  // pixel art
  const pixel_perfect: boolean = true;

  Object.assign(canvas.style, <CSSStyleDeclaration>{
    // Style for centering
    // display: "none",
    margin: "auto",
    position: "absolute",
    top: "0",
    bottom: "0",
    left: "0",
    right: "0",
    maxWidth: "100%",
    maxHeight: "100%",
    imageRendering: pixel_perfect ? "pixelated" : "smooth",
    // disable system UI and hijack scroll
    touchAction: "none",
    userSelect: "none",
    webkitUserSelect: "none"
  });


  Object.assign(d.body.style, <CSSStyleDeclaration>{
    // backgroundColor: is_mobile_like() ? "#84c669" : BACKGROUND_COLOR,
    backgroundColor: BACKGROUND_COLOR,
    margin: "0",
    height: "100vh",
    overflow: "hidden",
  });

  d.body.appendChild(canvas);

  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  }, false);

  const kl = new Karlib({ canvas, pixel_perfect });
  const asset_loader = new AssetLoader(kl);

  const res = (await asset_loader.load())!;
  console.log("resource loading complete!");

  // hide loader and show canvas
  // if (loader_container) {
  //   loader_container.style.display = "none";
  //   d.body.removeChild(loader_container);
  // }

  // canvas.style.display = "block";

  const canvas_interaction = new GameCanvasInteraction({
    pointer_source: canvas,
    keyboard_source: globalThis,
  });

  // if (process.env.PROD) {
  //   check_domain(kl);
  // }

  setup_canvas_resize(canvas, canvas_interaction);
  // setup_fullscreen();

  // entities
  const game = new GameMain(kl, res, canvas_interaction);
  let stats: Stats | undefined = undefined;

  __DEBUG__: {
    stats = new Stats();
    stats.showPanel(0);
    d.body.appendChild(stats.dom);
  }

  const ticker = new BrowserTicker();
  ticker.on_tick((ticker_data) => {
    __DEBUG__: {
      stats?.begin();
    }

    // update
    game.update(ticker_data);
    canvas_interaction.update(ticker_data.delta_time);

    // draw
    game.draw();

    __DEBUG__: {
      stats?.end();
    }
  });
}

  // window.onerror = (msg: Event | string, url?: string, line?: number, col?: number, error?: Error) => {
  //   var extra = !col ? "" : "\ncolumn: " + col;
  //   extra += !error ? "" : "\nerror: " + error;
  //   const stack = msg instanceof Error ? msg.stack ?? "" : "";
  //   alert("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra + "\nstack: " + stack);
  //   return true;
  // };

  // window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  //   alert("Promise rejection: " + event.reason);
  // };

globalThis.onload = () => main();
