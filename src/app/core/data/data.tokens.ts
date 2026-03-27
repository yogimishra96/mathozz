import { InjectionToken } from '@angular/core';
import type { FeedbackRepository } from './feedback.repository';
import type { LeaderboardRepository } from './leaderboard.repository';
import type { UserStatsRepository } from './user-stats.repository';

export const USER_STATS_REPOSITORY = new InjectionToken<UserStatsRepository>(
  'USER_STATS_REPOSITORY',
);

export const LEADERBOARD_REPOSITORY = new InjectionToken<LeaderboardRepository>(
  'LEADERBOARD_REPOSITORY',
);

export const FEEDBACK_REPOSITORY = new InjectionToken<FeedbackRepository>(
  'FEEDBACK_REPOSITORY',
);
