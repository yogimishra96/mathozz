import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { User } from 'firebase/auth';
import { from, of, switchMap } from 'rxjs';
import { CATEGORY_IDS } from '../../domain/category.types';
import { monthKeyUtc, todayKeyUtc, weekKeyUtc } from '../../domain/date-week.util';
import { XP_PER } from '../../domain/game-constants';
import { categoryDrillWeights } from '../../domain/skill-analytics';
import { newUserStatsDoc, sanitizeSettings } from '../../domain/user-stats.factory';
import type { CategoryId } from '../../domain/category.types';
import type {
  Difficulty,
  ReviewQueueItem,
  UserStatsDoc,
} from '../../domain/user-stats.model';
import { AuthSessionService } from '../auth/auth-session.service';
import { FEEDBACK_REPOSITORY, LEADERBOARD_REPOSITORY, USER_STATS_REPOSITORY } from '../data/data.tokens';
import type { FeedbackRepository } from '../data/feedback.repository';
import type { LeaderboardRepository } from '../data/leaderboard.repository';
import type { UserStatsRepository } from '../data/user-stats.repository';
import { I18nService } from '../i18n/i18n.service';

@Injectable({ providedIn: 'root' })
export class UserProgressService {
  private readonly auth = inject(AuthSessionService);
  private readonly users = inject(USER_STATS_REPOSITORY) as UserStatsRepository;
  private readonly board = inject(LEADERBOARD_REPOSITORY) as LeaderboardRepository;
  private readonly feedback = inject(FEEDBACK_REPOSITORY) as FeedbackRepository;
  private readonly i18n = inject(I18nService);

  readonly stats = signal<UserStatsDoc | null>(null);
  readonly loadError = signal<string | null>(null);

  constructor() {
    toObservable(this.auth.user)
      .pipe(
        switchMap((u) => {
          if (!u) {
            this.stats.set(null);
            return of(null);
          }
          return from(this.hydrateForUser(u));
        }),
      )
      .subscribe((doc) => {
        if (doc) {
          this.stats.set(doc);
          this.i18n.setLocale(doc.settings.locale);
        }
      });
  }

  private async hydrateForUser(user: User): Promise<UserStatsDoc> {
    this.loadError.set(null);
    try {
      const today = todayKeyUtc();
      const wk = weekKeyUtc();
      const mk = monthKeyUtc();
      let doc = await this.users.fetch(user.uid);
      if (!doc) {
        doc = newUserStatsDoc();
        await this.users.seed(user.uid, doc);
      } else {
        const patches: Record<string, unknown> = {};
        if (doc.todayDate !== today) {
          doc.todayDate = today;
          doc.todaySolved = 0;
          patches['todayDate'] = today;
          patches['todaySolved'] = 0;
        }
        if (doc.weekKey !== wk) {
          doc.weekKey = wk;
          doc.weeklyXp = 0;
          patches['weekKey'] = wk;
          patches['weeklyXp'] = 0;
        }
        if (doc.monthKey !== mk) {
          doc.monthKey = mk;
          doc.monthlyXp = 0;
          patches['monthKey'] = mk;
          patches['monthlyXp'] = 0;
        }
        if (Object.keys(patches).length) {
          await this.users.patch(user.uid, patches);
        }
      }
      try {
        await this.writeLeaderboard(user, doc);
      } catch {
        /* leaderboard is best-effort */
      }
      return doc;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'load failed';
      this.loadError.set(msg);
      return newUserStatsDoc();
    }
  }

  displayName(user: User | null): string {
    if (!user) {
      return 'Guest';
    }
    return user.displayName || (user.isAnonymous ? 'Guest' : 'User');
  }

  async patchSettings(partial: Partial<UserStatsDoc['settings']>): Promise<void> {
    const u = this.auth.user();
    const s = this.stats();
    if (!u || !s) {
      return;
    }
    const next = sanitizeSettings({ ...s.settings, ...partial });
    this.stats.set({ ...s, settings: next });
    await this.users.patch(u.uid, { settings: next });
    if (partial.locale) {
      this.i18n.setLocale(partial.locale);
    }
  }

  categoryWeightsForPractice(): Partial<Record<CategoryId, number>> {
    const s = this.stats();
    if (!s?.settings.smartPractice) {
      return {};
    }
    return categoryDrillWeights(s);
  }

  async recordCorrect(args: {
    category: CategoryId;
    difficulty: Difficulty;
    solvedTemplateKey?: string;
  }): Promise<void> {
    const u = this.auth.user();
    let s = this.stats();
    if (!u || !s) {
      return;
    }
    const { category, difficulty, solvedTemplateKey } = args;
    const gain = XP_PER[difficulty] ?? XP_PER.easy;
    const today = todayKeyUtc();
    const wk = weekKeyUtc();
    const mk = monthKeyUtc();
    s = {
      ...s,
      totalSolved: s.totalSolved + 1,
      totalCorrect: s.totalCorrect + 1,
      xp: s.xp + gain,
      todaySolved: s.todaySolved + 1,
      catSolved: { ...s.catSolved, [category]: (s.catSolved[category] ?? 0) + 1 },
      activeDays: s.activeDays.includes(today)
        ? s.activeDays
        : [...s.activeDays, today].slice(-60),
      dailySolveHistory: {
        ...s.dailySolveHistory,
        [today]: (s.dailySolveHistory[today] ?? 0) + 1,
      },
      weeklyXp: s.weekKey === wk ? s.weeklyXp + gain : gain,
      weekKey: wk,
      monthlyXp: s.monthKey === mk ? s.monthlyXp + gain : gain,
      monthKey: mk,
    };
    let reviewQueue = s.reviewQueue;
    if (solvedTemplateKey) {
      const strip = solvedTemplateKey.startsWith('review:')
        ? solvedTemplateKey.slice('review:'.length)
        : solvedTemplateKey;
      reviewQueue = s.reviewQueue.filter(
        (it) => it.templateKey !== strip && it.templateKey !== solvedTemplateKey,
      );
    }
    s = { ...s, reviewQueue };
    this.stats.set(s);
    const catPatch: Record<string, number> = {};
    const wrongPatch: Record<string, number> = {};
    for (const id of CATEGORY_IDS) {
      catPatch[`catSolved.${id}`] = s.catSolved[id] ?? 0;
      wrongPatch[`catWrong.${id}`] = s.catWrong[id] ?? 0;
    }
    await this.users.patch(u.uid, {
      totalSolved: s.totalSolved,
      totalCorrect: s.totalCorrect,
      xp: s.xp,
      todaySolved: s.todaySolved,
      todayDate: today,
      activeDays: s.activeDays,
      weeklyXp: s.weeklyXp,
      weekKey: s.weekKey,
      monthlyXp: s.monthlyXp,
      monthKey: s.monthKey,
      dailySolveHistory: s.dailySolveHistory,
      reviewQueue: s.reviewQueue,
      ...catPatch,
      ...wrongPatch,
    });
    await this.writeLeaderboard(u, s);
  }

  async recordWrong(args: {
    category: CategoryId;
    reviewItem: ReviewQueueItem;
  }): Promise<void> {
    const u = this.auth.user();
    const s = this.stats();
    if (!u || !s) {
      return;
    }
    const today = todayKeyUtc();
    const catWrong = {
      ...s.catWrong,
      [args.category]: (s.catWrong[args.category] ?? 0) + 1,
    };
    const queue =
      s.settings.smartPractice
        ? [
            args.reviewItem,
            ...s.reviewQueue.filter(
              (it) => it.templateKey !== args.reviewItem.templateKey,
            ),
          ].slice(0, 15)
        : s.reviewQueue;
    const dailyWrongHistory = {
      ...s.dailyWrongHistory,
      [today]: (s.dailyWrongHistory[today] ?? 0) + 1,
    };
    const next: UserStatsDoc = {
      ...s,
      totalSolved: s.totalSolved + 1,
      totalWrong: s.totalWrong + 1,
      catWrong,
      reviewQueue: queue,
      dailyWrongHistory,
    };
    this.stats.set(next);
    const wrongPatch: Record<string, number> = {};
    for (const id of CATEGORY_IDS) {
      wrongPatch[`catWrong.${id}`] = next.catWrong[id] ?? 0;
    }
    await this.users.patch(u.uid, {
      totalSolved: next.totalSolved,
      totalWrong: next.totalWrong,
      dailyWrongHistory: next.dailyWrongHistory,
      reviewQueue: next.reviewQueue,
      ...wrongPatch,
    });
  }

  private async writeLeaderboard(user: User, s: UserStatsDoc): Promise<void> {
    const repo = this.board as LeaderboardRepository;
    await repo.upsertSelf({
      uid: user.uid,
      name: this.displayName(user),
      xp: s.xp,
      weeklyXp: s.weeklyXp,
      weekKey: s.weekKey,
    });
  }

  async submitFeedback(message: string): Promise<void> {
    const u = this.auth.user();
    if (!u) {
      return;
    }
    await this.feedback.submit(u.uid, message);
  }

  suggestAdaptiveDifficulty(
    lastResults: readonly boolean[],
    current: Difficulty,
  ): Difficulty | null {
    const s = this.stats();
    if (!s?.settings.adaptiveDifficulty || lastResults.length < 5) {
      return null;
    }
    const window = lastResults.slice(-5);
    const correct = window.filter(Boolean).length;
    const order: Difficulty[] = ['easy', 'medium', 'hard'];
    const idx = order.indexOf(current);
    if (correct >= 4 && idx < order.length - 1) {
      return order[idx + 1]!;
    }
    if (correct <= 1 && idx > 0) {
      return order[idx - 1]!;
    }
    return null;
  }
}
