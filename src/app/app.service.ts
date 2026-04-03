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
  bestStreak: number;       // best in-session streak ever
  topSession: number;       // most problems solved correctly in one sitting
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

/** Per-problem time limit in seconds */
export const PROBLEM_TIME = 15;

const GUEST_KEY = 'mathozz_guest';
const GUEST_LIMIT = 50;

// ─── XP calc: time-based + streak bonus ──────────────────────────────────────
// Base XP by difficulty, multiplied by speed factor (faster = more XP)
// Streak bonus: +10% per 5-streak milestone
export function calcXP(
  difficulty: Difficulty,
  responseMs: number,
  streak: number
): number {
  const base = difficulty === 'hard' ? 35 : difficulty === 'medium' ? 20 : 10;
  // Speed factor: full score under 3s, linear decay to 0.4x at 15s
  const secs = Math.min(responseMs / 1000, PROBLEM_TIME);
  const speedFactor = Math.max(0.4, 1 - (secs / PROBLEM_TIME) * 0.6);
  // Streak bonus: +10% every 5 correct
  const streakBonus = 1 + Math.floor(streak / 5) * 0.1;
  return Math.round(base * speedFactor * streakBonus);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AppService {

  // ── Navigation ────────────────────────────────────────────────────────────
  currentScreen = signal<Screen>('home');

  // ── Auth ──────────────────────────────────────────────────────────────────
  user = signal<UserData | null>(null);
  isLoading = signal(false);
  authError = signal('');

  // ── Game state ────────────────────────────────────────────────────────────

  /** Correct answers this session */
  sessionCorrect = signal(0);

  /** Wrong answers this session */
  sessionWrong = signal(0);

  /** Current in-session consecutive streak */
  streak = signal(0);

  /** Best streak this session */
  sessionBestStreak = signal(0);

  /** XP earned this session */
  sessionXP = signal(0);

  /** Total answered this session */
  sessionTotal = signal(0);

  /** Current active problem */
  currentProblem = signal<Problem | null>(null);

  /** Answer being built by numpad */
  currentInput = signal('');

  /** Seconds remaining on current problem timer */
  timeLeft = signal(PROBLEM_TIME);

  /** Feedback state after answering */
  feedback = signal<FeedbackType>(null);

  /** Whether a problem is transitioning (brief lock after answer) */
  isTransitioning = signal(false);

  /** milliseconds when current problem was shown */
  private problemStartMs = 0;

  /** interval handle */
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  // ── Guest ─────────────────────────────────────────────────────────────────
  guestSolvedCount = signal(0);
  guestGateTriggered = signal(false);

  // ── Leaderboard ───────────────────────────────────────────────────────────
  leaderboard = signal<LeaderboardEntry[]>([]);
  selectedLeaderboardScope = signal<LeaderboardScope>('global');
  leaderboardLoading = signal(false);

  // ── Theme ─────────────────────────────────────────────────────────────────
  isDarkMode = signal(true); // default dark (blackboard)

  // ── Geo ───────────────────────────────────────────────────────────────────
  userCountry = signal('');
  userCity = signal('');

  // ── Computed ─────────────────────────────────────────────────────────────

  /** Difficulty based on session streak */
  difficulty = computed<Difficulty>(() => {
    const s = this.streak();
    if (s >= 20) return 'hard';
    if (s >= 8)  return 'medium';
    return 'easy';
  });

  isGuest = computed(() => this.user() === null);

  sessionAccuracy = computed(() => {
    const t = this.sessionTotal();
    return t === 0 ? 0 : Math.round((this.sessionCorrect() / t) * 100);
  });

  // ─────────────────────────────────────────────────────────────────────────
  constructor() {
    this.initAuth();
    this.loadGuestData();
    this.loadThemePref();
    this.detectLocation();
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  private initAuth(): void {
    onAuthStateChanged(firebaseAuth, async (fb: FirebaseUser | null) => {
      if (fb) {
        this.isLoading.set(true);
        try { await this.onUserLogin(fb); }
        catch (e) { console.error(e); }
        finally { this.isLoading.set(false); }
      } else {
        this.user.set(null);
      }
    });
  }

  private async onUserLogin(fb: FirebaseUser): Promise<void> {
    const guest = this.readGuestData();
    const existing = await this.fetchUserFromFirestore(fb.uid);
    const today = new Date().toISOString().split('T')[0];
    const { dailyStreak } = this.calcDailyStreak(
      existing?.lastPlayedDate ?? '', existing?.dailyStreak ?? 0
    );

    const u: UserData = {
      uid: fb.uid,
      displayName: existing?.displayName ?? fb.displayName ?? 'Anonymous',
      email: fb.email ?? '',
      photoURL: fb.photoURL ?? '',
      totalSolved:     (existing?.totalSolved ?? 0) + guest.solved,
      totalCorrect:    (existing?.totalCorrect ?? 0) + guest.correct,
      accuracy: 0,
      currentStreak:   Math.max(existing?.currentStreak ?? 0, guest.streak),
      bestStreak:      Math.max(existing?.bestStreak ?? 0, guest.bestStreak),
      topSession:      Math.max(existing?.topSession ?? 0, guest.topSession),
      dailyStreak,
      lastPlayedDate:  today,
      xp:              (existing?.xp ?? 0) + guest.xp,
      level:           1,
      averageResponseMs: existing?.averageResponseMs ?? 0,
      country: existing?.country ?? this.userCountry(),
      city:    existing?.city    ?? this.userCity(),
      isPremium: existing?.isPremium ?? false,
      badges:    existing?.badges ?? [],
      createdAt: existing?.createdAt ?? null,
      updatedAt: null,
    };
    const ts = u.totalSolved;
    const tc = u.totalCorrect;
    u.accuracy = ts > 0 ? Math.round((tc / ts) * 100) : 0;
    u.level = Math.floor(u.xp / 100) + 1;

    this.clearGuestData();
    this.user.set(u);
    await this.saveUserToFirestore(u);
    await this.updateLeaderboardEntry();
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
      await updateProfile(cred.user, { displayName });
      this.guestGateTriggered.set(false);
      this.currentScreen.set('home');
    } catch (e) { this.authError.set(this.parseAuthErr(e)); }
    finally { this.isLoading.set(false); }
  }

  async logout(): Promise<void> {
    try {
      await signOut(firebaseAuth);
      this.user.set(null);
      this.currentScreen.set('home');
    } catch (e) { console.error(e); }
  }

  private parseAuthErr(e: unknown): string {
    const code = (e as { code?: string })?.code ?? '';
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account found.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'Email already in use.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/weak-password': 'Password needs 6+ characters.',
      'auth/popup-closed-by-user': 'Sign-in popup closed.',
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

  /** Start a fresh game session */
  startGame(): void {
    this.sessionCorrect.set(0);
    this.sessionWrong.set(0);
    this.sessionTotal.set(0);
    this.sessionXP.set(0);
    this.sessionBestStreak.set(0);
    this.streak.set(0);
    this.currentInput.set('');
    this.feedback.set(null);
    this.isTransitioning.set(false);
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
      if (diff === 'easy')   { n2 = r(1,5);  ans = r(1,10); }
      else if (diff === 'medium') { n2 = r(2,12); ans = r(2,12); }
      else                   { n2 = r(2,20); ans = r(2,20); }
      n1 = n2 * ans;
    } else if (op === '×') {
      if (diff === 'easy')   { n1 = r(2,9);  n2 = r(2,9);  }
      else if (diff === 'medium') { n1 = r(3,25); n2 = r(3,25); }
      else                   { n1 = r(12,50); n2 = r(12,50); }
      ans = n1 * n2;
    } else {
      if (diff === 'easy')   { n1 = r(1,20);  n2 = r(1,20);  }
      else if (diff === 'medium') { n1 = r(10,99);  n2 = r(10,99);  }
      else                   { n1 = r(50,500); n2 = r(50,500); }
      if (op === '-' && n2 > n1) { [n1, n2] = [n2, n1]; }
      ans = op === '+' ? n1 + n2 : n1 - n2;
    }

    return { num1: n1, num2: n2, operator: op, answer: ans };
  }

  // ─── Numpad input ─────────────────────────────────────────────────────────

  /** Append digit from numpad press */
  pressDigit(d: string): void {
    if (this.isTransitioning()) return;
    const cur = this.currentInput();
    if (cur.length >= 7) return; // max 7 digits
    this.currentInput.set(cur + d);
  }

  /** Backspace on numpad */
  pressBackspace(): void {
    if (this.isTransitioning()) return;
    const cur = this.currentInput();
    this.currentInput.set(cur.slice(0, -1));
  }

  /** Clear numpad input */
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
    const userAns = parseInt(input, 10);
    const correct = userAns === problem.answer;

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
        setTimeout(() => { this.stopTimer(); this.guestGateTriggered.set(true); this.currentScreen.set('login'); }, 400);
        return;
      }
    }

    // auto-advance after short delay — no slide animation, just swap
    setTimeout(() => this.nextProblem(), 100);
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
      this.timeLeft.update(t => t - 1);
      if (this.timeLeft() <= 0) {
        // time's up → wrong, advance
        this.stopTimer();
        this.isTransitioning.set(true);
        this.sessionTotal.update(n => n + 1);
        this.sessionWrong.update(n => n + 1);
        this.streak.set(0);
        this.feedback.set('wrong');
        this.playSound('wrong');
        if (!this.isGuest()) {
          await this.persistStats(PROBLEM_TIME * 1000, false);
        } else {
          this.updateGuest(false, 0);
        }
        setTimeout(() => this.nextProblem(), 100);
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
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
      if (type === 'correct')      this.beep(ctx, 880, 'sine',     0,    0.08, 0.1);
      else if (type === 'wrong')   this.beep(ctx, 220, 'sawtooth', 0,    0.1,  0.15);
      else {
        this.beep(ctx, 660, 'sine', 0, 0.08, 0.1);
        this.beep(ctx, 880, 'sine', 0.11, 0.08, 0.1);
        this.beep(ctx, 1100,'sine', 0.22, 0.12, 0.15);
      }
    } catch { /* ignore */ }
  }

  private beep(ctx: AudioContext, freq: number, type: OscillatorType, start: number, gain: number, dur: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
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
    const ctx = canvas.getContext('2d')!;
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
    // default dark (blackboard). Only load if user previously set light.
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

  // ─── Problem Reports ──────────────────────────────────────────────────────

  async submitProblemReport(description: string): Promise<void> {
    // Validate and sanitize input
    if (!description || typeof description !== 'string') return;
    
    const sanitized = description.trim();
    
    // Enforce max length
    if (sanitized.length === 0 || sanitized.length > 500) return;
    
    // Prevent excessive parsing/encoding attacks
    const report: Omit<ProblemReport, 'id'> = {
      userId: this.user()?.uid || null,
      userEmail: this.user()?.email || null,
      userAgent: navigator.userAgent.substring(0, 256), // Limit UA string
      description: sanitized,
      timestamp: serverTimestamp() as Timestamp,
      resolved: false,
      screen: this.currentScreen(),
      ...(this.currentScreen() === 'game' && {
        gameState: {
          currentProblem: this.currentProblem() || undefined,
          score: this.sessionCorrect(),
          streak: this.streak(),
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProblemReport));
  }

  async markReportResolved(reportId: string): Promise<void> {
    const docRef = doc(firebaseDb, 'problem-reports', reportId);
    await updateDoc(docRef, { resolved: true });
  }
}