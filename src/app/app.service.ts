import { Injectable, signal, computed } from '@angular/core';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import { firebaseAuth } from './app.config';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Screen = 'home' | 'game' | 'result' | 'login' | 'stats' | 'profile';

export interface MathProblem {
  text: string;
  answer: number;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  totalSolved?: number;
  bestStreak?: number;
  dailyStreak?: number;
  totalTimeSpentMs?: number;
  averageTimePerProblemMs?: number;
  dailySolved?: number;
  weeklySolved?: number;
  monthlySolved?: number;
}

// ─────────────────────────────────────────────
// Adaptive Difficulty Engine
// ─────────────────────────────────────────────
// Score-based: every correct answer → +1, every wrong → -2
// Thresholds:  easy→medium at +5, medium→hard at +10, hard→expert at +15
// Drops:       wrong brings score down, crossing threshold drops level

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const LEVEL_UP_THRESHOLD   = 5;   // consecutive net score to level up
const LEVEL_DOWN_THRESHOLD = -2;  // net score to level down

// ─────────────────────────────────────────────
// Problem Generator — high quality, no repeats
// ─────────────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generates a mathematically clean, interesting problem for the given difficulty */
function generateProblem(difficulty: Difficulty, lastAnswer?: number): MathProblem {
  // Retry up to 10 times to avoid trivial problems (answer=0 for easy/medium)
  for (let attempt = 0; attempt < 10; attempt++) {
    const p = _gen(difficulty);
    // Avoid trivially-boring answers for easy/medium
    if ((difficulty === 'easy' || difficulty === 'medium') && p.answer === 0) continue;
    // Avoid the same answer twice in a row
    if (lastAnswer !== undefined && p.answer === lastAnswer) continue;
    return p;
  }
  return _gen(difficulty);
}

function _gen(difficulty: Difficulty): MathProblem {
  switch (difficulty) {
    case 'easy':   return genEasy();
    case 'medium': return genMedium();
    case 'hard':   return genHard();
    case 'expert': return genExpert();
  }
}

// ── EASY: single-op, small numbers ──────────────────────────────────────────
function genEasy(): MathProblem {
  const type = rand(0, 3);

  if (type === 0) {
    // Addition: a + b, both ≤ 20
    const a = rand(1, 20), b = rand(1, 20);
    return { text: `${a} + ${b}`, answer: a + b };
  }

  if (type === 1) {
    // Subtraction: a - b, result ≥ 0
    const b = rand(1, 15), a = rand(b, b + 15);
    return { text: `${a} − ${b}`, answer: a - b };
  }

  if (type === 2) {
    // Multiplication: small tables (2–9 × 2–9)
    const a = rand(2, 9), b = rand(2, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  // Division: exact, no remainder
  const b = rand(2, 9), a = b * rand(1, 9);
  return { text: `${a} ÷ ${b}`, answer: a / b };
}

// ── MEDIUM: two-step or larger numbers ──────────────────────────────────────
function genMedium(): MathProblem {
  const type = rand(0, 4);

  if (type === 0) {
    // Multi-step add/subtract: a + b - c
    const a = rand(10, 60), b = rand(5, 30), c = rand(1, 20);
    const answer = a + b - c;
    return { text: `${a} + ${b} − ${c}`, answer };
  }

  if (type === 1) {
    // Double-digit × single-digit
    const a = rand(11, 25), b = rand(3, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  if (type === 2) {
    // Square: n² where n = 4..15
    const n = rand(4, 15);
    return { text: `${n}²`, answer: n * n };
  }

  if (type === 3) {
    // Percentage: x% of y (multiples of 5, y ≤ 200)
    const pct = randFrom([10, 20, 25, 50]);
    const y   = rand(2, 20) * 10;
    return { text: `${pct}% of ${y}`, answer: Math.round(pct * y / 100) };
  }

  // Division with larger numbers
  const b = rand(3, 12), a = b * rand(4, 12);
  return { text: `${a} ÷ ${b}`, answer: a / b };
}

// ── HARD: three-step, squares, cube roots, mixed ops ────────────────────────
function genHard(): MathProblem {
  const type = rand(0, 4);

  if (type === 0) {
    // (a + b) × c
    const a = rand(5, 20), b = rand(5, 20), c = rand(2, 9);
    return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
  }

  if (type === 1) {
    // Cube: n³ where n = 2..6
    const n = rand(2, 6);
    return { text: `${n}³`, answer: n * n * n };
  }

  if (type === 2) {
    // Square root (perfect squares up to 225)
    const n = rand(2, 15);
    return { text: `√${n * n}`, answer: n };
  }

  if (type === 3) {
    // a² + b
    const a = rand(5, 12), b = rand(2, 20);
    return { text: `${a}² + ${b}`, answer: a * a + b };
  }

  // a × b + c × d (order of ops)
  const a = rand(3, 9), b = rand(3, 9), c = rand(2, 6), d = rand(2, 6);
  return { text: `${a}×${b} + ${c}×${d}`, answer: a * b + c * d };
}

// ── EXPERT: multi-step, larger squares, combined ops ────────────────────────
function genExpert(): MathProblem {
  const type = rand(0, 4);

  if (type === 0) {
    // (a² − b²) = (a+b)(a-b)
    const a = rand(6, 15), b = rand(2, a - 1);
    return { text: `${a}² − ${b}²`, answer: a * a - b * b };
  }

  if (type === 1) {
    // Large multiplication: 2-digit × 2-digit
    const a = rand(12, 25), b = rand(12, 25);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  if (type === 2) {
    // (a + b)² expanded mentally
    const a = rand(10, 20), b = rand(1, 9);
    return { text: `(${a} + ${b})²`, answer: (a + b) ** 2 };
  }

  if (type === 3) {
    // Cube root (perfect cubes)
    const n = randFrom([2, 3, 4, 5, 6]);
    return { text: `∛${n ** 3}`, answer: n };
  }

  // Multi-step: a² + b × c − d
  const a = rand(5, 10), b = rand(3, 8), c = rand(3, 8), d = rand(5, 20);
  return { text: `${a}² + ${b}×${c} − ${d}`, answer: a * a + b * c - d };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AppService {

  // ── Auth state ──────────────────────────────
  user             = signal<AppUser | null>(null);
  isLoading        = signal(false);
  authError        = signal('');
  guestGateTriggered = signal(false);
  guestSolvedCount = signal(0);

  // ── Navigation ──────────────────────────────
  currentScreen    = signal<Screen>('home');

  // ── Game state ──────────────────────────────
  currentProblem   = signal<MathProblem | null>(null);
  difficulty       = signal<Difficulty>('easy');
  feedback         = signal<'correct' | 'wrong' | null>(null);

  // Timer
  timerEnabled     = signal(false);
  timeLeft         = signal(15);
  private _timerHandle: any = null;

  // Session stats
  sessionSolved    = signal(0);
  sessionWrong     = signal(0);
  sessionBestStreak = signal(0);
  private _sessionStreak = 0;
  private _sessionStartMs = 0;

  // Adaptive difficulty state
  private _diffScore    = 0;   // net score; resets when level changes
  private _lastAnswer?: number;

  private readonly _googleProvider = new GoogleAuthProvider();

  // ── Computed ────────────────────────────────
  isGuest = computed(() => this.user() === null);

  sessionAccuracy = computed(() => {
    const total = this.sessionSolved() + this.sessionWrong();
    if (total === 0) return 100;
    return Math.round((this.sessionSolved() / total) * 100);
  });

  // Kept for backwards compat with template
  sessionStreak = computed(() => this._sessionStreak);

  constructor() {
    onAuthStateChanged(firebaseAuth, (authUser) => {
      if (authUser) {
        this.user.set(this._mapAuthUser(authUser));
      } else {
        this.user.set(null);
      }
    });
  }

  // ── Game lifecycle ──────────────────────────

  startGame(): void {
    this.sessionSolved.set(0);
    this.sessionWrong.set(0);
    this.sessionBestStreak.set(0);
    this._sessionStreak = 0;
    this._diffScore = 0;
    this._lastAnswer = undefined;
    this.difficulty.set('easy');
    this._sessionStartMs = Date.now();
    this.currentScreen.set('game');
    this._nextProblem();
    if (this.timerEnabled()) this._startTimer();
  }

  endGame(): void {
    this._stopTimer();
    this.currentScreen.set('result');
    this.currentProblem.set(null);
  }

  /** Called by component — synchronous, no await needed */
  submitAnswer(answer: number): void {
    const problem = this.currentProblem();
    if (!problem) return;

    const correct = answer === problem.answer;

    if (correct) {
      this.sessionSolved.update(n => n + 1);
      this._sessionStreak++;
      if (this._sessionStreak > this.sessionBestStreak()) {
        this.sessionBestStreak.set(this._sessionStreak);
      }
      this.feedback.set('correct');
      this._adaptDifficulty(true);
    } else {
      this.sessionWrong.update(n => n + 1);
      this._sessionStreak = 0;
      this.feedback.set('wrong');
      this._adaptDifficulty(false);
    }

    // Guest gate check
    if (this.isGuest()) {
      this.guestSolvedCount.update(n => n + 1);
      if (this.guestSolvedCount() >= 50) {
        this.guestGateTriggered.set(true);
        this.endGame();
        this.currentScreen.set('login');
        return;
      }
    }

    // Reset feedback + next problem after short delay
    setTimeout(() => {
      this.feedback.set(null);
      this._nextProblem();
      if (this.timerEnabled()) this._resetTimer();
    }, 400);
  }

  // ── Adaptive Difficulty ─────────────────────

  private _adaptDifficulty(correct: boolean): void {
    const levels = DIFFICULTY_ORDER;
    const currentIdx = levels.indexOf(this.difficulty());

    this._diffScore += correct ? 1 : -2;

    if (this._diffScore >= LEVEL_UP_THRESHOLD && currentIdx < levels.length - 1) {
      this.difficulty.set(levels[currentIdx + 1]);
      this._diffScore = 0;
    } else if (this._diffScore <= LEVEL_DOWN_THRESHOLD && currentIdx > 0) {
      this.difficulty.set(levels[currentIdx - 1]);
      this._diffScore = 0;
    }
    // Clamp score within reasonable bounds
    this._diffScore = Math.max(-4, Math.min(this._diffScore, LEVEL_UP_THRESHOLD));
  }

  // ── Problem generation ──────────────────────

  private _nextProblem(): void {
    const p = generateProblem(this.difficulty(), this._lastAnswer);
    this._lastAnswer = p.answer;
    this.currentProblem.set(p);
  }

  // ── Timer ───────────────────────────────────

  toggleTimer(): void {
    this.timerEnabled.update(v => !v);
  }

  private _startTimer(): void {
    this._stopTimer();
    this.timeLeft.set(15);
    this._timerHandle = setInterval(() => {
      this.timeLeft.update(t => {
        if (t <= 1) {
          // Time's up — treat as wrong
          this.submitAnswer(NaN);
          return 15;
        }
        return t - 1;
      });
    }, 1000);
  }

  private _resetTimer(): void {
    if (!this.timerEnabled()) return;
    this._stopTimer();
    this._startTimer();
  }

  private _stopTimer(): void {
    if (this._timerHandle) {
      clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      const result = await signInWithPopup(firebaseAuth, this._googleProvider);
      this.user.set(this._mapAuthUser(result.user));
      this.currentScreen.set('home');
    } catch (error: unknown) {
      this.authError.set(this._toAuthErrorMessage(error, 'Google sign-in failed.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      this.user.set(this._mapAuthUser(cred.user));
      this.currentScreen.set('home');
    } catch (error: unknown) {
      this.authError.set(this._toAuthErrorMessage(error, 'Sign-in failed.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async signupWithEmail(email: string, password: string, name: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      const displayName = name.trim() || email.split('@')[0];
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      this.user.set(this._mapAuthUser({ ...cred.user, displayName }));
      this.currentScreen.set('home');
    } catch (error: unknown) {
      this.authError.set(this._toAuthErrorMessage(error, 'Sign-up failed.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.authError.set('');
    try {
      await signOut(firebaseAuth);
      this.user.set(null);
      this.currentScreen.set('home');
    } catch (error: unknown) {
      this.authError.set(this._toAuthErrorMessage(error, 'Sign-out failed.'));
    }
  }

  // ── Utilities ───────────────────────────────

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  private _mapAuthUser(authUser: User): AppUser {
    return {
      uid: authUser.uid,
      email: authUser.email ?? '',
      displayName: authUser.displayName ?? authUser.email?.split('@')[0] ?? 'Player',
      totalSolved: 0,
      bestStreak: 0,
      dailyStreak: 0,
      totalTimeSpentMs: 0,
      averageTimePerProblemMs: 0,
      dailySolved: 0,
      weeklySolved: 0,
      monthlySolved: 0,
    };
  }

  private _toAuthErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = String((error as { code: unknown }).code);
      switch (code) {
        case 'auth/popup-closed-by-user':
          return 'Sign-in popup was closed before completing login.';
        case 'auth/popup-blocked':
          return 'Popup was blocked by the browser. Please allow popups and try again.';
        case 'auth/unauthorized-domain':
          return 'This domain is not authorized in Firebase Authentication.';
        case 'auth/invalid-credential':
          return 'Invalid credentials. Please try again.';
        case 'auth/user-not-found':
          return 'No account found for this email.';
        case 'auth/wrong-password':
          return 'Incorrect password.';
        case 'auth/email-already-in-use':
          return 'This email is already in use.';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters.';
        case 'auth/too-many-requests':
          return 'Too many attempts. Please try again later.';
        default:
          return fallback;
      }
    }
    return fallback;
  }
}