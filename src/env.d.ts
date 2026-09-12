declare namespace NodeJS {
  interface ProcessEnv {
    readonly RES_DIR: string;
    readonly TITLE: string;
    readonly TARGET: "web" | "node";
    readonly NODE_ENV: "development" | "production";
    readonly PROD: "true" | "false";
    // game meta
    readonly GAME_META_URL_SLUG: string;
    readonly GAME_META_EXE_NAME: string;
    readonly GAME_META_SHORT_NAME: string;
    readonly GAME_META_BACKGROUND_COLOR: string;
    readonly GAME_META_FULLSCREEN_ORIENTATION: "portrait-primary" | "landscape-primary";
  }
}

declare module '*.png' {
  const dataUrl: string;
  export default dataUrl;
}
