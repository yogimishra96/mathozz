import { Injectable, inject } from '@angular/core';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { normalizeUserStats } from '../../domain/user-stats.factory';
import type { UserStatsDoc } from '../../domain/user-stats.model';
import { FIRESTORE } from '../firebase/firebase.tokens';
import type { UserStatsRepository } from './user-stats.repository';

@Injectable({ providedIn: 'root' })
export class FirestoreUserStatsRepository implements UserStatsRepository {
  private readonly db = inject(FIRESTORE);

  async fetch(uid: string): Promise<UserStatsDoc | null> {
    const ref = doc(this.db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return normalizeUserStats(snap.data() as Record<string, unknown>);
  }

  async seed(uid: string, docData: UserStatsDoc): Promise<void> {
    await setDoc(doc(this.db, 'users', uid), { ...docData });
  }

  async patch(uid: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(this.db, 'users', uid), data);
  }
}
