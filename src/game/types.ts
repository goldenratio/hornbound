export interface Drawable {
  update(dt: number): void;
  draw(): void;
}

export const enum Direction {
  Up = 1,
  Down,
  Left,
  Right,
}
