import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { User } from 'firebase/auth';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { Observable, ReplaySubject } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { FIREBASE_AUTH } from '../firebase/firebase.tokens';

/**
 * Google Sign-In also needs Firebase Console: Authentication → Sign-in method
 * → Google → Enable, and support email. Add your domain under Auth → Settings
 * → Authorized domains (localhost for dev, your hosting domain for prod).
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly ready = new ReplaySubject<void>(1);

  readonly user = signal<User | null>(null);
  /** True after the first Firebase auth callback. */
  readonly initialized = signal(false);

  constructor() {
    void this.consumeRedirectResult();
    onAuthStateChanged(this.auth, (u) => {
      this.user.set(u);
      if (!this.initialized()) {
        this.initialized.set(true);
      }
      this.ready.next();
    });
  }

  private async consumeRedirectResult(): Promise<void> {
    try {
      await getRedirectResult(this.auth);
    } catch {
      /* ignore stale or cancelled redirect */
    }
  }

  authReady$(): Observable<void> {
    return this.ready.pipe(take(1));
  }

  user$(): Observable<User | null> {
    return toObservable(this.user);
  }

  isSignedIn$(): Observable<boolean> {
    return this.user$().pipe(map((u) => u !== null));
  }

  async signInGooglePopup(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(this.auth, provider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(this.auth, provider);
        return;
      }
      throw err;
    }
  }

  async signInEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signUpEmail(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    const cred = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    await updateProfile(cred.user, {
      displayName: displayName || email.split('@')[0],
    });
  }

  async signInGuest(): Promise<void> {
    await signInAnonymously(this.auth);
  }

  async signOutUser(): Promise<void> {
    await signOut(this.auth);
  }
}
