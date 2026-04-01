import { Injectable, signal, computed } from '@angular/core';
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

// ─── Types ───────────────────────────────────────────────────────────────────

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
  displayQuestion: string;
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
  photoURL: string;
  xp: number;
  level: number;
  accuracy: number;
  bestStreak: number;
  averageResponseMs: number;
  country: string;
  city: string;
  updatedAt: Timestamp | null;
}

export interface GuestData {
  solved: number;
  correct: number;
  streak: number;
  bestStreak: number;
  xp: number;
}

const GUEST_KEY = 'mathozz_guest';
const GUEST_LIMIT = 50;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AppService {

  // ── Screen navigation ──────────────────────────────────────────────────────

  /** Current active screen (no router, signal-driven) */
  currentScreen = signal<Screen>('home');

  // ── Auth & user ────────────────────────────────────────────────────────────

  /** Authenticated user data from Firestore, or null if guest */
  user = signal<UserData | null>(null);

  /** Whether an async operation is in progress */
  isLoading = signal(false);

  /** Auth error message to display */
  authError = signal<string>('');

  // ── Game state ─────────────────────────────────────────────────────────────

  /** Current session score (correct answers this session) */
  score = signal(0);

  /** Current in-session streak */
  streak = signal(0);

  /** Current accumulated XP (synced from user or guest) */
  xp = signal(0);

  /** Derived level from XP */
  level = computed(() => Math.floor(this.xp() / 100) + 1);

  /** Active problem being shown */
  currentProblem = signal<Problem | null>(null);

  /** Seconds remaining for current problem */
  timeLeft = signal(15);

  /** Whether timer mode is enabled */
  timerEnabled = signal(true);

  /** Feedback flash after answering */
  feedback = signal<FeedbackType>(null);

  /** XP earned in this session */
  sessionXP = signal(0);

  /** Best streak achieved this session */
  sessionBestStreak = signal(0);

  /** Count of correct answers this session */
  sessionCorrect = signal(0);

  /** Total answered this session */
  sessionTotal = signal(0);

  /** Timestamp when current problem started (for speed calculation) */
  private problemStartTime = 0;

  /** Running average response time in ms */
  private responseTimes: number[] = [];

  /** Timer interval reference */
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── Guest mode ─────────────────────────────────────────────────────────────

  /** Number of problems solved as guest */
  guestSolvedCount = signal(0);

  /** Whether the guest gate was triggered (redirected from game) */
  guestGateTriggered = signal(false);

  // ── Leaderboard ────────────────────────────────────────────────────────────

  /** Leaderboard entries */
  leaderboard = signal<LeaderboardEntry[]>([]);

  /** Active leaderboard scope */
  selectedLeaderboardScope = signal<LeaderboardScope>('global');

  /** Whether leaderboard is loading */
  leaderboardLoading = signal(false);

  // ── UI / theme ─────────────────────────────────────────────────────────────

  /** Dark mode toggle */
  isDarkMode = signal(false);

  // ── Geolocation ────────────────────────────────────────────────────────────

  /** User's detected country */
  userCountry = signal('');

  /** User's detected city */
  userCity = signal('');

  // ── Computed ───────────────────────────────────────────────────────────────

  /** Difficulty tier based on current streak */
  difficulty = computed<Difficulty>(() => {
    if (this.streak() >= 25) return 'hard';
    if (this.streak() >= 10) return 'medium';
    return 'easy';
  });

  /** Whether this is a guest session */
  isGuest = computed(() => this.user() === null);

  /** Session accuracy percentage */
  sessionAccuracy = computed(() => {
    if (this.sessionTotal() === 0) return 0;
    return Math.round((this.sessionCorrect() / this.sessionTotal()) * 100);
  });

  // ── Audio context ──────────────────────────────────────────────────────────
  private audioCtx: AudioContext | null = null;

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor / init
  // ─────────────────────────────────────────────────────────────────────────

  constructor() {
    this.initAuth();
    this.loadGuestData();
    this.loadDarkModePreference();
    this.detectLocation();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize Firebase auth listener.
   * On auth state change: fetch/create Firestore doc, merge guest stats.
   */
  private initAuth(): void {
    onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        this.isLoading.set(true);
        try {
          await this.onUserLogin(fbUser);
        } catch (err) {
          console.error('Auth init error:', err);
        } finally {
          this.isLoading.set(false);
        }
      } else {
        this.user.set(null);
      }
    });
  }

  /**
   * Handle post-login tasks: merge guest data, fetch/create Firestore doc.
   */
  private async onUserLogin(fbUser: FirebaseUser): Promise<void> {
    const guest = this.readGuestData();
    const existing = await this.fetchUserFromFirestore(fbUser.uid);

    const now = new Date().toISOString().split('T')[0];
    const lastPlayed = existing?.lastPlayedDate ?? '';
    const { dailyStreak } = this.computeDailyStreak(lastPlayed, existing?.dailyStreak ?? 0);

    const userData: UserData = {
      uid: fbUser.uid,
      displayName: existing?.displayName ?? fbUser.displayName ?? 'Anonymous',
      email: fbUser.email ?? '',
      photoURL: fbUser.photoURL ?? '',
      totalSolved: (existing?.totalSolved ?? 0) + guest.solved,
      totalCorrect: (existing?.totalCorrect ?? 0) + guest.correct,
      accuracy: 0,
      currentStreak: Math.max(existing?.currentStreak ?? 0, guest.streak),
      bestStreak: Math.max(existing?.bestStreak ?? 0, guest.bestStreak),
      dailyStreak,
      lastPlayedDate: now,
      xp: (existing?.xp ?? 0) + guest.xp,
      level: 1,
      averageResponseMs: existing?.averageResponseMs ?? 0,
      country: existing?.country ?? this.userCountry(),
      city: existing?.city ?? this.userCity(),
      isPremium: existing?.isPremium ?? false,
      badges: existing?.badges ?? [],
      createdAt: existing?.createdAt ?? null,
      updatedAt: null,
    };

    const totalSolved = userData.totalSolved;
    const totalCorrect = userData.totalCorrect;
    userData.accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
    userData.level = Math.floor(userData.xp / 100) + 1;

    this.clearGuestData();
    this.user.set(userData);
    this.xp.set(userData.xp);
    this.streak.set(userData.currentStreak);

    await this.saveUserToFirestore(userData);
    await this.updateLeaderboardEntry();
  }

  /**
   * Sign in with Google popup.
   */
  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
      this.guestGateTriggered.set(false);
      this.currentScreen.set('home');
    } catch (err: unknown) {
      this.authError.set(this.parseAuthError(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Sign in with email and password.
   */
  async loginWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      this.guestGateTriggered.set(false);
      this.currentScreen.set('home');
    } catch (err: unknown) {
      this.authError.set(this.parseAuthError(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Register with email, password, and display name.
   */
  async signupWithEmail(email: string, password: string, displayName: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(cred.user, { displayName });
      this.guestGateTriggered.set(false);
      this.currentScreen.set('home');
    } catch (err: unknown) {
      this.authError.set(this.parseAuthError(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Sign out the current user.
   */
  async logout(): Promise<void> {
    try {
      await signOut(firebaseAuth);
      this.user.set(null);
      this.xp.set(0);
      this.streak.set(0);
      this.currentScreen.set('home');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  /**
   * Parse Firebase auth errors into human-readable messages.
   */
  private parseAuthError(err: unknown): string {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: string }).code;
      const map: Record<string, string> = {
        'auth/user-not-found': 'No account with that email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/network-request-failed': 'Network error. Try again.',
      };
      return map[code] ?? 'Authentication failed. Please try again.';
    }
    return 'Authentication failed. Please try again.';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Firestore
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Save (merge) user data to Firestore.
   */
  async saveUserToFirestore(userData: UserData): Promise<void> {
    try {
      const ref = doc(firebaseDb, 'users', userData.uid);
      const payload = {
        ...userData,
        updatedAt: serverTimestamp(),
        createdAt: userData.createdAt ?? serverTimestamp(),
      };
      delete (payload as Partial<UserData>).uid;
      await setDoc(ref, payload, { merge: true });
    } catch (err) {
      console.error('saveUserToFirestore error:', err);
    }
  }

  /**
   * Fetch a user document from Firestore by uid.
   */
  async fetchUserFromFirestore(uid: string): Promise<UserData | null> {
    try {
      const ref = doc(firebaseDb, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return { uid, ...snap.data() } as UserData;
    } catch (err) {
      console.error('fetchUserFromFirestore error:', err);
      return null;
    }
  }

  /**
   * Update user stats after answering a problem.
   */
  async updateStatsAfterAnswer(correct: boolean, responseMs: number): Promise<void> {
    const u = this.user();
    if (!u) return;
    try {
      const ref = doc(firebaseDb, 'users', u.uid);
      const totalSolved = u.totalSolved + 1;
      const totalCorrect = u.totalCorrect + (correct ? 1 : 0);
      const accuracy = Math.round((totalCorrect / totalSolved) * 100);

      // running average response time
      const prev = u.averageResponseMs;
      const count = totalSolved;
      const avgMs = Math.round((prev * (count - 1) + responseMs) / count);

      const bestStreak = Math.max(u.bestStreak, this.streak());
      const now = new Date().toISOString().split('T')[0];

      await updateDoc(ref, {
        totalSolved,
        totalCorrect,
        accuracy,
        currentStreak: this.streak(),
        bestStreak,
        xp: this.xp(),
        averageResponseMs: avgMs,
        lastPlayedDate: now,
        updatedAt: serverTimestamp(),
      });

      // Update local signal
      this.user.set({
        ...u,
        totalSolved,
        totalCorrect,
        accuracy,
        currentStreak: this.streak(),
        bestStreak,
        xp: this.xp(),
        averageResponseMs: avgMs,
        lastPlayedDate: now,
      });
    } catch (err) {
      console.error('updateStatsAfterAnswer error:', err);
    }
  }

  /**
   * Write or overwrite the leaderboard entry for the current user.
   */
  async updateLeaderboardEntry(): Promise<void> {
    const u = this.user();
    if (!u) return;
    try {
      const ref = doc(firebaseDb, 'leaderboard', u.uid);
      const entry: Omit<LeaderboardEntry, 'uid'> = {
        displayName: u.displayName,
        photoURL: u.photoURL,
        xp: u.xp,
        level: u.level,
        accuracy: u.accuracy,
        bestStreak: u.bestStreak,
        averageResponseMs: u.averageResponseMs,
        country: u.country,
        city: u.city,
        updatedAt: null,
      };
      await setDoc(ref, { ...entry, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('updateLeaderboardEntry error:', err);
    }
  }

  /**
   * Fetch leaderboard entries for the selected scope.
   */
  async fetchLeaderboard(scope: LeaderboardScope): Promise<void> {
    this.leaderboardLoading.set(true);
    try {
      const col = collection(firebaseDb, 'leaderboard');
      let q;

      if (scope === 'country' && this.userCountry()) {
        q = query(
          col,
          where('country', '==', this.userCountry()),
          orderBy('xp', 'desc'),
          limit(50)
        );
      } else if (scope === 'city' && this.userCity()) {
        q = query(
          col,
          where('city', '==', this.userCity()),
          orderBy('xp', 'desc'),
          limit(50)
        );
      } else {
        q = query(col, orderBy('xp', 'desc'), limit(50));
      }

      const snap = await getDocs(q);
      const entries: LeaderboardEntry[] = snap.docs.map(d => ({
        uid: d.id,
        ...(d.data() as Omit<LeaderboardEntry, 'uid'>),
      }));
      this.leaderboard.set(entries);
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
      this.leaderboard.set([]);
    } finally {
      this.leaderboardLoading.set(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Game logic
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start a new game session. Reset session stats and generate first problem.
   */
  startGame(): void {
    this.score.set(0);
    this.streak.set(0);
    this.sessionXP.set(0);
    this.sessionBestStreak.set(0);
    this.sessionCorrect.set(0);
    this.sessionTotal.set(0);
    this.responseTimes = [];
    this.feedback.set(null);
    this.generateProblem();
    this.currentScreen.set('game');
  }

  /**
   * Generate a new math problem based on current difficulty.
   */
  generateProblem(): void {
    const diff = this.difficulty();
    const problem = this.buildProblem(diff);
    this.currentProblem.set(problem);
    this.problemStartTime = Date.now();
    if (this.timerEnabled()) {
      this.resetTimer();
    }
  }

  /**
   * Build a Problem object for the given difficulty.
   */
  private buildProblem(diff: Difficulty): Problem {
    const operators: Operator[] = ['+', '-', '×', '÷'];
    const op = operators[Math.floor(Math.random() * operators.length)];

    let num1: number, num2: number, answer: number;

    const range = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    switch (diff) {
      case 'hard':
        if (op === '÷') {
          num2 = range(2, 20);
          answer = range(2, 10);
          num1 = num2 * answer;
        } else if (op === '×') {
          num1 = range(10, 30);
          num2 = range(10, 30);
          answer = num1 * num2;
        } else {
          num1 = range(50, 200);
          num2 = range(50, 200);
          if (op === '-') { if (num2 > num1) [num1, num2] = [num2, num1]; }
          answer = op === '+' ? num1 + num2 : num1 - num2;
        }
        break;
      case 'medium':
        if (op === '÷') {
          num2 = range(2, 10);
          answer = range(2, 10);
          num1 = num2 * answer;
        } else if (op === '×') {
          num1 = range(5, 20);
          num2 = range(5, 20);
          answer = num1 * num2;
        } else {
          num1 = range(10, 50);
          num2 = range(10, 50);
          if (op === '-') { if (num2 > num1) [num1, num2] = [num2, num1]; }
          answer = op === '+' ? num1 + num2 : num1 - num2;
        }
        break;
      default: // easy
        if (op === '÷') {
          num2 = range(1, 5);
          answer = range(1, 10);
          num1 = num2 * answer;
        } else if (op === '×') {
          num1 = range(1, 10);
          num2 = range(1, 10);
          answer = num1 * num2;
        } else {
          num1 = range(1, 10);
          num2 = range(1, 10);
          if (op === '-') { if (num2 > num1) [num1, num2] = [num2, num1]; }
          answer = op === '+' ? num1 + num2 : num1 - num2;
        }
    }

    return {
      num1,
      num2,
      operator: op,
      answer,
      displayQuestion: `${num1} ${op} ${num2} = ?`,
    };
  }

  /**
   * Submit an answer. Handles scoring, XP, feedback, badges, and advancement.
   */
  async submitAnswer(userAnswer: number): Promise<void> {
    const problem = this.currentProblem();
    if (!problem) return;

    this.stopTimer();
    const responseMs = Date.now() - this.problemStartTime;
    this.responseTimes.push(responseMs);

    const correct = userAnswer === problem.answer;
    this.sessionTotal.update(n => n + 1);

    if (correct) {
      const xpGain = this.xpForDifficulty(this.difficulty());
      this.score.update(n => n + 1);
      this.streak.update(n => n + 1);
      this.xp.update(n => n + xpGain);
      this.sessionXP.update(n => n + xpGain);
      this.sessionCorrect.update(n => n + 1);
      this.sessionBestStreak.update(n => Math.max(n, this.streak()));
      this.feedback.set('correct');
      this.playSound('correct');

      // Check confetti milestones
      const s = this.streak();
      if (s === 10 || s === 25 || s === 50 || s === 100) {
        this.triggerConfetti();
        this.playSound('streak');
      }

      // Update guest or user data
      if (this.isGuest()) {
        this.incrementGuestData(true, xpGain);
      } else {
        await this.checkAndAwardBadges(responseMs);
        await this.updateStatsAfterAnswer(true, responseMs);
        await this.updateLeaderboardEntry();
      }
    } else {
      this.streak.set(0);
      this.feedback.set('wrong');
      this.playSound('wrong');

      if (this.isGuest()) {
        this.incrementGuestData(false, 0);
      } else {
        await this.updateStatsAfterAnswer(false, responseMs);
      }
    }

    // Guest gate check
    if (this.isGuest() && this.guestSolvedCount() >= GUEST_LIMIT) {
      setTimeout(() => {
        this.stopTimer();
        this.guestGateTriggered.set(true);
        this.currentScreen.set('login');
      }, 600);
      return;
    }

    // Auto-advance
    setTimeout(() => {
      this.feedback.set(null);
      this.generateProblem();
    }, 600);
  }

  /**
   * Returns XP reward for a given difficulty.
   */
  private xpForDifficulty(diff: Difficulty): number {
    if (diff === 'hard') return 35;
    if (diff === 'medium') return 20;
    return 10;
  }

  /**
   * End the current game session and navigate to result screen.
   */
  endGame(): void {
    this.stopTimer();
    this.currentScreen.set('result');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Timer
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reset and start the countdown timer.
   */
  resetTimer(): void {
    this.stopTimer();
    this.timeLeft.set(15);
    this.timerInterval = setInterval(async () => {
      this.timeLeft.update(t => t - 1);
      if (this.timeLeft() <= 0) {
        // Time's up — treat as wrong
        await this.submitAnswer(-999999);
      }
    }, 1000);
  }

  /**
   * Stop the countdown timer.
   */
  stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Toggle timer mode on/off.
   */
  toggleTimer(): void {
    this.timerEnabled.update(v => !v);
    if (!this.timerEnabled()) {
      this.stopTimer();
      this.timeLeft.set(15);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Guest mode
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load guest data from localStorage on startup.
   */
  private loadGuestData(): void {
    const data = this.readGuestData();
    this.guestSolvedCount.set(data.solved);
    this.xp.set(data.xp);
    this.streak.set(data.streak);
  }

  /**
   * Read guest data from localStorage.
   */
  private readGuestData(): GuestData {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return { solved: 0, correct: 0, streak: 0, bestStreak: 0, xp: 0 };
      return JSON.parse(raw) as GuestData;
    } catch {
      return { solved: 0, correct: 0, streak: 0, bestStreak: 0, xp: 0 };
    }
  }

  /**
   * Increment guest stats and persist to localStorage.
   */
  private incrementGuestData(correct: boolean, xpGain: number): void {
    const data = this.readGuestData();
    data.solved += 1;
    if (correct) data.correct += 1;
    data.streak = correct ? data.streak + 1 : 0;
    data.bestStreak = Math.max(data.bestStreak, data.streak);
    data.xp += xpGain;
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
    this.guestSolvedCount.set(data.solved);
  }

  /**
   * Clear guest data from localStorage after merging into Firestore.
   */
  private clearGuestData(): void {
    localStorage.removeItem(GUEST_KEY);
    this.guestSolvedCount.set(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Daily streak
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the new daily streak based on lastPlayedDate.
   * Returns the updated dailyStreak and whether to update.
   */
  private computeDailyStreak(
    lastPlayedDate: string,
    currentDailyStreak: number
  ): { dailyStreak: number } {
    const today = new Date().toISOString().split('T')[0];
    if (!lastPlayedDate) return { dailyStreak: 1 };
    if (lastPlayedDate === today) return { dailyStreak: currentDailyStreak };

    const last = new Date(lastPlayedDate);
    const now = new Date(today);
    const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000);

    if (diffDays === 1) return { dailyStreak: currentDailyStreak + 1 };
    return { dailyStreak: 1 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Geolocation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Detect user's country and city via ipapi.co.
   */
  async detectLocation(): Promise<void> {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) return;
      const data = await res.json() as { country_name?: string; city?: string };
      this.userCountry.set(data.country_name ?? '');
      this.userCity.set(data.city ?? '');
    } catch {
      // Silently fail — location is optional
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sound (Web Audio API)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lazily initialize the Web Audio context.
   */
  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  /**
   * Play a sound effect using Web Audio oscillators (no external library).
   */
  playSound(type: 'correct' | 'wrong' | 'streak'): void {
    try {
      const ctx = this.getAudioCtx();

      if (type === 'correct') {
        this.beep(ctx, 880, 0.1, 'sine', 0, 0.15);
      } else if (type === 'wrong') {
        this.beep(ctx, 220, 0.15, 'sawtooth', 0, 0.2);
      } else if (type === 'streak') {
        this.beep(ctx, 660, 0.1, 'sine', 0, 0.12);
        this.beep(ctx, 880, 0.1, 'sine', 0.13, 0.12);
        this.beep(ctx, 1100, 0.15, 'sine', 0.26, 0.2);
      }
    } catch {
      // Audio may be blocked by browser policy — ignore
    }
  }

  /**
   * Create and play a single oscillator beep.
   */
  private beep(
    ctx: AudioContext,
    freq: number,
    gain: number,
    type: OscillatorType,
    startOffset: number,
    duration: number
  ): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime + startOffset);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
    osc.start(ctx.currentTime + startOffset);
    osc.stop(ctx.currentTime + startOffset + duration + 0.01);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Confetti
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Trigger a canvas-based confetti burst. No external library.
   */
  triggerConfetti(): void {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:9999;
    `;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    const particles: {
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; rotation: number; rotSpeed: number;
    }[] = [];

    const colors = ['#6c47ff', '#22c55e', '#f97316', '#ef4444', '#facc15', '#38bdf8'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      });
      frame++;
      if (frame < 120) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    requestAnimationFrame(animate);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Badges
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check and award badges based on current game state.
   */
  async checkAndAwardBadges(responseMs: number): Promise<void> {
    const u = this.user();
    if (!u) return;

    const badges = [...(u.badges ?? [])];
    let changed = false;

    const award = (badge: string) => {
      if (!badges.includes(badge)) {
        badges.push(badge);
        changed = true;
      }
    };

    if (u.totalCorrect + 1 === 1) award('first_blood');
    if (this.streak() >= 10) award('streak_10');
    if (this.streak() >= 25) award('streak_25');
    if (responseMs < 3000) award('speed_demon');
    if (u.totalSolved + 1 >= 100) award('century');

    if (changed) {
      const ref = doc(firebaseDb, 'users', u.uid);
      await updateDoc(ref, { badges });
      this.user.set({ ...u, badges });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dark mode
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load dark mode preference from localStorage.
   */
  private loadDarkModePreference(): void {
    const pref = localStorage.getItem('mathozz_darkmode');
    if (pref === 'true') this.isDarkMode.set(true);
  }

  /**
   * Toggle dark mode and persist preference.
   */
  toggleDarkMode(): void {
    this.isDarkMode.update(v => !v);
    localStorage.setItem('mathozz_darkmode', String(this.isDarkMode()));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Leaderboard navigation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Navigate to leaderboard and fetch initial data.
   */
  async goToLeaderboard(): Promise<void> {
    this.currentScreen.set('leaderboard');
    await this.fetchLeaderboard(this.selectedLeaderboardScope());
  }

  /**
   * Switch leaderboard scope and re-fetch.
   */
  async switchLeaderboardScope(scope: LeaderboardScope): Promise<void> {
    this.selectedLeaderboardScope.set(scope);
    await this.fetchLeaderboard(scope);
  }
}
