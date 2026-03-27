import { CATEGORY_IDS, isCategoryId } from './category.types';
import { monthKeyUtc, todayKeyUtc, weekKeyUtc } from './date-week.util';
import type {
  CatSolvedMap,
  ReviewQueueItem,
  UserSettings,
  UserStatsDoc,
} from './user-stats.model';
import type { QuestionMeta } from './question.model';

/** Drops legacy Firestore fields no longer on `UserSettings`. */
export function sanitizeSettings(
  s: UserSettings & { trainingPath?: boolean },
): UserSettings {
  const { trainingPath: _legacyTrainingPath, ...rest } = s;
  return rest;
}

function emptyCats(): CatSolvedMap {
  return CATEGORY_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as CatSolvedMap,
  );
}

export function defaultUserSettings(): UserSettings {
  return {
    sound: false,
    haptic: true,
    difficulty: 'easy',
    highContrast: false,
    theme: 'dark',
    dailyGoal: 0,
    adaptiveDifficulty: false,
    reminderEnabled: false,
    locale: 'en',
    isPro: false,
    smartPractice: true,
    timedMode: false,
    timePerQuestionSec: 45,
    hintVisibleDefault: false,
    focusCategory: '',
    reduceMotion: false,
    largeText: false,
  };
}

function parseReviewQueue(raw: unknown): ReviewQueueItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ReviewQueueItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const o = row as Record<string, unknown>;
    const text = typeof o['text'] === 'string' ? o['text'] : '';
    const ans = typeof o['ans'] === 'number' ? o['ans'] : NaN;
    const cat = o['cat'];
    const templateKey =
      typeof o['templateKey'] === 'string' ? o['templateKey'] : '';
    if (!text || !Number.isFinite(ans) || typeof cat !== 'string' || !isCategoryId(cat)) {
      continue;
    }
    const hint = typeof o['hint'] === 'string' ? o['hint'] : undefined;
    const meta =
      o['meta'] && typeof o['meta'] === 'object'
        ? (o['meta'] as QuestionMeta)
        : undefined;
    out.push({
      text,
      ans,
      cat: cat as ReviewQueueItem['cat'],
      templateKey,
      hint,
      meta,
    });
  }
  return out.slice(0, 20);
}

export function newUserStatsDoc(): UserStatsDoc {
  const today = todayKeyUtc();
  const wk = weekKeyUtc();
  const mk = monthKeyUtc();
  return {
    totalSolved: 0,
    totalCorrect: 0,
    totalWrong: 0,
    xp: 0,
    catSolved: emptyCats(),
    catWrong: emptyCats(),
    reviewQueue: [],
    activeDays: [],
    todaySolved: 0,
    todayDate: today,
    settings: defaultUserSettings(),
    weeklyXp: 0,
    weekKey: wk,
    monthlyXp: 0,
    monthKey: mk,
    dailySolveHistory: {},
    dailyWrongHistory: {},
  };
}

export function normalizeUserStats(raw: Record<string, unknown>): UserStatsDoc {
  const base = newUserStatsDoc();
  const settingsIn = (raw['settings'] as Partial<UserSettings> | undefined) ?? {};
  const catIn = (raw['catSolved'] as Partial<CatSolvedMap> | undefined) ?? {};
  const catWrongIn =
    (raw['catWrong'] as Partial<CatSolvedMap> | undefined) ?? {};
  const mergedCats = { ...base.catSolved };
  const mergedWrong = { ...base.catWrong };
  for (const id of CATEGORY_IDS) {
    mergedCats[id] = typeof catIn[id] === 'number' ? catIn[id]! : 0;
    mergedWrong[id] = typeof catWrongIn[id] === 'number' ? catWrongIn[id]! : 0;
  }
  const doc: UserStatsDoc = {
    ...base,
    ...raw,
    totalSolved: num(raw['totalSolved'], base.totalSolved),
    totalCorrect: num(raw['totalCorrect'], base.totalCorrect),
    totalWrong: num(raw['totalWrong'], base.totalWrong),
    xp: num(raw['xp'], base.xp),
    catSolved: mergedCats,
    catWrong: mergedWrong,
    reviewQueue: parseReviewQueue(raw['reviewQueue']),
    activeDays: Array.isArray(raw['activeDays'])
      ? (raw['activeDays'] as string[])
      : [],
    todaySolved: num(raw['todaySolved'], base.todaySolved),
    todayDate: str(raw['todayDate'], base.todayDate),
    settings: sanitizeSettings({ ...base.settings, ...settingsIn }),
    weeklyXp: num(raw['weeklyXp'], base.weeklyXp),
    weekKey: str(raw['weekKey'], base.weekKey),
    monthlyXp: num(raw['monthlyXp'], base.monthlyXp),
    monthKey: str(raw['monthKey'], base.monthKey),
    dailySolveHistory:
      raw['dailySolveHistory'] &&
      typeof raw['dailySolveHistory'] === 'object' &&
      raw['dailySolveHistory'] !== null
        ? { ...(raw['dailySolveHistory'] as Record<string, number>) }
        : {},
    dailyWrongHistory:
      raw['dailyWrongHistory'] &&
      typeof raw['dailyWrongHistory'] === 'object' &&
      raw['dailyWrongHistory'] !== null
        ? { ...(raw['dailyWrongHistory'] as Record<string, number>) }
        : {},
  };
  delete (doc as unknown as Record<string, unknown>)['bestStreak'];
  return doc;
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
