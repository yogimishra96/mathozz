import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  FEEDBACK_REPOSITORY,
  LEADERBOARD_REPOSITORY,
  USER_STATS_REPOSITORY,
} from './data.tokens';
import { FirestoreFeedbackRepository } from './firestore-feedback.repository';
import { FirestoreLeaderboardRepository } from './firestore-leaderboard.repository';
import { FirestoreUserStatsRepository } from './firestore-user-stats.repository';

/**
 * Bind persistence ports to Firestore. Replace with REST adapters by
 * swapping these providers.
 */
export function provideFirestoreDataLayer(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: USER_STATS_REPOSITORY,
      useExisting: FirestoreUserStatsRepository,
    },
    {
      provide: LEADERBOARD_REPOSITORY,
      useExisting: FirestoreLeaderboardRepository,
    },
    {
      provide: FEEDBACK_REPOSITORY,
      useExisting: FirestoreFeedbackRepository,
    },
  ]);
}
