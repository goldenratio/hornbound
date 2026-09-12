export function to_2d_array<T>(array: ReadonlyArray<T>, columns: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < array.length; i += columns) {
    result.push(array.slice(i, i + columns));
  }

  return result;
}
