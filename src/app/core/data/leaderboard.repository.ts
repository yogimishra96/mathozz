export interface LeaderboardRow {
  readonly uid: string;
  readonly name: string;
  readonly xp: number;
  readonly weeklyXp: number;
  readonly weekKey: string;
}

export interface LeaderboardWritePayload {
  readonly uid: string;
  readonly name: string;
  readonly xp: number;
  readonly weeklyXp: number;
  readonly weekKey: string;
}

/**
 * Leaderboard read/write port (Firestore today, HTTP later).
 */
export interface LeaderboardRepository {
  topByXp(limitCount: number): Promise<readonly LeaderboardRow[]>;
  topByWeeklyXp(
    weekKey: string,
    limitCount: number,
  ): Promise<readonly LeaderboardRow[]>;
  upsertSelf(payload: LeaderboardWritePayload): Promise<void>;
}
