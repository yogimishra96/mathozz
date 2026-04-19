import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from './app.config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Screen = 'home' | 'game' | 'result' | 'login' | 'leaderboard' | 'profile';
export type Operator = '+' | '-' | '×' | '÷';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type FeedbackType = 'correct' | 'wrong' | null;
export type LeaderboardScope = 'global' | 'country' | 'city';

export interface Problem {
  num1: number;
  num2: number;
  operator: Operator;
  answer: number;
}

export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  totalSolved: number;
  totalCorrect: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  topSession: number;
  dailyStreak: number;
  lastPlayedDate: string;
  xp: number;
  level: number;
  averageResponseMs: number;
  country: string;
  city: string;
  isPremium: boolean;
  badges: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  xp: number;
  level: number;
  accuracy: number;
  bestStreak: number;
  topSession: number;
  averageResponseMs: number;
  country: string;
  city: string;
  updatedAt: Timestamp | null;
}

export interface ProblemReport {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userAgent: string;
  description: string;
  timestamp: Timestamp;
  resolved: boolean;
  screen: Screen;
  gameState?: {
    currentProblem?: Problem;
    score?: number;
    streak?: number;
    difficulty?: Difficulty;
  };
}

export interface GuestData {
  solved: number;
  correct: number;
  streak: number;
  bestStreak: number;
  topSession: number;
  xp: number;
}

/** Saved game state for pause/resume */
interface SavedGameState {
  sessionCorrect:    number;
  sessionWrong:      number;
  sessionSkipped:    number;
  sessionTotal:      number;
  sessionXP:         number;
  sessionBestStreak: number;
  streak:            number;
  currentProblem:    Problem;
  timeLeft:          number;
}

/** Per-problem time limit in seconds */
export const PROBLEM_TIME = 15;

const GUEST_KEY      = 'mathozz_guest';
const GUEST_LIMIT    = 50;
const SAVED_GAME_KEY = 'mathozz_saved_game';

// ─── XP calc ──────────────────────────────────────────────────────────────────
export function calcXP(
  difficulty: Difficulty,
  responseMs: number,
  streak: number
): number {
  const base = difficulty === 'hard' ? 35 : difficulty === 'medium' ? 20 : 10;
  const secs = Math.min(responseMs / 1000, PROBLEM_TIME);
  const speedFactor = Math.max(0.4, 1 - (secs / PROBLEM_TIME) * 0.6);
  const streakBonus = 1 + Math.floor(streak / 5) * 0.1;
  return Math.round(base * speedFactor * streakBonus);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AppService {
  private router = inject(Router);

  // ── Navigation ────────────────────────────────────────────────────────────
  currentScreen = signal<Screen>('home');

  // ── Auth ──────────────────────────────────────────────────────────────────
  user      = signal<UserData | null>(null);
  /** True after the first `onAuthStateChanged` fires (avoids guest UI flash before Firebase resolves session). */
  authReady = signal(false);
  /** False while Firestore user doc is still loading (after auth). */
  userStatsReady = signal(true);
  isLoading = signal(false);
  authError = signal('');

  // ── Game state ────────────────────────────────────────────────────────────
  sessionCorrect    = signal(0);
  sessionWrong      = signal(0);
  sessionSkipped    = signal(0);   // NEW: questions timed out with no input
  streak            = signal(0);
  sessionBestStreak = signal(0);
  sessionXP         = signal(0);
  sessionTotal      = signal(0);
  currentProblem    = signal<Problem | null>(null);
  currentInput      = signal('');
  timeLeft          = signal(PROBLEM_TIME);
  feedback          = signal<FeedbackType>(null);
  isTransitioning   = signal(false);
  isPaused          = signal(false);   // NEW: pause/resume
  hasSavedGame      = signal(false);   // NEW: saved game exists

  private problemStartMs = 0;
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  // ── Guest ─────────────────────────────────────────────────────────────────
  guestSolvedCount   = signal(0);
  guestGateTriggered = signal(false);

  // ── Leaderboard ───────────────────────────────────────────────────────────
  leaderboard              = signal<LeaderboardEntry[]>([]);
  selectedLeaderboardScope = signal<LeaderboardScope>('global');
  leaderboardLoading       = signal(false);

  // ── Theme ─────────────────────────────────────────────────────────────────
  isDarkMode = signal(true);

  // ── Geo ───────────────────────────────────────────────────────────────────
  userCountry = signal('');
  userCity    = signal('');

  // ── Computed ──────────────────────────────────────────────────────────────
  difficulty = computed<Difficulty>(() => {
    const s = this.streak();
    if (s >= 20) return 'hard';
    if (s >= 8)  return 'medium';
    return 'easy';
  });

  isGuest = computed(() => this.user() === null);

  // Accuracy counts only attempted (correct + wrong), skips excluded
  sessionAccuracy = computed(() => {
    const attempted = this.sessionCorrect() + this.sessionWrong();
    return attempted === 0 ? 0 : Math.round((this.sessionCorrect() / attempted) * 100);
  });

  // ─────────────────────────────────────────────────────────────────────────
  constructor() {
    this.initAuth();
    this.loadGuestData();
    this.loadThemePref();
    this.detectLocation();
    // Check for a saved game from previous session
    this.hasSavedGame.set(!!localStorage.getItem(SAVED_GAME_KEY));
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  private initAuth(): void {
    onAuthStateChanged(firebaseAuth, async (fb: FirebaseUser | null) => {
      this.authReady.set(true);
      if (fb) {
        this.isLoading.set(true);
        try { await this.onUserLogin(fb); }
        catch (e) { console.error(e); }
        finally { this.isLoading.set(false); }
      } else {
        this.user.set(null);
        this.userStatsReady.set(true);
      }
    });
  }

  /** Merge Firestore + guest + Firebase Auth profile into `UserData`. */
  private mergeUserData(
    fb: FirebaseUser,
    guest: GuestData,
    existing: UserData | null
  ): UserData {
    const today = new Date().toISOString().split('T')[0];
    const { dailyStreak } = this.calcDailyStreak(
      existing?.lastPlayedDate ?? '', existing?.dailyStreak ?? 0
    );

    const authName  = fb.displayName?.trim() ?? '';
    const storeName = existing?.displayName?.trim() ?? '';
    const u: UserData = {
      uid:          fb.uid,
      // Prefer Firebase Auth profile (email signup / Google); Firestore may still hold stale "Anonymous".
      displayName:  authName || storeName || 'Anonymous',
      email:        fb.email ?? '',
      photoURL:     fb.photoURL ?? '',
      totalSolved:  (existing?.totalSolved ?? 0) + guest.solved,
      totalCorrect: (existing?.totalCorrect ?? 0) + guest.correct,
      accuracy:     0,
      currentStreak:   Math.max(existing?.currentStreak ?? 0, guest.streak),
      bestStreak:      Math.max(existing?.bestStreak ?? 0, guest.bestStreak),
      topSession:      Math.max(existing?.topSession ?? 0, guest.topSession),
      dailyStreak,
      lastPlayedDate:  today,
      xp:              (existing?.xp ?? 0) + guest.xp,
      level:           1,
      averageResponseMs: existing?.averageResponseMs ?? 0,
      country:   existing?.country ?? this.userCountry(),
      city:      existing?.city    ?? this.userCity(),
      isPremium: existing?.isPremium ?? false,
      badges:    existing?.badges ?? [],
      createdAt: existing?.createdAt ?? null,
      updatedAt: null,
    };
    const ts = u.totalSolved;
    const tc = u.totalCorrect;
    u.accuracy = ts > 0 ? Math.round((tc / ts) * 100) : 0;
    u.level    = Math.floor(u.xp / 100) + 1;
    return u;
  }

  private async onUserLogin(fb: FirebaseUser): Promise<void> {
    const guest = this.readGuestData();
    this.userStatsReady.set(false);
    // Show logged-in shell immediately (Firestore still loading).
    this.user.set(this.mergeUserData(fb, guest, null));

    try {
      const existing = await this.fetchUserFromFirestore(fb.uid);
      const u = this.mergeUserData(fb, guest, existing);

      this.clearGuestData();
      this.user.set(u);
      // Show stats as soon as Firestore read + merge is done (same as pre-loader UX).
      // Saving to Firestore / leaderboard must not block the UI.
      this.userStatsReady.set(true);
      await this.saveUserToFirestore(u);
      await this.updateLeaderboardEntry();
    } catch (e) {
      console.error(e);
      this.userStatsReady.set(true);
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      this.guestGateTriggered.set(false);
      this.currentScreen.set('home');
    } catch (e) { this.authError.set(this.parseAuthErr(e)); }
    finally { this.isLoading.set(false); }
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      this.guestGateTriggered.set(false);
      this.currentScreen.set('home');
    } catch (e) { this.authError.set(this.parseAuthErr(e)); }
    finally { this.isLoading.set(false); }
  }

  async signupWithEmail(email: string, password: string, displayName: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      
      // ✅ Pehle profile update karo
      await updateProfile(cred.user, { displayName });
      await cred.user.reload();
      
      // ✅ Ab manually onUserLogin call karo fresh user ke saath
      // (onAuthStateChanged jo pehle fire hua tha woh stale tha)
      await this.onUserLogin(cred.user);
      
      this.guestGateTriggered.set(false);
      this.currentScreen.set('home');
    } catch (e) { 
      this.authError.set(this.parseAuthErr(e)); 
    } finally { 
      this.isLoading.set(false); 
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(firebaseAuth);
      this.user.set(null);
      this.userStatsReady.set(true);
      this.currentScreen.set('home');
    } catch (e) { console.error(e); }
  }

  private parseAuthErr(e: unknown): string {
    const code = (e as { code?: string })?.code ?? '';
    const map: Record<string, string> = {
      'auth/user-not-found':      'No account found.',
      'auth/wrong-password':      'Incorrect password.',
      'auth/email-already-in-use':'Email already in use.',
      'auth/invalid-email':       'Invalid email address.',
      'auth/weak-password':       'Password needs 6+ characters.',
      'auth/popup-closed-by-user':'Sign-in popup closed.',
    };
    return map[code] ?? 'Authentication failed. Try again.';
  }

  // ─── Firestore ────────────────────────────────────────────────────────────

  async saveUserToFirestore(u: UserData): Promise<void> {
    try {
      const ref = doc(firebaseDb, 'users', u.uid);
      const { uid, ...rest } = u;
      await setDoc(ref, { ...rest, updatedAt: serverTimestamp(), createdAt: u.createdAt ?? serverTimestamp() }, { merge: true });
    } catch (e) { console.error(e); }
  }

  async fetchUserFromFirestore(uid: string): Promise<UserData | null> {
    try {
      const snap = await getDoc(doc(firebaseDb, 'users', uid));
      return snap.exists() ? { uid, ...snap.data() } as UserData : null;
    } catch (e) { console.error(e); return null; }
  }

  private async persistStats(responseMs: number, correct: boolean): Promise<void> {
    const u = this.user();
    if (!u) return;
    try {
      const totalSolved  = u.totalSolved + 1;
      const totalCorrect = u.totalCorrect + (correct ? 1 : 0);
      const accuracy     = Math.round((totalCorrect / totalSolved) * 100);
      const bestStreak   = Math.max(u.bestStreak, this.streak());
      const topSession   = Math.max(u.topSession, this.sessionCorrect());
      const count        = totalSolved;
      const avgMs        = Math.round((u.averageResponseMs * (count - 1) + responseMs) / count);
      const today        = new Date().toISOString().split('T')[0];
      const xp           = u.xp + (correct ? calcXP(this.difficulty(), responseMs, this.streak()) : 0);

      await updateDoc(doc(firebaseDb, 'users', u.uid), {
        totalSolved, totalCorrect, accuracy, bestStreak, topSession,
        currentStreak: this.streak(), xp, averageResponseMs: avgMs,
        lastPlayedDate: today, updatedAt: serverTimestamp(),
      });

      this.user.set({ ...u, totalSolved, totalCorrect, accuracy, bestStreak, topSession, xp, averageResponseMs: avgMs, lastPlayedDate: today });
    } catch (e) { console.error(e); }
  }

  async updateLeaderboardEntry(): Promise<void> {
    const u = this.user();
    if (!u) return;
    try {
      await setDoc(doc(firebaseDb, 'leaderboard', u.uid), {
        displayName: u.displayName, xp: u.xp, level: u.level,
        accuracy: u.accuracy, bestStreak: u.bestStreak, topSession: u.topSession,
        averageResponseMs: u.averageResponseMs, country: u.country, city: u.city,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) { console.error(e); }
  }

  async fetchLeaderboard(scope: LeaderboardScope): Promise<void> {
    this.leaderboardLoading.set(true);
    try {
      const col = collection(firebaseDb, 'leaderboard');
      let q;
      if (scope === 'country' && this.userCountry()) {
        q = query(col, where('country', '==', this.userCountry()), orderBy('xp', 'desc'), limit(50));
      } else if (scope === 'city' && this.userCity()) {
        q = query(col, where('city', '==', this.userCity()), orderBy('xp', 'desc'), limit(50));
      } else {
        q = query(col, orderBy('xp', 'desc'), limit(50));
      }
      const snap = await getDocs(q);
      this.leaderboard.set(snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<LeaderboardEntry, 'uid'>) })));
    } catch (e) { console.error(e); this.leaderboard.set([]); }
    finally { this.leaderboardLoading.set(false); }
  }

  // ─── Game ─────────────────────────────────────────────────────────────────

  /** Start a completely fresh game session */
  startGame(): void {
    this.sessionCorrect.set(0);
    this.sessionWrong.set(0);
    this.sessionSkipped.set(0);      // reset skips
    this.sessionTotal.set(0);
    this.sessionXP.set(0);
    this.sessionBestStreak.set(0);
    this.streak.set(0);
    this.isPaused.set(false);        // ensure not paused
    this.currentInput.set('');
    this.feedback.set(null);
    this.isTransitioning.set(false);
    this.hasSavedGame.set(false);    // clear saved game flag
    this.nextProblem();
    this.currentScreen.set('game');
  }

  /** Generate and show next problem, start timer */
  nextProblem(): void {
    this.currentProblem.set(this.buildProblem());
    this.currentInput.set('');
    this.feedback.set(null);
    this.isTransitioning.set(false);
    this.problemStartMs = Date.now();
    this.startTimer();
  }

  private buildProblem(): Problem {
    const diff = this.difficulty();
    const ops: Operator[] = ['+', '-', '×', '÷'];
    const op = ops[Math.floor(Math.random() * ops.length)];

    const r = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

    let n1: number, n2: number, ans: number;

    if (op === '÷') {
      if (diff === 'easy')        { n2 = r(1,5);  ans = r(1,10); }
      else if (diff === 'medium') { n2 = r(2,12); ans = r(2,12); }
      else                        { n2 = r(2,20); ans = r(2,20); }
      n1 = n2 * ans;
    } else if (op === '×') {
      if (diff === 'easy')        { n1 = r(2,9);  n2 = r(2,9);  }
      else if (diff === 'medium') { n1 = r(3,25); n2 = r(3,25); }
      else                        { n1 = r(12,50); n2 = r(12,50); }
      ans = n1 * n2;
    } else {
      if (diff === 'easy')        { n1 = r(1,20);  n2 = r(1,20);  }
      else if (diff === 'medium') { n1 = r(10,99);  n2 = r(10,99);  }
      else                        { n1 = r(50,500); n2 = r(50,500); }
      if (op === '-' && n2 > n1)  { [n1, n2] = [n2, n1]; }
      ans = op === '+' ? n1 + n2 : n1 - n2;
    }

    return { num1: n1, num2: n2, operator: op, answer: ans };
  }

  // ─── Numpad input ─────────────────────────────────────────────────────────

  pressDigit(d: string): void {
    if (this.isTransitioning()) return;
    const cur = this.currentInput();
    if (cur.length >= 7) return;
    this.currentInput.set(cur + d);
  }

  pressBackspace(): void {
    if (this.isTransitioning()) return;
    this.currentInput.set(this.currentInput().slice(0, -1));
  }

  pressClear(): void {
    if (this.isTransitioning()) return;
    this.currentInput.set('');
  }

  /** Submit current numpad value as answer */
  async submitAnswer(): Promise<void> {
    if (this.isTransitioning()) return;
    const input = this.currentInput();
    if (!input) return;

    const problem = this.currentProblem();
    if (!problem) return;

    this.stopTimer();
    this.isTransitioning.set(true);

    const responseMs = Date.now() - this.problemStartMs;
    const userAns    = parseInt(input, 10);
    const correct    = userAns === problem.answer;

    this.sessionTotal.update(n => n + 1);

    if (correct) {
      const xpGain = calcXP(this.difficulty(), responseMs, this.streak());
      this.sessionCorrect.update(n => n + 1);
      this.streak.update(n => n + 1);
      this.sessionXP.update(n => n + xpGain);
      this.sessionBestStreak.update(n => Math.max(n, this.streak()));
      this.feedback.set('correct');
      this.playSound('correct');

      const s = this.streak();
      if (s === 10 || s === 25 || s === 50 || s === 100) {
        this.triggerConfetti();
        this.playSound('streak');
      }
    } else {
      this.sessionWrong.update(n => n + 1);   // ensure wrong increments
      this.streak.set(0);
      this.feedback.set('wrong');
      this.playSound('wrong');
    }

    if (!this.isGuest()) {
      await this.persistStats(responseMs, correct);
      await this.updateLeaderboardEntry();
    } else {
      this.updateGuest(correct, correct ? calcXP(this.difficulty(), responseMs, this.streak()) : 0);
      if (this.guestSolvedCount() >= GUEST_LIMIT) {
        setTimeout(() => {
          this.stopTimer();
          this.guestGateTriggered.set(true);
          void this.router.navigate(['/login']);
        }, 400);
        return;
      }
    }

    // Wrong answers wait a bit longer so user sees the feedback
    const delay = correct ? 100 : 250;
    setTimeout(() => this.nextProblem(), delay);
  }

  endGame(): void {
    this.stopTimer();
    this.currentScreen.set('result');
  }

  // ─── Timer ────────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.stopTimer();
    this.timeLeft.set(PROBLEM_TIME);
    this.timerHandle = setInterval(async () => {
      if (this.isPaused()) return; // don't tick while paused
      this.timeLeft.update(t => t - 1);
      if (this.timeLeft() <= 0) {
        this.stopTimer();
        this.isTransitioning.set(true);
        this.sessionTotal.update(n => n + 1);

        const hadInput = !!this.currentInput();
        if (hadInput) {
          // User typed something but time ran out → wrong
          this.sessionWrong.update(n => n + 1);
          this.streak.set(0);
          this.feedback.set('wrong');
          this.playSound('wrong');
          if (!this.isGuest()) {
            await this.persistStats(PROBLEM_TIME * 1000, false);
          } else {
            this.updateGuest(false, 0);
          }
        } else {
          // User typed nothing → skip (not counted as wrong, no streak reset)
          this.sessionSkipped.update(n => n + 1);
          this.feedback.set('wrong'); // visual flash still shows
          this.playSound('wrong');
        }

        setTimeout(() => this.nextProblem(), 400);
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  // ─── Pause / Resume / Save ────────────────────────────────────────────────

  /** Toggle pause state */
  togglePause(): void {
    if (this.isPaused()) {
      this.isPaused.set(false);
      // Re-start timer from remaining timeLeft (don't reset to PROBLEM_TIME)
      this.stopTimer();
      this.timerHandle = setInterval(async () => {
        if (this.isPaused()) return;
        this.timeLeft.update(t => t - 1);
        if (this.timeLeft() <= 0) {
          this.stopTimer();
          this.isTransitioning.set(true);
          this.sessionTotal.update(n => n + 1);

          const hadInput = !!this.currentInput();
          if (hadInput) {
            this.sessionWrong.update(n => n + 1);
            this.streak.set(0);
            this.feedback.set('wrong');
            this.playSound('wrong');
            if (!this.isGuest()) {
              await this.persistStats(PROBLEM_TIME * 1000, false);
            } else {
              this.updateGuest(false, 0);
            }
          } else {
            this.sessionSkipped.update(n => n + 1);
            this.feedback.set('wrong');
            this.playSound('wrong');
          }
          setTimeout(() => this.nextProblem(), 400);
        }
      }, 1000);
    } else {
      this.isPaused.set(true);
      this.stopTimer();
    }
  }

  /** Pause + save current game state to localStorage */
  pauseAndSave(): void {
    if (this.currentScreen() !== 'game') return;
    this.isPaused.set(true);
    this.stopTimer();
    const state: SavedGameState = {
      sessionCorrect:    this.sessionCorrect(),
      sessionWrong:      this.sessionWrong(),
      sessionSkipped:    this.sessionSkipped(),
      sessionTotal:      this.sessionTotal(),
      sessionXP:         this.sessionXP(),
      sessionBestStreak: this.sessionBestStreak(),
      streak:            this.streak(),
      currentProblem:    this.currentProblem()!,
      timeLeft:          this.timeLeft(),
    };
    localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(state));
    this.hasSavedGame.set(true);
  }

  /** Restore a saved game and resume from where the user left off */
  resumeGame(): void {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    if (!raw) return;
    try {
      const s: SavedGameState = JSON.parse(raw);
      this.sessionCorrect.set(s.sessionCorrect ?? 0);
      this.sessionWrong.set(s.sessionWrong ?? 0);
      this.sessionSkipped.set(s.sessionSkipped ?? 0);
      this.sessionTotal.set(s.sessionTotal ?? 0);
      this.sessionXP.set(s.sessionXP ?? 0);
      this.sessionBestStreak.set(s.sessionBestStreak ?? 0);
      this.streak.set(s.streak ?? 0);
      this.currentProblem.set(s.currentProblem ?? null);
      this.timeLeft.set(s.timeLeft ?? PROBLEM_TIME);
      this.currentInput.set('');
      this.feedback.set(null);
      this.isTransitioning.set(false);
      this.isPaused.set(false);
      this.currentScreen.set('game');
      // Start timer ticking from saved timeLeft
      this.stopTimer();
      this.timerHandle = setInterval(async () => {
        if (this.isPaused()) return;
        this.timeLeft.update(t => t - 1);
        if (this.timeLeft() <= 0) {
          this.stopTimer();
          this.isTransitioning.set(true);
          this.sessionTotal.update(n => n + 1);
          const hadInput = !!this.currentInput();
          if (hadInput) {
            this.sessionWrong.update(n => n + 1);
            this.streak.set(0);
            this.feedback.set('wrong');
            this.playSound('wrong');
            if (!this.isGuest()) await this.persistStats(PROBLEM_TIME * 1000, false);
            else this.updateGuest(false, 0);
          } else {
            this.sessionSkipped.update(n => n + 1);
            this.feedback.set('wrong');
            this.playSound('wrong');
          }
          setTimeout(() => this.nextProblem(), 400);
        }
      }, 1000);
    } catch {
      // Corrupt state → fresh game
      this.startGame();
    }
  }

  /** Remove saved game from localStorage */
  clearSavedGame(): void {
    localStorage.removeItem(SAVED_GAME_KEY);
    this.hasSavedGame.set(false);
  }

  // ─── Guest ────────────────────────────────────────────────────────────────

  private loadGuestData(): void {
    const g = this.readGuestData();
    this.guestSolvedCount.set(g.solved);
  }

  private readGuestData(): GuestData {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      return raw ? JSON.parse(raw) : { solved: 0, correct: 0, streak: 0, bestStreak: 0, topSession: 0, xp: 0 };
    } catch { return { solved: 0, correct: 0, streak: 0, bestStreak: 0, topSession: 0, xp: 0 }; }
  }

  private updateGuest(correct: boolean, xpGain: number): void {
    const g = this.readGuestData();
    g.solved += 1;
    if (correct) g.correct += 1;
    g.streak = correct ? g.streak + 1 : 0;
    g.bestStreak = Math.max(g.bestStreak, g.streak);
    g.topSession = Math.max(g.topSession, this.sessionCorrect());
    g.xp += xpGain;
    localStorage.setItem(GUEST_KEY, JSON.stringify(g));
    this.guestSolvedCount.set(g.solved);
  }

  private clearGuestData(): void {
    localStorage.removeItem(GUEST_KEY);
    this.guestSolvedCount.set(0);
  }

  // ─── Daily streak ─────────────────────────────────────────────────────────

  private calcDailyStreak(lastDate: string, current: number): { dailyStreak: number } {
    const today = new Date().toISOString().split('T')[0];
    if (!lastDate) return { dailyStreak: 1 };
    if (lastDate === today) return { dailyStreak: current };
    const diff = Math.round((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000);
    return { dailyStreak: diff === 1 ? current + 1 : 1 };
  }

  // ─── Geolocation ──────────────────────────────────────────────────────────

  async detectLocation(): Promise<void> {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) return;
      const d = await res.json() as { country_name?: string; city?: string };
      this.userCountry.set(d.country_name ?? '');
      this.userCity.set(d.city ?? '');
    } catch { /* silent */ }
  }

  // ─── Sound ────────────────────────────────────────────────────────────────

  private audioCtx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    return this.audioCtx;
  }

  playSound(type: 'correct' | 'wrong' | 'streak'): void {
    try {
      const ctx = this.getCtx();
      if (type === 'correct')    this.beep(ctx, 880,  'sine',     0,    0.08, 0.1);
      else if (type === 'wrong') this.beep(ctx, 220,  'sawtooth', 0,    0.1,  0.15);
      else {
        this.beep(ctx, 660,  'sine', 0,    0.08, 0.1);
        this.beep(ctx, 880,  'sine', 0.11, 0.08, 0.1);
        this.beep(ctx, 1100, 'sine', 0.22, 0.12, 0.15);
      }
    } catch { /* ignore */ }
  }

  private beep(ctx: AudioContext, freq: number, type: OscillatorType, start: number, gain: number, dur: number): void {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    g.gain.setValueAtTime(gain, ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.01);
  }

  // ─── Confetti ─────────────────────────────────────────────────────────────

  triggerConfetti(): void {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx  = canvas.getContext('2d')!;
    const cols = ['#e8c547','#a8d8a8','#f4a261','#e76f51','#90e0ef','#caf0f8'];
    const parts = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width, y: -10,
      vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3 + 2,
      color: cols[Math.floor(Math.random() * cols.length)],
      sz: Math.random() * 7 + 3, rot: Math.random() * Math.PI * 2, rs: (Math.random() - 0.5) * 0.15,
    }));
    let f = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.rot += p.rs;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.sz / 2, -p.sz / 4, p.sz, p.sz / 2);
        ctx.restore();
      });
      if (++f < 130) requestAnimationFrame(tick); else canvas.remove();
    };
    requestAnimationFrame(tick);
  }

  // ─── Theme ────────────────────────────────────────────────────────────────

  private loadThemePref(): void {
    const p = localStorage.getItem('mathozz_theme');
    if (p === 'light') this.isDarkMode.set(false);
    else this.isDarkMode.set(true);
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(v => !v);
    localStorage.setItem('mathozz_theme', this.isDarkMode() ? 'dark' : 'light');
  }

  // ─── Leaderboard nav ──────────────────────────────────────────────────────

  async goToLeaderboard(): Promise<void> {
    this.currentScreen.set('leaderboard');
    await this.fetchLeaderboard(this.selectedLeaderboardScope());
  }

  async switchLeaderboardScope(s: LeaderboardScope): Promise<void> {
    this.selectedLeaderboardScope.set(s);
    await this.fetchLeaderboard(s);
  }

  // ─── Feedback (Firestore) ─────────────────────────────────────────────────
  // Uses 'problem-reports' collection which already has `allow create: if true`
  // so both guests and logged-in users can submit without permission errors.

  async submitFeedback(data: { text: string; email?: string; phone?: string }): Promise<void> {
    if (!data.text || typeof data.text !== 'string') throw new Error('Invalid feedback');
    const sanitized = data.text.trim();
    if (sanitized.length === 0 || sanitized.length > 600) throw new Error('Invalid feedback length');

    try {
      // Store in problem-reports (public create access) with a 'type' field
      // to distinguish from actual problem reports
      const docRef = doc(collection(firebaseDb, 'problem-reports'));
      await setDoc(docRef, {
        type:        'user-feedback',          // distinguish from bug reports
        description: sanitized,
        email:       (data.email ?? '').trim().substring(0, 200),
        phone:       (data.phone ?? '').trim().substring(0, 20),
        uid:         this.user()?.uid ?? 'guest',
        userEmail:   this.user()?.email ?? null,
        userId:      this.user()?.uid ?? null,
        userAgent:   navigator.userAgent.substring(0, 256),
        screen:      this.currentScreen(),
        timestamp:   serverTimestamp(),
        resolved:    false,
      });
    } catch (e) {
      console.error('Feedback submit error:', e);
      throw e;
    }
  }

  // ─── Problem Reports ──────────────────────────────────────────────────────

  async submitProblemReport(description: string): Promise<void> {
    if (!description || typeof description !== 'string') return;
    const sanitized = description.trim();
    if (sanitized.length === 0 || sanitized.length > 500) return;

    const report: Omit<ProblemReport, 'id'> = {
      userId:    this.user()?.uid || null,
      userEmail: this.user()?.email || null,
      userAgent: navigator.userAgent.substring(0, 256),
      description: sanitized,
      timestamp: serverTimestamp() as Timestamp,
      resolved:  false,
      screen:    this.currentScreen(),
      ...(this.currentScreen() === 'game' && {
        gameState: {
          currentProblem: this.currentProblem() || undefined,
          score:      this.sessionCorrect(),
          streak:     this.streak(),
          difficulty: this.difficulty()
        }
      })
    };

    const docRef = doc(collection(firebaseDb, 'problem-reports'));
    await setDoc(docRef, report);
  }

  async getProblemReports(): Promise<ProblemReport[]> {
    const q = query(
      collection(firebaseDb, 'problem-reports'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProblemReport));
  }

  async markReportResolved(reportId: string): Promise<void> {
    const docRef = doc(firebaseDb, 'problem-reports', reportId);
    await updateDoc(docRef, { resolved: true });
  }
}