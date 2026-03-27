export const CATEGORY_IDS = [
  'shopping',
  'discount',
  'split',
  'change',
  'multiply',
  'fraction',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}
