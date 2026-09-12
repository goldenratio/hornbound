import { DisposeBag, type Disposable } from "@goldenratio/core-utils";

export const enum ButtonType {
  Up = 1,
  Down,
  Left,
  Right
}

type UpdateFnType = (
  button_pressed: boolean,
  button_type: ButtonType
) => void;

export interface GamepadControls {
  resize(): void;
  set_visible(value: boolean): void;
  set_on_update(fn: UpdateFnType): void;
  dispose(): void;
}

const size = 60;

export class VirtualDOMGamepad implements GamepadControls, Disposable {
  private readonly container: HTMLDivElement;
  private readonly left_arrow: HTMLDivElement;
  private readonly right_arrow: HTMLDivElement;
  private readonly up_arrow: HTMLDivElement;
  private readonly down_arrow: HTMLDivElement;
  private readonly dispose_bag = new DisposeBag();

  private visible: boolean = false;
  private update_fn: UpdateFnType | undefined = undefined;

  constructor() {
    this.container = document.createElement("div");
    // this.container.setAttribute("id", "virtual-dom-gamepad");

    const button_base_style: Partial<CSSStyleDeclaration> = {
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderRadius: "4px",
      border: "2px solid #333",
      boxShadow: "0 4px 0 #000",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: "24px",
      fontFamily: "monospace",
      userSelect: "none",
      // webkitUserSelect: "none",
      // webkitTouchCallout: "none",
    };

    // Helper to generate standard arrow div with rotation
    const create_arrow_element = (rotation_deg: number, grid_area: string): HTMLDivElement => {
      const el = document.createElement("div");

      const span = document.createElement("span");
      span.textContent = "\u25B2";
      span.style.display = "inline-block";
      span.style.transform = `rotate(${rotation_deg}deg)`;

      el.appendChild(span);
      Object.assign(el.style, button_base_style, { gridArea: grid_area });
      return el;
    };

    // Instantiate elements using ▲ rotated 0°, -90°, 90°, and 180°
    this.up_arrow = create_arrow_element(0, "u"); // up
    this.left_arrow = create_arrow_element(-90, "l"); // left
    this.right_arrow = create_arrow_element(90, "r"); // right
    this.down_arrow = create_arrow_element(180, "d"); // down

    const container_style: Partial<CSSStyleDeclaration> = {
      position: "fixed",
      bottom: "2rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "1000",
      display: "none",
      gridTemplateColumns: `repeat(3, ${size}px)`,
      gridTemplateRows: `repeat(3, ${size}px)`,
      gridTemplateAreas: `
        ". u ."
        "l . r"
        ". d ."
      `,
      gap: "8px",
      touchAction: "none",
      userSelect: "none",
    };
    Object.assign(this.container.style, container_style);

    this.container.appendChild(this.up_arrow);
    this.container.appendChild(this.left_arrow);
    this.container.appendChild(this.right_arrow);
    this.container.appendChild(this.down_arrow);
    document.body.appendChild(this.container);

    const bind_arrow = (element: HTMLDivElement, type: ButtonType) => {
      this.dispose_bag.from_event(element, "pointerdown", (event: PointerEvent) => {
        this.update_fn?.(true, type);
        event.preventDefault();
        event.stopPropagation();
      });
      this.dispose_bag.from_event(element, "pointerup", (event: PointerEvent) => {
        this.update_fn?.(false, type);
        event.preventDefault();
        event.stopPropagation();
      });
      this.dispose_bag.from_event(element, "pointercancel", () => {
        this.update_fn?.(false, type);
      });
      this.dispose_bag.from_event(element, "pointerleave", () => {
        this.update_fn?.(false, type);
      });
    };

    // Prevent double-tap zoom and gesture triggers in iOS Safari
    this.dispose_bag.from_event(this.container, "touchstart", (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault(); // Prevents multi-touch pinch zoom over the gamepad
      }
    });

    this.dispose_bag.from_event(this.container, "touchend", (event: TouchEvent) => {
      event.preventDefault();
    });

    bind_arrow(this.left_arrow, ButtonType.Left);
    bind_arrow(this.right_arrow, ButtonType.Right);
    bind_arrow(this.up_arrow, ButtonType.Up);
    bind_arrow(this.down_arrow, ButtonType.Down);

    this.set_visible(true);
    this.resize();
  }

  set_on_update(fn: UpdateFnType): void {
    this.update_fn = fn;
  }

  dispose(): void {
    this.dispose_bag.dispose();
    this.container.remove();
  }

  resize(): void {
    const isLandscape = window.innerWidth > window.innerHeight;

    if (isLandscape) {
      // Expand container across full viewport width to anchor split controls
      Object.assign(this.container.style, {
        left: "0",
        right: "0",
        bottom: "2rem",
        transform: "none",
        width: "100%",
        boxSizing: "border-box",
        padding: "0 2rem",
        gridTemplateColumns: `${size}px ${size}px 1fr ${size}px`,
        gridTemplateRows: `${size}px ${size}px`,
        gridTemplateAreas: `
          "l r . u"
          "l r . d"
        `,
        gap: "8px",
      });
    } else {
      // Reset container back to a centered 3x3 DPAD cross
      Object.assign(this.container.style, {
        left: "50%",
        right: "auto",
        bottom: "2rem",
        transform: "translateX(-50%)",
        width: "auto",
        padding: "0",
        gridTemplateColumns: `repeat(3, ${size}px)`,
        gridTemplateRows: `repeat(3, ${size}px)`,
        gridTemplateAreas: `
          ". u ."
          "l . r"
          ". d ."
        `,
        gap: "8px",
      });
    }
  }

  set_visible(visible: boolean): void {
    if (this.visible === visible) {
      return;
    }
    this.visible = visible;
    if (this.container) {
      this.container.style.display = visible ? "grid" : "none";
    }
  }
}
