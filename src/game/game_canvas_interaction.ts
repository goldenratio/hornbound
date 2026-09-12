import { DisposeBag, NOOP, type Disposable } from "@goldenratio/core-utils";

import { type CanvasInteractionOptions } from "../canvas_interaction.js";
import { ButtonType, VirtualDOMGamepad, type GamepadControls } from "../gamepad.js";
import { is_mobile_like } from "../util.js";
import { Direction } from "./types.js";

const enum TouchFlag {
  None = 0,
  Left = 1 << 0,
  Right = 1 << 1,
  Up = 1 << 2,
  Down = 1 << 3,
}

export class GameCanvasInteraction implements Disposable {
  private readonly dispose_bag = new DisposeBag();
  private readonly gamepad_controls: GamepadControls | undefined = undefined;

  private touch_flags: TouchFlag = TouchFlag.None;
  private keys_down = new Set<string>();
  private keys_pressed = new Set<string>();

  private canvas_tapped: boolean = false;

  constructor(options: CanvasInteractionOptions) {
    this.gamepad_controls = is_mobile_like() ? new VirtualDOMGamepad() : undefined;

    this.gamepad_controls?.set_on_update((button_pressed, button_type) => {
      this.touch_flags = TouchFlag.None;

      if (button_pressed) {
        if (button_type === ButtonType.Right) {
          this.touch_flags |= TouchFlag.Right;
        } else if (button_type === ButtonType.Left) {
          this.touch_flags |= TouchFlag.Left;
        } else if (button_type === ButtonType.Up) {
          this.touch_flags |= TouchFlag.Up;
        } else if (button_type === ButtonType.Down) {
          this.touch_flags |= TouchFlag.Down;
        }
      }
    });

    const keyboard_source = options.keyboard_source;
    this.dispose_bag.from_event(keyboard_source, "keydown", (event: KeyboardEvent) => {
      if (!this.keys_down.has(event.key)) {
        this.keys_pressed.add(event.key);
      }
      this.keys_down.add(event.key);
    });

    this.dispose_bag.from_event(keyboard_source, "keyup", (event: KeyboardEvent) => {
      this.keys_down.delete(event.key);
    });

    this.dispose_bag.from_event(keyboard_source, "blur", (event: Event) => {
      this.on_window_blur();
    });

    const pointer_source = options.pointer_source;
    this.dispose_bag.from_event(pointer_source, "click", () => {
      this.canvas_tapped = true;
    });

    this.set_touch_controls_visible(false);
  }

  dispose(): void {
    this.dispose_bag.dispose();
    this.gamepad_controls?.set_on_update(NOOP);
    this.gamepad_controls?.dispose();
  }

  get_move_direction(): Direction | undefined {
    if (
      this.is_key_pressed("ArrowLeft") ||
      this.is_key_pressed("a") ||
      Boolean(this.touch_flags & TouchFlag.Left)
    ) {
      return Direction.Left;
    }

    if (
      this.is_key_pressed("ArrowRight") ||
      this.is_key_pressed("d") ||
      Boolean(this.touch_flags & TouchFlag.Right)
    ) {
      return Direction.Right;
    }

    if (
      this.is_key_pressed("ArrowUp") ||
      this.is_key_pressed("w") ||
      Boolean(this.touch_flags & TouchFlag.Up)
    ) {
      return Direction.Up;
    }

    if (
      this.is_key_pressed("ArrowDown") ||
      this.is_key_pressed("s") ||
      Boolean(this.touch_flags & TouchFlag.Down)
    ) {
      return Direction.Down;
    }
    return undefined;
  }

  set_touch_controls_visible(value: boolean): void {
    this.gamepad_controls?.set_visible(value);
  }

  /**
   * Checks whether a key is currently held down.
   * @param value - Keyboard key identifier (e.g. `"Shift"`, `"a"`). (MDN Reference) https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
   */
  is_key_down(value: string): boolean {
    return this.keys_down.has(value);
  }

  /**
   * Checks whether a key was pressed since the last call.
   * This is edge-triggered and returns `true` only once per press.
   * @param value - Keyboard key identifier. (MDN Reference) https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
   */
  is_key_pressed(value: string): boolean {
    if (this.keys_pressed.has(value)) {
      this.keys_pressed.delete(value);
      return true;
    }
    return false;
  }

  is_canvas_tapped(): boolean {
    return this.canvas_tapped;
  }

  update(dt: number): void {
    this.keys_pressed.clear();
    this.touch_flags = TouchFlag.None;
    this.canvas_tapped = false;
  }

  resize(): void {
    this.gamepad_controls?.resize();
  }

  private on_window_blur(): void {
    this.keys_down.clear();
    this.keys_pressed.clear();
    this.touch_flags = TouchFlag.None;
  }
}
