import { CATEGORY_IDS, type CategoryId } from './category.types';
import type { CatSolvedMap, UserStatsDoc } from './user-stats.model';

/**
 * Smooth wrong-rate weight for category selection (1 = neutral, higher = drill more).
 */
export function categoryDrillWeights(s: UserStatsDoc): Record<CategoryId, number> {
  const out = {} as Record<CategoryId, number>;
  const ids = CATEGORY_IDS;
  for (const id of ids) {
    const ok = s.catSolved[id] ?? 0;
    const bad = s.catWrong[id] ?? 0;
    const n = ok + bad;
    if (n < 2) {
      out[id] = 1;
      continue;
    }
    const wrongRate = bad / n;
    out[id] = 1 + wrongRate * 2.8;
  }
  return out;
}

export function masteryPercent(
  catSolved: CatSolvedMap,
  catWrong: CatSolvedMap,
  cat: CategoryId,
): number {
  const ok = catSolved[cat] ?? 0;
  const bad = catWrong[cat] ?? 0;
  const n = ok + bad;
  if (n === 0) {
    return 0;
  }
  return Math.round((ok / n) * 100);
}

export function weakestCategories(
  s: UserStatsDoc,
  limit: number,
): readonly CategoryId[] {
  const cats = [...CATEGORY_IDS];
  const scored = cats.map((c) => ({
    c,
    w: masteryPercent(s.catSolved, s.catWrong, c),
    n: (s.catSolved[c] ?? 0) + (s.catWrong[c] ?? 0),
  }));
  scored.sort((a, b) => {
    if (b.n !== a.n) {
      return b.n - a.n;
    }
    return a.w - b.w;
  });
  return scored
    .filter((x) => x.n > 0)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Last `days` UTC date keys yyyy-mm-dd with solve counts (newest first). */
export function recentDailySolves(
  dailySolveHistory: Record<string, number>,
  days: number,
): readonly { readonly key: string; readonly count: number }[] {
  const keys = Object.keys(dailySolveHistory).sort((a, b) => b.localeCompare(a));
  return keys.slice(0, days).map((key) => ({
    key,
    count: dailySolveHistory[key] ?? 0,
  }));
}

export function recentDailyWrongs(
  dailyWrongHistory: Record<string, number>,
  days: number,
): readonly { readonly key: string; readonly count: number }[] {
  const keys = Object.keys(dailyWrongHistory).sort((a, b) => b.localeCompare(a));
  return keys.slice(0, days).map((key) => ({
    key,
    count: dailyWrongHistory[key] ?? 0,
  }));
}
