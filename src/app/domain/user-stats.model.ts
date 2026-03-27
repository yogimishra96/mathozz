import type { CategoryId } from './category.types';
import type { QuestionMeta } from './question.model';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ThemeMode = 'dark' | 'light';

export type AppLocale = 'en' | 'hi';

export type FocusCategory = CategoryId | '';

export interface UserSettings {
  sound: boolean;
  haptic: boolean;
  difficulty: Difficulty;
  highContrast: boolean;
  theme: ThemeMode;
  dailyGoal: number;
  adaptiveDifficulty: boolean;
  reminderEnabled: boolean;
  locale: AppLocale;
  isPro: boolean;
  /** Bias weak skills + spaced review queue. */
  smartPractice: boolean;
  timedMode: boolean;
  /** Seconds; 0 with timedMode still off in UI — use timedMode && timePerQuestionSec > 0. */
  timePerQuestionSec: number;
  /** Show hint strip without tapping. */
  hintVisibleDefault: boolean;
  /** Drill one skill; empty = none. */
  focusCategory: FocusCategory;
  reduceMotion: boolean;
  largeText: boolean;
}

export type CatSolvedMap = Record<CategoryId, number>;

/** Wrong-answer snapshot for spaced repetition. */
export interface ReviewQueueItem {
  readonly text: string;
  readonly ans: number;
  readonly cat: CategoryId;
  readonly templateKey: string;
  readonly hint?: string;
  readonly meta?: QuestionMeta;
}

export interface UserStatsDoc {
  totalSolved: number;
  totalCorrect: number;
  totalWrong: number;
  xp: number;
  catSolved: CatSolvedMap;
  catWrong: CatSolvedMap;
  reviewQueue: ReviewQueueItem[];
  activeDays: string[];
  todaySolved: number;
  todayDate: string;
  settings: UserSettings;
  weeklyXp: number;
  weekKey: string;
  monthlyXp: number;
  monthKey: string;
  dailySolveHistory: Record<string, number>;
  dailyWrongHistory: Record<string, number>;
}
