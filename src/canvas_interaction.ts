import { DisposeBag, is_between } from "@goldenratio/core-utils";
import type { Mutable, Disposable } from "@goldenratio/core-utils";
import type { EventSourceLike, Point, Rectangle } from "@goldenratio/karlib";
import { rect_contains_point } from "@goldenratio/karlib";

const PRIMARY_BUTTON = 0;

export interface CanvasInteractionOptions {
  /**
   * Event source used for pointer / mouse events.
   * Typically a canvas or canvas-like element.
   */
  readonly pointer_source: EventSourceLike;

  /**
   * Event source used for keyboard events.
   * Typically `window` or `document`.
   */
  readonly keyboard_source: EventSourceLike;
}

interface PointerEventData {
  readonly x: number;
  readonly y: number;
  readonly button: number;
  readonly is_up: boolean;
  readonly is_down: boolean;
  readonly is_tap: boolean;
}

function is_dom_canvas_like(value: unknown): value is HTMLCanvasElement {
  if (value && typeof value === "object" && "getBoundingClientRect" in value) {
    return true;
  }
  return false;
}

function canvas_point_from_event(canvas: EventSourceLike, event: PointerEvent | MouseEvent): Point {
  if (is_dom_canvas_like(canvas)) {
    const rect = canvas.getBoundingClientRect();

    let clientX = event.clientX;
    let clientY = event.clientY;

    // position inside the element in CSS pixels
    const css_x = clientX - rect.left;
    const css_y = clientY - rect.top;

    // scale CSS pixels -> canvas backing pixels
    const scale_x = canvas.width / rect.width;
    const scale_y = canvas.height / rect.height;

    return {
      x: (css_x * scale_x) | 0,
      y: (css_y * scale_y) | 0,
    };
  }

  return {
    x: event.x | 0,
    y: event.y | 0
  }
}

/**
 * Manages and abstracts user interactions (pointer and keyboard) for a canvas element.
 */
export class CanvasInteraction implements Disposable {
  private readonly dispose_bag = new DisposeBag();

  private keys_down = new Set<string>();
  private keys_pressed = new Set<string>();

  private window_hidden: boolean = false;

  private current_pointer_data: Mutable<PointerEventData> = {
    x: Infinity,
    y: Infinity,
    button: 0,
    is_up: false,
    is_down: false,
    is_tap: false,
  };

  constructor(options: CanvasInteractionOptions) {
    const { pointer_source, keyboard_source } = options;

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

    const on_touch_down = (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const on_touch_up = (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const on_touch_move = (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const on_pointer_down = (event: PointerEvent | MouseEvent) => {
      const offset_point = canvas_point_from_event(pointer_source, event);
      this.current_pointer_data.x = offset_point.x;
      this.current_pointer_data.y = offset_point.y;
      this.current_pointer_data.button = ("button" in event) ? event.button : 0;
      this.current_pointer_data.is_down = true;
      this.current_pointer_data.is_up = false;
      this.current_pointer_data.is_tap = false;

      event.preventDefault?.();
      event.stopPropagation?.();
    };

    const on_pointer_up = (event: PointerEvent | MouseEvent) => {
      const offset_point = canvas_point_from_event(pointer_source, event);
      const diff_x = Math.abs(this.current_pointer_data.x - offset_point.x);
      const diff_y = Math.abs(this.current_pointer_data.y - offset_point.y);

      const tap_error_threshold = 5;
      if (is_between(diff_x, 0, tap_error_threshold) && is_between(diff_y, 0, tap_error_threshold)) {
        this.current_pointer_data.is_tap = true;
      }

      this.current_pointer_data.x = offset_point.x;
      this.current_pointer_data.y = offset_point.y;
      this.current_pointer_data.button = ("button" in event) ? event.button : 0;
      this.current_pointer_data.is_up = true;
      this.current_pointer_data.is_down = false;

      event.preventDefault?.();
      event.stopPropagation?.();
    };

    const on_pointer_move = (event: PointerEvent | MouseEvent) => {
      // if (event instanceof PointerEvent && event.pointerType === "touch") {
      //   return;
      // }
      // console.log("pointer move: ", event);
      const offset_point = canvas_point_from_event(pointer_source, event);
      const diff_x = Math.abs(this.current_pointer_data.x - offset_point.x);
      const diff_y = Math.abs(this.current_pointer_data.y - offset_point.y);

      const tap_error_threshold = 5;
      if (is_between(diff_x, 0, tap_error_threshold) && is_between(diff_y, 0, tap_error_threshold)) {
        return;
      }

      this.current_pointer_data.x = offset_point.x;
      this.current_pointer_data.y = offset_point.y;
      this.current_pointer_data.button = 0;
      this.current_pointer_data.is_down = false;
      this.current_pointer_data.is_up = false;
      this.current_pointer_data.is_tap = false;
    };

    this.dispose_bag.from_event(pointer_source, "touchstart", (event: TouchEvent) => on_touch_down(event));
    this.dispose_bag.from_event(pointer_source, "touchmove", (event: TouchEvent) => on_touch_move(event));
    this.dispose_bag.from_event(pointer_source, "touchend", (event: TouchEvent) => on_touch_up(event));
    this.dispose_bag.from_event(pointer_source, "touchcancel", (event: TouchEvent) => on_touch_down(event));

    const supports_pointer_events = typeof globalThis !== "undefined" && "PointerEvent" in globalThis;
    if (supports_pointer_events) {
      this.dispose_bag.from_event(pointer_source, "pointerdown", (event: PointerEvent) => on_pointer_down(event));
      this.dispose_bag.from_event(pointer_source, "pointerup", (event: PointerEvent) => on_pointer_up(event));
      this.dispose_bag.from_event(pointer_source, "pointermove", (event: PointerEvent) => on_pointer_move(event));
      this.dispose_bag.from_event(pointer_source, "pointerout", (event: PointerEvent) => on_pointer_move(event));
    } else {
      this.dispose_bag.from_event(pointer_source, "mousedown", (event: MouseEvent) => on_pointer_down(event));
      this.dispose_bag.from_event(pointer_source, "mouseup", (event: MouseEvent) => on_pointer_up(event));
      this.dispose_bag.from_event(pointer_source, "mousemove", (event: MouseEvent) => on_pointer_move(event));
      this.dispose_bag.from_event(pointer_source, "mouseout", (event: MouseEvent) => on_pointer_move(event));
    }

    if (typeof document !== "undefined") {
      this.window_hidden = document.hidden;
      this.dispose_bag.from_event(globalThis, "visibilitychange", () => {
        if (this.window_hidden) {
          return;
        }
        this.window_hidden = document.hidden;
      });
    }
  }

  dispose(): void {
    this.dispose_bag.dispose();
  }

  reset(): void {
    this.current_pointer_data.is_up = false;
    this.current_pointer_data.is_down = false;
    this.current_pointer_data.is_tap = false;
    this.window_hidden = false;

    this.keys_down.clear();
    this.keys_pressed.clear();
  }

  /**
   * Checks if the primary pointer button was pressed down inside the given rectangle.
   * @param hit_rect - Rectangle to test against
   */
  is_primary_pointer_down(hit_rect: Rectangle): boolean {
    if (
      this.current_pointer_data.is_down &&
      this.current_pointer_data.button === PRIMARY_BUTTON &&
      rect_contains_point(hit_rect, this.current_pointer_data)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Checks if the primary pointer button was released inside the given rectangle.
   * This is a one-shot query: calling it consumes the `is_up` state.
   * @param hit_rect - Rectangle to test against
   */
  is_primary_pointer_up(hit_rect: Rectangle): boolean {
    if (
      this.current_pointer_data.is_up &&
      this.current_pointer_data.button === PRIMARY_BUTTON &&
      rect_contains_point(hit_rect, this.current_pointer_data)
    ) {
      this.current_pointer_data.is_up = false;
      return true;
    }
    return false;
  }

  /**
   * Checks whether the primary pointer is currently hovering inside the given rectangle.
   * @param hit_rect - Rectangle to test against
   */
  is_primary_pointer_hover(hit_rect: Rectangle): boolean {
    if (
      this.current_pointer_data.is_down === false &&
      this.current_pointer_data.button === PRIMARY_BUTTON &&
      rect_contains_point(hit_rect, this.current_pointer_data)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Checks if a primary-button tap occurred inside the rectangle.
   * A tap is defined as a press + release with minimal movement.
   * This is a one-shot query: calling it consumes the tap state.
   *
   * @param hit_rect - Rectangle to test against
   */
  is_primary_tap(hit_rect: Rectangle): boolean {
    if (
      this.current_pointer_data.is_tap &&
      this.current_pointer_data.button === PRIMARY_BUTTON &&
      rect_contains_point(hit_rect, this.current_pointer_data)
    ) {
      this.current_pointer_data.is_tap = false;
      return true;
    }
    return false;
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

  is_window_hidden(): boolean {
    const value = this.window_hidden;
    return value;
  }

  update(dt: number): void {
    this.keys_pressed.clear();
  }

  clear_window_hidden(): void {
    this.window_hidden = false;
  }

  private on_window_blur(): void {
    this.keys_down.clear();
    this.keys_pressed.clear();
  }
}
