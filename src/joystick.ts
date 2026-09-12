import { normalize_angle, to_degrees, DisposeBag, type Disposable } from "@goldenratio/core-utils";

type UpdateFnType = (
  /**
   * value between -1 to 1
   */
  x: number,
  /**
   * value between -1 to 1
   */
  y: number,
  angle_in_degrees: number,
  state: JoyStickState,
) => void;

export const enum JoyStickState {
  Down = 1,
  Up = 2
}

export interface JoyStick {
  resize(): void;
  set_visible(value: boolean): void;
  set_on_update(fn: UpdateFnType): void;
  dispose(): void;
}

export class VirtualDOMJoyStick implements JoyStick, Disposable {
  private readonly dispose_bag = new DisposeBag();
  private is_dragging: boolean = false;
  private joystick_handle: HTMLElement;
  private joystick_base: HTMLElement;
  private joystick_container: HTMLElement;

  private x: number = 0;
  private y: number = 0;
  private angle_in_degrees: number = 0;

  private center_x: number = 0;
  private center_y: number = 0;
  private radius: number = 0;

  private state: JoyStickState = JoyStickState.Up;
  private visible: boolean = false;

  private delay_timer_joystick_bounds: ReturnType<typeof globalThis.setTimeout> | undefined = undefined;

  private update_fn: UpdateFnType | undefined = undefined;

  constructor() {
    this.joystick_container = document.createElement("div"); // #jc
    this.joystick_base = document.createElement("div"); // #jb
    this.joystick_handle = document.createElement("div"); // #jh

    this.joystick_base.appendChild(this.joystick_handle);
    this.joystick_container.appendChild(this.joystick_base);
    document.body.appendChild(this.joystick_container);

    // #jc
    Object.assign(this.joystick_container.style, {
      position: "fixed",
      bottom: "2rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "1",
      display: "none",
      flexDirection: "column",
      alignItems: "center",
      gap: "2rem",
      padding: "1.5rem",
      borderRadius: "1rem",
      touchAction: "none",
      userSelect: "none",
    } as Partial<CSSStyleDeclaration>);

    // #jb
    Object.assign(this.joystick_base.style, {
      width: "150px",
      height: "150px",
      backgroundColor: "rgba(255, 255, 255, .1)",
      borderRadius: "50%",
      position: "relative",
      border: "2px solid rgba(255, 255, 255, .2)",
      boxShadow: "0 4px 6px rgba(0, 0, 0, .1)",
    } as Partial<CSSStyleDeclaration>);

    // #jh
    Object.assign(this.joystick_handle.style, {
      width: "60px",
      height: "60px",
      backgroundColor: "#363656",
      borderRadius: "50%",
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      boxShadow: "0 2px 4px rgba(0, 0, 0, .2)",
      transition: "transform .1s ease-out",
      border: "2px solid #61617e",
    } as Partial<CSSStyleDeclaration>);

    // Touch events
    this.dispose_bag.from_event(this.joystick_base, "touchstart", (event: TouchEvent) => this.handle_start(event));
    this.dispose_bag.from_event(globalThis, "touchmove", (event: TouchEvent) => this.handle_move(event));
    this.dispose_bag.from_event(globalThis, "touchend", (event: TouchEvent) => this.handle_end(event));
    this.dispose_bag.from_event(globalThis, "touchcancel", (event: TouchEvent) => this.handle_end(event));

    this.set_visible(true);
    this.resize();
  }

  dispose(): void {
    this.set_visible(false);
    this.dispose_bag.dispose();
  }

  resize(): void {
    console.log("resize joystick");
    this.update_layout();
  }

  set_on_update(fn: UpdateFnType): void {
    this.update_fn = fn;
  }

  private update_layout(): void {
    this.x = 0;
    this.y = 0;
    this.angle_in_degrees = 0;
    this.state = JoyStickState.Up;

    const is_landscape = globalThis.innerWidth >= globalThis.innerHeight;
    if (is_landscape) {
      Object.assign(this.joystick_container.style, {
        left: "2rem",
        bottom: "2rem",
        transform: "none",
        alignItems: "flex-start",
      } as Partial<CSSStyleDeclaration>);
    } else {
      Object.assign(this.joystick_container.style, {
        left: "50%",
        bottom: "2rem",
        transform: "translateX(-50%)",
        alignItems: "center",
      } as Partial<CSSStyleDeclaration>);
    }

    this.update_joystick_bounds();
    // in iOS webapp (PWA), when orientation is changed there is some delay from system level webview
    // causing issues with bounds calculation, hence we delay and re-calculate it
    this.delayed_update_joystick_bounds();
  }

  set_visible(visible: boolean): void {
    if (this.visible === visible) {
      return;
    }
    this.visible = visible;
    if (this.joystick_container) {
      this.joystick_container.style.display = visible ? "block" : "none";
    }
    this.update_joystick_bounds();
  }

  private handle_start(event: TouchEvent): void {
    this.is_dragging = true;
    this.state = JoyStickState.Down;
    this.handle_move(event);

    event.preventDefault();
    event.stopPropagation();
  }

  private handle_move(event: TouchEvent): void {
    // event.preventDefault();
    if (!this.is_dragging) return;
    if (!event.touches) return;

    let client_x: number = 0;
    let client_y: number = 0;

    console.log(event.touches);
    if (event.touches) {
      client_x = event.touches[0].clientX;
      client_y = event.touches[0].clientY;
    }
    console.log({ client_x, client_y, f: this.center_x, b: this.center_y });
    const dx = client_x - this.center_x;
    const dy = client_y - this.center_y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const max_distance = this.radius;

    let new_x: number;
    let new_y: number;
    const angle = Math.atan2(dy, dx);
    console.log({ dx, dy, distance, max_distance, angle });
    if (distance > max_distance) {
      new_x = max_distance * Math.cos(angle);
      new_y = max_distance * Math.sin(angle);
    } else {
      new_x = dx;
      new_y = dy;
    }

    this.angle_in_degrees = normalize_angle(to_degrees(angle));
    console.log(new_x, new_y);

    this.joystick_handle.style.transform = `translate(-50%, -50%) translate(${new_x}px, ${new_y}px)`;

    // Normalize values to a range of -1 to 1
    const normalized_x = (new_x / max_distance);
    const normalized_y = (new_y / max_distance);

    this.x = normalized_x;
    this.y = normalized_y;

    this.update_fn?.(this.x, this.y, this.angle_in_degrees, this.state);
  }

  private handle_end(event: TouchEvent): void {
    if (!this.is_dragging) {
      return;
    }
    this.is_dragging = false;
    // Reset the handle to the center
    this.joystick_handle.style.transform = `translate(-50%, -50%)`;
    this.update_fn?.(0, 0, 0, JoyStickState.Up);
    this.x = 0;
    this.y = 0;
    this.angle_in_degrees = 0;
    this.state = JoyStickState.Up;
  }

  private delayed_update_joystick_bounds(): void {
    globalThis.clearTimeout(this.delay_timer_joystick_bounds);
    this.delay_timer_joystick_bounds = globalThis.setTimeout(() => {
      this.update_joystick_bounds();
    }, 500);
  }

  private update_joystick_bounds(): void {
    const rect = this.joystick_base.getBoundingClientRect();
    this.center_x = rect.left + rect.width / 2;
    this.center_y = rect.top + rect.height / 2;
    this.radius = rect.width / 2;
  }
}
