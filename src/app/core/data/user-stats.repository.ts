import type { UserStatsDoc } from '../../domain/user-stats.model';

/**
 * Persistence port for user progress. Swap implementation for REST without
 * changing feature components.
 */
export interface UserStatsRepository {
  fetch(uid: string): Promise<UserStatsDoc | null>;
  seed(uid: string, doc: UserStatsDoc): Promise<void>;
  patch(uid: string, data: Record<string, unknown>): Promise<void>;
}
