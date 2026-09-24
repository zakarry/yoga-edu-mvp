import { teachers, schools, events, clubs, type SearchItem } from '../data';

// These fixtures are the audited seeds. Matching is by complete content, not name.
const samples: SearchItem[] = [...teachers, ...schools, ...events, ...clubs];
export const DIRECTORY_EMPTY_MESSAGE = '現在、この条件に合う掲載先を準備中です';
export function isDemoDirectoryItem(item: SearchItem): boolean {
  if (typeof item.isDemo === 'boolean') return item.isDemo;
  // Old diagnosis snapshots have no flag. Do not mutate or delete their history.
  return samples.some(seed => seed.type === item.type && seed.id === item.id &&
    Object.keys(seed).filter(key => key !== 'isDemo').every(key =>
      JSON.stringify((seed as unknown as Record<string, unknown>)[key]) ===
      JSON.stringify((item as unknown as Record<string, unknown>)[key])));
}
export function visibleDirectoryItems<T extends SearchItem>(items: T[], includeDemo = false): T[] {
  return includeDemo ? items : items.filter(item => !isDemoDirectoryItem(item));
}
