import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { FIRESTORE } from '../firebase/firebase.tokens';
import type {
  LeaderboardRepository,
  LeaderboardRow,
  LeaderboardWritePayload,
} from './leaderboard.repository';

function mapRow(
  id: string,
  raw: Record<string, unknown>,
): LeaderboardRow {
  return {
    uid: String(raw['uid'] ?? id),
    name: String(raw['name'] ?? '?'),
    xp: Number(raw['xp'] ?? 0),
    weeklyXp: Number(raw['weeklyXp'] ?? 0),
    weekKey: String(raw['weekKey'] ?? ''),
  };
}

@Injectable({ providedIn: 'root' })
export class FirestoreLeaderboardRepository implements LeaderboardRepository {
  private readonly db = inject(FIRESTORE);

  async topByXp(limitCount: number): Promise<readonly LeaderboardRow[]> {
    const q = query(
      collection(this.db, 'leaderboard'),
      orderBy('xp', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapRow(d.id, d.data() as Record<string, unknown>),
    );
  }

  async topByWeeklyXp(
    weekKey: string,
    limitCount: number,
  ): Promise<readonly LeaderboardRow[]> {
    const q = query(
      collection(this.db, 'leaderboard'),
      where('weekKey', '==', weekKey),
      orderBy('weeklyXp', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapRow(d.id, d.data() as Record<string, unknown>),
    );
  }

  async upsertSelf(payload: LeaderboardWritePayload): Promise<void> {
    await setDoc(
      doc(this.db, 'leaderboard', payload.uid),
      {
        name: payload.name,
        xp: payload.xp,
        uid: payload.uid,
        weeklyXp: payload.weeklyXp,
        weekKey: payload.weekKey,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}
