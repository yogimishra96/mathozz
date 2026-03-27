import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  FEEDBACK_REPOSITORY,
  LEADERBOARD_REPOSITORY,
  USER_STATS_REPOSITORY,
} from '../data/data.tokens';
import type { LeaderboardRepository } from '../data/leaderboard.repository';
import type { UserStatsRepository } from '../data/user-stats.repository';
import { newUserStatsDoc } from '../../domain/user-stats.factory';
import { UserProgressService } from './user-progress.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { I18nService } from '../i18n/i18n.service';

describe('UserProgressService', () => {
  it('suggestAdaptiveDifficulty promotes after strong window', () => {
    const users: UserStatsRepository = {
      fetch: vi.fn(),
      seed: vi.fn(),
      patch: vi.fn(),
    };
    const board: LeaderboardRepository = {
      topByXp: vi.fn(),
      topByWeeklyXp: vi.fn(),
      upsertSelf: vi.fn(),
    };
    const feedback = { submit: vi.fn() };
    const authStub = {
      user: () => null,
    };
    TestBed.configureTestingModule({
      providers: [
        UserProgressService,
        I18nService,
        { provide: AuthSessionService, useValue: authStub },
        { provide: USER_STATS_REPOSITORY, useValue: users },
        { provide: LEADERBOARD_REPOSITORY, useValue: board },
        { provide: FEEDBACK_REPOSITORY, useValue: feedback },
      ],
    });
    const svc = TestBed.inject(UserProgressService);
    const doc = newUserStatsDoc();
    doc.settings.adaptiveDifficulty = true;
    svc.stats.set(doc);
    const next = svc.suggestAdaptiveDifficulty(
      [true, true, true, true, true],
      'easy',
    );
    expect(next).toBe('medium');
  });
});
