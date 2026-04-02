import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppService } from './app.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  host: {
    '(keydown)': 'onGlobalKeydown($event)',
  },
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

    :host {
      --bg: #111111;
      --surface: #1c1c1c;
      --border: #2d2d2d;
      --text: #e8e8e8;
      --muted: #666666;
      --muted2: #444444;
      --accent: #e8e8e8;
      --green: #4ade80;
      --red: #f87171;
      --amber: #fbbf24;
      --radius: 4px;
      --mono: 'IBM Plex Mono', monospace;
      --sans: 'IBM Plex Sans', sans-serif;

      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      overflow-x: hidden;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    button { cursor: pointer; font-family: var(--sans); }

    /* ── TOPBAR ───────────────────────────────── */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      height: 52px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .topbar-logo {
      font-family: var(--mono);
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .topbar-actions { display: flex; gap: 4px; align-items: center; }
    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      border: none;
      background: transparent;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 100ms, background 100ms;
    }
    .icon-btn:hover { color: var(--text); background: var(--surface); }
    .icon-btn svg { width: 18px; height: 18px; }

    .text-btn {
      height: 32px;
      padding: 0 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition: color 100ms, border-color 100ms;
    }
    .text-btn:hover { color: var(--text); border-color: var(--muted2); }
    .text-btn.primary {
      border-color: var(--text);
      color: var(--text);
    }

    /* ── SCREEN TRANSITION ────────────────────── */
    .screen {
      display: flex;
      flex-direction: column;
      flex: 1;
      animation: fadeIn 120ms ease both;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ════════════════════════════════════════════
       HOME SCREEN
    ════════════════════════════════════════════ */
    .home-screen {
      align-items: center;
      justify-content: center;
      gap: 0;
    }
    .home-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      padding: 40px 24px;
      gap: 48px;
      text-align: center;
    }
    .home-wordmark {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .home-title {
      font-family: var(--mono);
      font-size: clamp(2.5rem, 10vw, 5rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
      line-height: 1;
    }
    .home-tagline {
      font-size: 0.85rem;
      color: var(--muted);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 400;
    }
    .home-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 280px;
    }
    .home-start-btn {
      height: 56px;
      background: var(--text);
      color: var(--bg);
      border: none;
      border-radius: var(--radius);
      font-family: var(--mono);
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      transition: opacity 100ms;
    }
    .home-start-btn:hover { opacity: 0.85; }
    .home-guest-info {
      font-size: 0.75rem;
      color: var(--muted);
      letter-spacing: 0.05em;
    }
    .home-user-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 100%;
      max-width: 280px;
    }
    .home-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text);
      flex-shrink: 0;
    }
    .home-user-name { font-size: 0.85rem; font-weight: 500; }
    .home-user-sub { font-size: 0.72rem; color: var(--muted); margin-top: 1px; }

    /* ════════════════════════════════════════════
       GAME SCREEN
    ════════════════════════════════════════════ */
    .game-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Top strip */
    .game-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      height: 52px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .game-stat-group {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .game-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }
    .game-stat-label {
      font-size: 0.6rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .game-stat-value {
      font-family: var(--mono);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }
    .game-stat-value.timer-danger { color: var(--red); }

    /* Progress loader bar — replaces timer bar */
    .progress-bar {
      height: 3px;
      background: var(--border);
      flex-shrink: 0;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--text);
      transition: width 0.8s linear, background 0.3s;
    }
    .progress-fill.danger { background: var(--red); }

    /* Difficulty badge with adaptive indicator */
    .diff-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .game-diff-badge {
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      font-family: var(--mono);
    }
    .diff-arrow {
      font-size: 0.7rem;
      line-height: 1;
    }
    .diff-arrow.up   { color: var(--red); }
    .diff-arrow.down { color: var(--green); }

    /* Problem display */
    .game-problem-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      gap: 16px;
    }
    .game-problem-text {
      font-family: var(--mono);
      font-size: clamp(2.8rem, 12vw, 7rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
      line-height: 1;
      text-align: center;
    }
    .game-answer-display {
      font-family: var(--mono);
      font-size: clamp(1.6rem, 6vw, 3rem);
      font-weight: 500;
      color: var(--muted);
      min-height: 1.2em;
      letter-spacing: 0.05em;
      transition: color 80ms;
    }
    .game-answer-display.has-val { color: var(--text); }
    .game-answer-display.correct { color: var(--green); }
    .game-answer-display.wrong   { color: var(--red); }

    /* feedback flash overlay */
    .feedback-flash {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 50;
      animation: flash 400ms ease both;
    }
    .feedback-flash.correct { background: rgba(74,222,128,0.06); }
    .feedback-flash.wrong   { background: rgba(248,113,113,0.08); }
    @keyframes flash {
      0%   { opacity: 0; }
      20%  { opacity: 1; }
      100% { opacity: 0; }
    }

    /* Numpad */
    .game-numpad {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .numpad-key {
      display: flex;
      align-items: center;
      justify-content: center;
      height: clamp(64px, 13vw, 90px);
      border: none;
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      color: var(--muted);
      font-family: var(--mono);
      font-size: clamp(1.1rem, 4vw, 1.6rem);
      font-weight: 500;
      transition: background 80ms, color 80ms;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .numpad-key:nth-child(3n) { border-right: none; }
    .numpad-key:hover { background: var(--surface); color: var(--text); }
    .numpad-key:active { background: var(--border); color: var(--text); }
    .numpad-key.action {
      font-size: clamp(0.65rem, 2.5vw, 0.8rem);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted2);
    }
    .numpad-key.action:hover { color: var(--muted); }
    .numpad-key.zero { grid-column: 2; }
    .numpad-key.backspace { border-right: none; }
    .numpad-key.backspace svg { width: 20px; height: 20px; }

    /* Hidden input for keyboard on desktop */
    .hidden-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 1px;
      height: 1px;
    }

    /* ════════════════════════════════════════════
       RESULT SCREEN
    ════════════════════════════════════════════ */
    .result-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      gap: 40px;
    }
    .result-header { text-align: center; }
    .result-big {
      font-family: var(--mono);
      font-size: clamp(4rem, 16vw, 8rem);
      font-weight: 700;
      line-height: 1;
      color: var(--text);
    }
    .result-label {
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 8px;
    }
    .result-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: var(--border);
      width: 100%;
      max-width: 360px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .result-cell {
      padding: 20px 16px;
      background: var(--bg);
      text-align: center;
    }
    .result-cell-val {
      font-family: var(--mono);
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text);
    }
    .result-cell-label {
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 4px;
    }
    .result-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 280px;
    }
    .result-play-btn {
      height: 52px;
      background: var(--text);
      color: var(--bg);
      border: none;
      border-radius: var(--radius);
      font-family: var(--mono);
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      transition: opacity 100ms;
    }
    .result-play-btn:hover { opacity: 0.85; }
    .result-guest-box {
      width: 100%;
      max-width: 360px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      text-align: center;
    }
    .result-guest-box p {
      font-size: 0.8rem;
      color: var(--muted);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    /* ════════════════════════════════════════════
       LOGIN SCREEN
    ════════════════════════════════════════════ */
    .login-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
    }
    .login-box {
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .login-header { text-align: center; }
    .login-logo {
      font-family: var(--mono);
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .login-title {
      font-size: 1.2rem;
      font-weight: 500;
      color: var(--text);
    }
    .login-sub {
      font-size: 0.8rem;
      color: var(--muted);
      margin-top: 4px;
    }
    .gate-notice {
      padding: 12px 14px;
      border: 1px solid var(--amber);
      border-radius: var(--radius);
      font-size: 0.8rem;
      color: var(--amber);
      text-align: center;
    }
    .tab-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .tab-btn {
      height: 36px;
      border: none;
      background: transparent;
      color: var(--muted);
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition: background 100ms, color 100ms;
    }
    .tab-btn.active { background: var(--surface); color: var(--text); }
    .form-stack { display: flex; flex-direction: column; gap: 10px; }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-label {
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .form-input {
      height: 42px;
      padding: 0 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      font-family: var(--sans);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 100ms;
    }
    .form-input:focus { border-color: var(--muted); }
    .form-error {
      font-size: 0.78rem;
      color: var(--red);
      text-align: center;
      padding: 8px;
    }
    .google-btn {
      height: 42px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-size: 0.85rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: border-color 100ms;
    }
    .google-btn:hover { border-color: var(--muted2); }
    .divider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--muted2);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
    }
    .divider-row::before, .divider-row::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }
    .submit-btn {
      height: 42px;
      background: var(--text);
      color: var(--bg);
      border: none;
      border-radius: var(--radius);
      font-family: var(--mono);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: opacity 100ms;
    }
    .submit-btn:hover { opacity: 0.85; }
    .submit-btn:disabled { opacity: 0.4; }
    .login-footer {
      text-align: center;
      font-size: 0.78rem;
      color: var(--muted);
    }
    .login-footer button {
      background: none;
      border: none;
      color: var(--muted);
      text-decoration: underline;
      font-size: 0.78rem;
    }
    .login-footer button:hover { color: var(--text); }

    /* ════════════════════════════════════════════
       STATS SCREEN
    ════════════════════════════════════════════ */
    .stats-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .stats-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
      max-width: 560px;
      width: 100%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .stats-section-title {
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 12px;
      font-family: var(--mono);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: var(--border);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .stats-cell {
      padding: 20px 16px;
      background: var(--bg);
    }
    .stats-cell-val {
      font-family: var(--mono);
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
    }
    .stats-cell-label {
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 6px;
    }
    .stats-row-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid var(--border);
    }
    .stats-row-item:last-child { border-bottom: none; }
    .stats-row-label { font-size: 0.85rem; color: var(--muted); }
    .stats-row-val {
      font-family: var(--mono);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text);
    }

    /* ════════════════════════════════════════════
       PROFILE SCREEN
    ════════════════════════════════════════════ */
    .profile-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .profile-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
      max-width: 560px;
      width: 100%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .profile-hero {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .profile-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--mono);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
      flex-shrink: 0;
    }
    .profile-name { font-size: 1rem; font-weight: 500; }
    .profile-email { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
    .settings-list { display: flex; flex-direction: column; }
    .settings-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid var(--border);
    }
    .settings-item:last-child { border-bottom: none; }
    .settings-label { font-size: 0.85rem; color: var(--muted); }
    .settings-action {
      height: 30px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: transparent;
      color: var(--text);
      font-size: 0.75rem;
      font-family: var(--mono);
      letter-spacing: 0.05em;
      transition: border-color 100ms;
    }
    .settings-action:hover { border-color: var(--muted2); }
    .danger-btn {
      height: 42px;
      width: 100%;
      border: 1px solid var(--red);
      border-radius: var(--radius);
      background: transparent;
      color: var(--red);
      font-size: 0.8rem;
      font-family: var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: background 100ms;
    }
    .danger-btn:hover { background: rgba(248,113,113,0.08); }

    /* ── Responsive ──────────────────────────── */
    @media (min-width: 640px) {
      .game-problem-text { font-size: 4rem; }
      .numpad-key { height: 90px; font-size: 1.6rem; }
      .home-title { font-size: 5rem; }
    }
    @media (min-width: 1024px) {
      .game-screen { max-width: 620px; margin: 0 auto; border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
    }
  `],
  template: `
    <!-- Feedback flash -->
    @if (svc.feedback()) {
      <div class="feedback-flash"
        [class.correct]="svc.feedback()==='correct'"
        [class.wrong]="svc.feedback()==='wrong'">
      </div>
    }

    <!-- Hidden input for keyboard typing on desktop -->
    <input #hiddenInput class="hidden-input" type="number" inputmode="numeric"
      [(ngModel)]="answerValue" (keydown.enter)="onSubmitImmediate()" autocomplete="off" />

    <!-- ════════════════════════════════
         HOME
    ════════════════════════════════ -->
    @if (svc.currentScreen() === 'home') {
      <div class="screen home-screen">
        <div class="topbar">
          <span class="topbar-logo">Mathozz</span>
          <div class="topbar-actions">
            @if (svc.isGuest()) {
              <button class="text-btn" (click)="svc.currentScreen.set('login')">Sign In</button>
            } @else {
              <!-- Logout icon top-right when logged in -->
              <button class="icon-btn" (click)="svc.logout()" title="Sign out">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7"/>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                </svg>
              </button>
            }
          </div>
        </div>

        <div class="home-hero">
          <div class="home-wordmark">
            <div class="home-title">Mathozz</div>
            <div class="home-tagline">Think fast. Go further.</div>
          </div>

          @if (!svc.isGuest()) {
            <div class="home-user-row">
              <div class="home-avatar">{{ avatarLetter() }}</div>
              <div>
                <div class="home-user-name">{{ svc.user()?.displayName }}</div>
                <div class="home-user-sub">{{ svc.user()?.totalSolved ?? 0 }} problems solved</div>
              </div>
            </div>
          }

          <div class="home-actions">
            <button class="home-start-btn" (click)="svc.startGame()">Start</button>
            @if (svc.isGuest()) {
              <div class="home-guest-info">{{ svc.guestSolvedCount() }} / 50 free problems</div>
            } @else {
              <button class="text-btn" (click)="svc.currentScreen.set('stats')">Stats</button>
            }
          </div>
        </div>

        <!-- Removed bottom nav row with profile / theme toggles -->
      </div>
    }

    <!-- ════════════════════════════════
         GAME
    ════════════════════════════════ -->
    @if (svc.currentScreen() === 'game') {
      <div class="screen game-screen">

        <!-- Top stat bar — no pause, no timer toggle -->
        <div class="game-topbar">
          <button class="icon-btn" (click)="svc.endGame()" title="End session">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div class="game-stat-group">
            <div class="game-stat">
              <span class="game-stat-label">Correct</span>
              <span class="game-stat-value">{{ svc.sessionSolved() }}</span>
            </div>
            <div class="game-stat">
              <span class="game-stat-label">Wrong</span>
              <span class="game-stat-value">{{ svc.sessionWrong() }}</span>
            </div>
            @if (svc.timerEnabled()) {
              <div class="game-stat">
                <span class="game-stat-label">Time</span>
                <span class="game-stat-value" [class.timer-danger]="svc.timeLeft() <= 5">
                  {{ svc.timeLeft() }}
                </span>
              </div>
            }
          </div>

          <!-- spacer to keep topbar balanced -->
          <div style="width:36px"></div>
        </div>

        <!-- Progress loader bar (always shown) -->
        <div class="progress-bar">
          <div class="progress-fill"
            [class.danger]="svc.timerEnabled() && svc.timeLeft() <= 5"
            [style.width.%]="progressPercent()">
          </div>
        </div>

        <!-- Problem area -->
        <div class="game-problem-area" (click)="focusHidden()">

          <!-- Difficulty badge + adaptive arrow -->
          <div class="diff-row">
            <div class="game-diff-badge">{{ svc.difficulty() }}</div>
            @if (diffTrend() === 'up') {
              <span class="diff-arrow up" title="Getting harder">▲</span>
            } @else if (diffTrend() === 'down') {
              <span class="diff-arrow down" title="Getting easier">▼</span>
            }
          </div>

          @if (svc.currentProblem()) {
            <div class="game-problem-text">{{ svc.currentProblem()!.text }}</div>
          }

          <div class="game-answer-display"
            [class.has-val]="answerValue !== null && answerValue !== undefined && answerValue !== ''"
            [class.correct]="svc.feedback() === 'correct'"
            [class.wrong]="svc.feedback() === 'wrong'">
            @if (answerValue !== null && answerValue !== undefined && answerValue.toString() !== '') {
              {{ answerValue }}
            } @else {
              ?
            }
          </div>
        </div>

        <!-- Numpad -->
        <div class="game-numpad">
          @for (key of [1,2,3,4,5,6,7,8,9]; track key) {
            <button class="numpad-key" (pointerdown)="numpadPress(key.toString())">{{ key }}</button>
          }
          <button class="numpad-key action" (pointerdown)="numpadPress('clear')">Clear</button>
          <button class="numpad-key zero" (pointerdown)="numpadPress('0')">0</button>
          <button class="numpad-key backspace action" (pointerdown)="numpadPress('back')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 12H9m0 0 4-4m-4 4 4 4"/><path d="M3 12h2"/>
            </svg>
          </button>
        </div>

      </div>
    }

    <!-- ════════════════════════════════
         RESULT
    ════════════════════════════════ -->
    @if (svc.currentScreen() === 'result') {
      <div class="screen result-screen">
        <div class="result-header">
          <div class="result-big">{{ svc.sessionSolved() }}</div>
          <div class="result-label">Problems solved</div>
        </div>

        <div class="result-grid">
          <div class="result-cell">
            <div class="result-cell-val">{{ svc.sessionBestStreak() }}</div>
            <div class="result-cell-label">Best streak</div>
          </div>
          <div class="result-cell">
            <div class="result-cell-val">{{ svc.sessionAccuracy() }}%</div>
            <div class="result-cell-label">Accuracy</div>
          </div>
          <div class="result-cell">
            <div class="result-cell-val">{{ svc.sessionWrong() }}</div>
            <div class="result-cell-label">Wrong</div>
          </div>
          <div class="result-cell">
            <div class="result-cell-val">{{ svc.difficulty() }}</div>
            <div class="result-cell-label">Final difficulty</div>
          </div>
        </div>

        @if (svc.isGuest()) {
          <div class="result-guest-box">
            <p>Create a free account to save your progress and track stats over time.</p>
            <button class="text-btn primary" (click)="svc.currentScreen.set('login')">Create Account</button>
          </div>
        }

        <div class="result-actions">
          <button class="result-play-btn" (click)="svc.startGame()">Play Again</button>
          <button class="text-btn" (click)="svc.currentScreen.set('home')">Home</button>
        </div>
      </div>
    }

    <!-- ════════════════════════════════
         LOGIN
    ════════════════════════════════ -->
    @if (svc.currentScreen() === 'login') {
      <div class="screen login-screen">
        <div class="login-box">
          <div class="login-header">
            <div class="login-logo">Mathozz</div>
            <div class="login-title">{{ loginTab() === 'login' ? 'Welcome back' : 'Join Mathozz' }}</div>
            <div class="login-sub">{{ loginTab() === 'login' ? 'Sign in to continue.' : 'Free forever.' }}</div>
          </div>

          @if (svc.guestGateTriggered()) {
            <div class="gate-notice">
              You've solved 50 problems. Sign in to keep going and save your stats.
            </div>
          }

          <div class="tab-row">
            <button class="tab-btn" [class.active]="loginTab()==='login'" (click)="loginTab.set('login')">Sign In</button>
            <button class="tab-btn" [class.active]="loginTab()==='signup'" (click)="loginTab.set('signup')">Sign Up</button>
          </div>

          <div class="form-stack">
            <button class="google-btn" (click)="svc.loginWithGoogle()" [disabled]="svc.isLoading()">
              <svg width="16" height="16" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.16C6.51 42.62 14.62 48 24 48z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.16C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.16C12.43 13.72 17.74 9.5 24 9.5z"/>
              </svg>
              Continue with Google
            </button>

            <div class="divider-row">or</div>

            @if (loginTab() === 'signup') {
              <div class="form-field">
                <label class="form-label">Name</label>
                <input class="form-input" type="text" placeholder="Your name" [(ngModel)]="signupName" />
              </div>
            }

            <div class="form-field">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" placeholder="you@example.com" [(ngModel)]="loginEmail" />
            </div>

            <div class="form-field">
              <label class="form-label">Password</label>
              <input class="form-input" type="password" placeholder="••••••••"
                [(ngModel)]="loginPassword"
                (keydown.enter)="onAuthSubmit()" />
            </div>

            @if (svc.authError()) {
              <div class="form-error">{{ svc.authError() }}</div>
            }

            <button class="submit-btn" (click)="onAuthSubmit()" [disabled]="svc.isLoading()">
              {{ svc.isLoading() ? 'Please wait…' : (loginTab() === 'login' ? 'Sign In' : 'Create Account') }}
            </button>
          </div>

          <div class="login-footer">
            <button (click)="svc.currentScreen.set('home')">Continue as guest →</button>
          </div>
        </div>
      </div>
    }

    <!-- ════════════════════════════════
         STATS
    ════════════════════════════════ -->
    @if (svc.currentScreen() === 'stats') {
      <div class="screen stats-screen">
        <div class="topbar">
          <button class="icon-btn" (click)="svc.currentScreen.set('home')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <span class="topbar-logo">Stats</span>
          <div style="width:36px"></div>
        </div>

        @if (svc.user(); as u) {
          <div class="stats-body">
            <div>
              <div class="stats-section-title">Overview</div>
              <div class="stats-grid">
                <div class="stats-cell">
                  <div class="stats-cell-val">{{ u.totalSolved ?? 0 }}</div>
                  <div class="stats-cell-label">Total solved</div>
                </div>
                <div class="stats-cell">
                  <div class="stats-cell-val">{{ u.bestStreak ?? 0 }}</div>
                  <div class="stats-cell-label">Best streak</div>
                </div>
                <div class="stats-cell">
                  <div class="stats-cell-val">{{ svc.formatTime(u.totalTimeSpentMs ?? 0) }}</div>
                  <div class="stats-cell-label">Total time</div>
                </div>
                <div class="stats-cell">
                  <div class="stats-cell-val">{{ u.averageTimePerProblemMs ? ((u.averageTimePerProblemMs / 1000).toFixed(1) + 's') : '—' }}</div>
                  <div class="stats-cell-label">Avg / problem</div>
                </div>
              </div>
            </div>

            <div>
              <div class="stats-section-title">This period</div>
              <div class="settings-list">
                <div class="stats-row-item">
                  <span class="stats-row-label">Today</span>
                  <span class="stats-row-val">{{ u.dailySolved ?? 0 }}</span>
                </div>
                <div class="stats-row-item">
                  <span class="stats-row-label">This week</span>
                  <span class="stats-row-val">{{ u.weeklySolved ?? 0 }}</span>
                </div>
                <div class="stats-row-item">
                  <span class="stats-row-label">This month</span>
                  <span class="stats-row-val">{{ u.monthlySolved ?? 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- ════════════════════════════════
         PROFILE
    ════════════════════════════════ -->
    @if (svc.currentScreen() === 'profile') {
      <div class="screen profile-screen">
        <div class="topbar">
          <button class="icon-btn" (click)="svc.currentScreen.set('home')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <span class="topbar-logo">Profile</span>
          <div style="width:36px"></div>
        </div>

        @if (svc.user(); as u) {
          <div class="profile-body">
            <div class="profile-hero">
              <div class="profile-avatar">{{ u.displayName.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="profile-name">{{ u.displayName }}</div>
                <div class="profile-email">{{ u.email }}</div>
              </div>
            </div>

            <div>
              <div class="stats-section-title">Settings</div>
              <div class="settings-list">
                <div class="settings-item">
                  <span class="settings-label">Timer</span>
                  <button class="settings-action" (click)="svc.toggleTimer()">
                    {{ svc.timerEnabled() ? 'Enabled' : 'Disabled' }}
                  </button>
                </div>
              </div>
            </div>

            <button class="danger-btn" (click)="svc.logout()">Sign Out</button>
          </div>
        } @else {
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px">
            <p style="color:var(--muted);font-size:0.85rem">Not signed in.</p>
            <button class="text-btn primary" (click)="svc.currentScreen.set('login')">Sign In</button>
          </div>
        }
      </div>
    }
  `
})
export class AppComponent {
  readonly svc = inject(AppService);

  answerValue: string = '';
  loginTab = signal<'login' | 'signup'>('login');
  loginEmail = '';
  loginPassword = '';
  signupName = '';

  /** Track previous difficulty to show trend arrow */
  private _prevDifficulty = '';
  diffTrend = signal<'up' | 'down' | 'none'>('none');

  @ViewChild('hiddenInput') hiddenInputRef?: ElementRef<HTMLInputElement>;

  constructor() {
    // Focus hidden input when game starts
    effect(() => {
      const screen = this.svc.currentScreen();
      if (screen === 'game') {
        queueMicrotask(() => {
          this.hiddenInputRef?.nativeElement.focus();
        });
      }
    });

    // Reset answer on new problem
    effect(() => {
      this.svc.currentProblem();
      this.answerValue = '';
    });

    // Track difficulty trend for adaptive arrow
    effect(() => {
      const diff = this.svc.difficulty();
      const levels = ['easy', 'medium', 'hard', 'expert'];
      const prev = levels.indexOf(this._prevDifficulty);
      const curr = levels.indexOf(diff);
      if (this._prevDifficulty && prev !== -1 && curr !== -1 && curr !== prev) {
        this.diffTrend.set(curr > prev ? 'up' : 'down');
        // Clear arrow after 2s
        setTimeout(() => this.diffTrend.set('none'), 2000);
      }
      this._prevDifficulty = diff;
    });
  }

  /**
   * Progress bar percent:
   * - If timer enabled: based on timeLeft / 15
   * - Otherwise: session progress (solved / (solved + wrong + 1)) as a rolling fill
   */
  progressPercent = computed(() => {
    if (this.svc.timerEnabled()) {
      return (this.svc.timeLeft() / 15) * 100;
    }
    // Show a smooth rolling bar based on correct ratio in session
    const solved = this.svc.sessionSolved();
    const wrong = this.svc.sessionWrong();
    const total = solved + wrong;
    if (total === 0) return 100;
    return Math.round((solved / total) * 100);
  });

  /** Numpad — use pointerdown for instant response (no 300ms mobile delay) */
  numpadPress(key: string): void {
    const currentValue = String(this.answerValue ?? '');

    if (key === 'clear') {
      this.answerValue = '';
      return;
    }
    if (key === 'back') {
      this.answerValue = currentValue.slice(0, -1);
      return;
    }
    if (currentValue.length >= 7) return;
    this.answerValue = currentValue + key;

    // Auto-submit after short delay to allow multi-digit answers
    clearTimeout(this._autoSubmitTimer);
    this._autoSubmitTimer = setTimeout(() => this.onSubmitImmediate(), 550);
  }
  private _autoSubmitTimer: any;

  focusHidden(): void {
    this.hiddenInputRef?.nativeElement.focus();
  }

  /** Synchronous path — called from numpad/keyboard for instant feel */
  onSubmitImmediate(): void {
    clearTimeout(this._autoSubmitTimer);
    const val = String(this.answerValue ?? '').trim();
    if (!val) return;
    const num = Number(val);
    if (isNaN(num)) return;
    this.answerValue = '';
    // Fire and forget — don't await so UI never blocks
    this.svc.submitAnswer(num);
  }

  async onAuthSubmit(): Promise<void> {
    if (this.loginTab() === 'login') {
      await this.svc.loginWithEmail(this.loginEmail, this.loginPassword);
    } else {
      await this.svc.signupWithEmail(this.loginEmail, this.loginPassword, this.signupName);
    }
  }

  avatarLetter = computed(() => {
    const name = this.svc.user()?.displayName ?? 'G';
    return name.charAt(0).toUpperCase();
  });

  async onGlobalKeydown(event: KeyboardEvent): Promise<void> {
    const screen = this.svc.currentScreen();

    if (screen === 'game') {
      const key = event.key;

      if (key >= '0' && key <= '9') {
        this.numpadPress(key);
      } else if (key === 'Backspace') {
        this.numpadPress('back');
      } else if (key === 'Delete') {
        this.numpadPress('clear');
      } else if (key === 'Enter') {
        this.onSubmitImmediate();
      } else if (key === 'Escape') {
        this.svc.endGame();
      }
    } else if (event.key === 'Escape' && screen !== 'home') {
      this.svc.currentScreen.set('home');
    }
  }
}