import type { Difficulty } from './user-stats.model';

/** @deprecated Kept for Firestore docs; UI does not enforce a daily cap. */
export const DEFAULT_DAILY_GOAL = 0;

/**
 * ## Points (per correct answer)
 *
 * | Difficulty | Points |
 * |------------|--------|
 * | easy       | 1      |
 * | medium     | 2      |
 * | hard       | 3      |
 *
 * Wrong answers: no points. Leaderboard uses the same **xp** total.
 */
export const XP_PER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};
