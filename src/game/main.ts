import type { Karlib, TickerData } from "@goldenratio/karlib";
import type { Resource } from "../resource.js";
import { GameScreen } from "./game_screen.js";
import type { GameCanvasInteraction } from "./game_canvas_interaction.js";
import { TitleScreen } from "./title_screen.js";

export class GameMain {
  private title_screen: TitleScreen | undefined = undefined;
  private game_screen: GameScreen | undefined = undefined;

  constructor(
    private readonly kl: Karlib,
    private readonly res: Resource,
    private readonly canvas_interaction: GameCanvasInteraction,
  ) {
    console.log("game main");
    this.title_screen = new TitleScreen(kl, res, canvas_interaction, () => this.init_game());
    // this.game_screen = new GameScreen(kl, res, canvas_interaction);
  }

  update(ticker_data: TickerData): void {
    this.title_screen?.update(ticker_data);
    this.game_screen?.update(ticker_data);
  }

  draw(): void {
    this.kl.clear_background();
    this.title_screen?.draw();
    this.game_screen?.draw();
  }

  init_game(): void {
    if (this.title_screen) {
      this.title_screen.dispose();
      this.title_screen = undefined;
    }
    this.game_screen = new GameScreen(this.kl, this.res, this.canvas_interaction);
  }
}
