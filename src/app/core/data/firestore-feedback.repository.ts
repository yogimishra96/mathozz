import { Injectable, inject } from '@angular/core';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE } from '../firebase/firebase.tokens';
import type { FeedbackRepository } from './feedback.repository';

@Injectable({ providedIn: 'root' })
export class FirestoreFeedbackRepository implements FeedbackRepository {
  private readonly db = inject(FIRESTORE);

  async submit(uid: string, message: string): Promise<void> {
    const text = message.trim().slice(0, 2000);
    await addDoc(collection(this.db, 'feedback'), {
      uid,
      message: text,
      createdAt: serverTimestamp(),
    });
  }
}
