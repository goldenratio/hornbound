import { debounce, is_between } from "@goldenratio/core-utils";

import fullscreenIcon from "./assets/full_screen.png";
import { is_pwa } from "./util.js";

type FullscreenOrientationType = "landscape-primary" | "portrait-primary";

const img_src = fullscreenIcon
const fullscreen_orientation: FullscreenOrientationType = process.env.GAME_META_FULLSCREEN_ORIENTATION;

export function setup_fullscreen(): void {
  const skip_fullscreen = !is_fullscreen_supported() || is_pwa();
  console.log("skip fullscreen setup: ", skip_fullscreen);
  if (skip_fullscreen) {
    return;
  }

  const button_size = 24;
  const fullscreen_button = document.createElement("div");
  fullscreen_button.title = "Go Fullscreen";

  const img = new Image();
  img.src = img_src;
  img.width = button_size;
  img.style.display = "block";
  if (process.env.PROD) {
    img.onerror = () => {
      fullscreen_button.style.display = "none";
    };
  }
  fullscreen_button.appendChild(img);

  Object.assign(fullscreen_button.style, <CSSStyleDeclaration>{
    position: "fixed",
    zIndex: "2",
    right: "0",
    top: "0",
    textAlign: "center",
    height: `${button_size}px`,
    cursor: "pointer",
    padding: "2px",
    margin: "4px",
    backgroundColor: "#35354a",
    borderRadius: "6px",
  });
  document.body.appendChild(fullscreen_button);

  const show_button = (state: boolean): void => {
    if (state) {
      fullscreen_button.style.display = "block";
    } else {
      fullscreen_button.style.display = "none";
    }
  };

  const on_fullscreen_change = debounce(() => {
    if (is_game_in_fullscreen()) {
      show_button(false);
      // try locking screen to `fullscreen_orientation`
      try {
        lock_screen(fullscreen_orientation);
      } catch (err) {
        console.error(err);
      }
    } else {
      show_button(true);
    }
  }, 200);

  document.addEventListener("fullscreenchange", on_fullscreen_change);

  fullscreen_button.addEventListener("click", () => {
    if (!is_game_in_fullscreen()) {
      document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } else {
      document.exitFullscreen();
    }
  });

  if (is_game_in_fullscreen()) {
    show_button(false);
  } else {
    show_button(true);
  }
}

export function is_game_in_fullscreen(): boolean {
  // @ts-expect-error it is fine, below code is type safe
  const fullscreenElement = document["fullscreenElement"] || document["mozFullScreenElement"] || document["webkitFullscreenElement"] || document["msFullscreenElement"];
  if (fullscreenElement) {
    return true;
  }

  const width_diff = Math.abs(globalThis.screen.width - globalThis.innerWidth);
  const height_diff = Math.abs(globalThis.screen.height - globalThis.innerHeight);
  return is_between(width_diff, 0, 2) && is_between(height_diff, 0, 2);
}

function lock_screen(type: FullscreenOrientationType): boolean {
  if (screen["orientation"] && screen["orientation"]["lock"]) {
    screen["orientation"]["lock"](type);
    return true;
  }

  // @ts-expect-error it is fine, below code is type safe
  const lockOrientation = screen["lockOrientation"] || screen["mozLockOrientation"] || screen["msLockOrientation"] || undefined;
  if (lockOrientation) {
    return lockOrientation(type);
  }

  return false;
}

function is_fullscreen_supported(): boolean {
  // @ts-expect-error it is fine, below code is type safe
  return typeof (document["fullscreenEnabled"] || document["mozFullScreenEnabled"] || document["webkitFullscreenEnabled"] || document["msFullscreenEnabled"]) === "boolean";
}
