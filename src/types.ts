export interface StorageLike {
  save(key: string, value: string): Promise<boolean>;
  get_value(key: string): Promise<string | undefined>;
}
