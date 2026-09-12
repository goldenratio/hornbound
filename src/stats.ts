/**
 * @author mrdoob / http://mrdoob.com/
 */

export interface PanelLike {
  dom: HTMLElement;
  update(value: number, maxValue: number): void;
}

export class StatsPanel implements PanelLike {
  public readonly dom: HTMLCanvasElement;

  private min = Infinity;
  private max = 0;
  private readonly round = Math.round;

  private readonly context: CanvasRenderingContext2D;
  private readonly pr: number;

  private readonly WIDTH: number;
  private readonly HEIGHT: number;
  private readonly TEXT_X: number;
  private readonly TEXT_Y: number;
  private readonly GRAPH_X: number;
  private readonly GRAPH_Y: number;
  private readonly GRAPH_WIDTH: number;
  private readonly GRAPH_HEIGHT: number;

  constructor(
    private readonly name: string,
    private readonly fg: string,
    private readonly bg: string,
  ) {
    this.pr = this.round(globalThis.devicePixelRatio || 1);

    this.WIDTH = 80 * this.pr;
    this.HEIGHT = 48 * this.pr;
    this.TEXT_X = 3 * this.pr;
    this.TEXT_Y = 2 * this.pr;
    this.GRAPH_X = 3 * this.pr;
    this.GRAPH_Y = 15 * this.pr;
    this.GRAPH_WIDTH = 74 * this.pr;
    this.GRAPH_HEIGHT = 30 * this.pr;

    const canvas = document.createElement("canvas");
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;
    canvas.style.cssText = "width:80px;height:48px";

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to acquire 2D canvas context.");
    }

    this.dom = canvas;
    this.context = context;

    context.font = `bold ${9 * this.pr}px Helvetica,Arial,sans-serif`;
    context.textBaseline = "top";

    context.fillStyle = this.bg;
    context.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    context.fillStyle = this.fg;
    context.fillText(this.name, this.TEXT_X, this.TEXT_Y);
    context.fillRect(this.GRAPH_X, this.GRAPH_Y, this.GRAPH_WIDTH, this.GRAPH_HEIGHT);

    context.fillStyle = this.bg;
    context.globalAlpha = 0.9;
    context.fillRect(this.GRAPH_X, this.GRAPH_Y, this.GRAPH_WIDTH, this.GRAPH_HEIGHT);
  }

  update(value: number, maxValue: number): void {
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);

    const { context } = this;

    context.fillStyle = this.bg;
    context.globalAlpha = 1;
    context.fillRect(0, 0, this.WIDTH, this.GRAPH_Y);

    context.fillStyle = this.fg;
    context.fillText(
      `${this.round(value)} ${this.name} (${this.round(this.min)}-${this.round(this.max)})`,
      this.TEXT_X,
      this.TEXT_Y,
    );

    context.drawImage(
      this.dom,
      this.GRAPH_X + this.pr,
      this.GRAPH_Y,
      this.GRAPH_WIDTH - this.pr,
      this.GRAPH_HEIGHT,
      this.GRAPH_X,
      this.GRAPH_Y,
      this.GRAPH_WIDTH - this.pr,
      this.GRAPH_HEIGHT,
    );

    context.fillRect(
      this.GRAPH_X + this.GRAPH_WIDTH - this.pr,
      this.GRAPH_Y,
      this.pr,
      this.GRAPH_HEIGHT,
    );

    context.fillStyle = this.bg;
    context.globalAlpha = 0.9;
    context.fillRect(
      this.GRAPH_X + this.GRAPH_WIDTH - this.pr,
      this.GRAPH_Y,
      this.pr,
      this.round((1 - value / maxValue) * this.GRAPH_HEIGHT),
    );
  }
}

export class Stats {
  public static readonly REVISION = 16;
  public static readonly Panel = StatsPanel;

  public readonly dom: HTMLDivElement;
  /** Backwards compatibility alias */
  public readonly domElement: HTMLDivElement;
  public readonly setMode: (id: number) => void;

  private mode = 0;
  private beginTime = 0;
  private prevTime = 0;
  private frames = 0;

  private readonly fpsPanel: PanelLike;
  private readonly msPanel: PanelLike;
  private readonly memPanel?: PanelLike;

  constructor() {
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000";

    container.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        this.showPanel((++this.mode) % container.children.length);
      },
      false,
    );

    const addPanel = (panel: PanelLike): PanelLike => {
      container.appendChild(panel.dom);
      return panel;
    };

    this.showPanel = (id: number): void => {
      for (let i = 0; i < container.children.length; i++) {
        const child = container.children[i] as HTMLElement;
        child.style.display = i === id ? "block" : "none";
      }
      this.mode = id;
    };

    const now = Stats.now();
    this.beginTime = now;
    this.prevTime = now;

    this.fpsPanel = addPanel(new StatsPanel("FPS", "#0ff", "#002"));
    this.msPanel = addPanel(new StatsPanel("MS", "#0f0", "#020"));

    const perf = globalThis.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (perf?.memory) {
      this.memPanel = addPanel(new StatsPanel("MB", "#f08", "#201"));
    }

    this.showPanel(0);

    this.dom = container;
    this.domElement = container;
    this.setMode = this.showPanel;
  }

  private static now(): number {
    return (globalThis.performance ?? Date).now();
  }

  showPanel(_id: number): void {
    // replaced in constructor
  }

  addPanel(panel: PanelLike): PanelLike {
    this.dom.appendChild(panel.dom);
    return panel;
  }

  begin(): void {
    this.beginTime = Stats.now();
  }

  end(): number {
    this.frames += 1;

    const time = Stats.now();

    this.msPanel.update(time - this.beginTime, 200);

    if (time >= this.prevTime + 1000) {
      this.fpsPanel.update((this.frames * 1000) / (time - this.prevTime), 100);

      this.prevTime = time;
      this.frames = 0;

      if (this.memPanel) {
        const perf = globalThis.performance as Performance & {
          memory?: {
            usedJSHeapSize: number;
            jsHeapSizeLimit: number;
          };
        };

        const memory = perf.memory;
        if (memory) {
          this.memPanel.update(
            memory.usedJSHeapSize / 1048576,
            memory.jsHeapSizeLimit / 1048576,
          );
        }
      }
    }

    return time;
  }

  update(): void {
    this.beginTime = this.end();
  }
}

