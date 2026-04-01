import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  ViewChild,
  afterNextRender,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppService, LeaderboardScope } from './app.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  host: {
    '[class.dark]': 'svc.isDarkMode()',
    '(keydown)': 'onGlobalKeydown($event)',
  },
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

    :host {
      --bg: #ffffff;
      --surface: #f5f5f5;
      --border: #e5e5e5;
      --text: #111111;
      --muted: #888888;
      --accent: #6c47ff;
      --accent-soft: rgba(108,71,255,0.12);
      --success: #22c55e;
      --error: #ef4444;
      --streak: #f97316;
      --warn: #facc15;
      --radius: 16px;
      --radius-sm: 8px;
      --shadow: 0 4px 24px rgba(0,0,0,0.07);
      --shadow-lg: 0 12px 48px rgba(0,0,0,0.12);
      --transition: 200ms ease;

      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      transition: background var(--transition), color var(--transition);
      overflow-x: hidden;
    }

    :host.dark {
      --bg: #0f0f0f;
      --surface: #1a1a1a;
      --border: #2a2a2a;
      --text: #f5f5f5;
      --muted: #666666;
      --accent-soft: rgba(108,71,255,0.2);
      --shadow: 0 4px 24px rgba(0,0,0,0.3);
      --shadow-lg: 0 12px 48px rgba(0,0,0,0.5);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Layout ───────────────────────────────── */
    .screen {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      animation: fadeUp 280ms ease both;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 0 20px;
    }

    /* ── Top bar ──────────────────────────────── */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }
    .topbar-logo {
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 1.4rem;
      color: var(--accent);
      letter-spacing: -0.02em;
    }
    .topbar-actions { display: flex; gap: 8px; align-items: center; }

    /* ── Buttons ──────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 48px;
      padding: 0 24px;
      border-radius: var(--radius);
      font-family: 'DM Sans', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      outline: none;
      transition: all var(--transition);
      text-decoration: none;
      white-space: nowrap;
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: var(--shadow); }
    .btn-primary:active { transform: translateY(0); }
    .btn-outline {
      background: transparent;
      color: var(--text);
      border: 1.5px solid var(--border);
    }
    .btn-outline:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
    .btn-ghost {
      background: transparent;
      color: var(--muted);
      padding: 0 12px;
    }
    .btn-ghost:hover { color: var(--text); background: var(--surface); border-radius: var(--radius-sm); }
    .btn-danger { background: var(--error); color: #fff; }
    .btn-danger:hover { opacity: 0.88; }
    .btn-google {
      background: #fff;
      color: #333;
      border: 1.5px solid var(--border);
      box-shadow: var(--shadow);
    }
    .btn-google:hover { box-shadow: var(--shadow-lg); transform: translateY(-1px); }
    .btn-full { width: 100%; }
    .btn-sm { min-height: 36px; padding: 0 16px; font-size: 0.875rem; border-radius: var(--radius-sm); }
    .btn-icon {
      min-height: 40px;
      width: 40px;
      padding: 0;
      border-radius: 50%;
      font-size: 1.1rem;
    }

    /* ── Cards ────────────────────────────────── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }

    /* ── Form ─────────────────────────────────── */
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 0.875rem; font-weight: 500; color: var(--muted); }
    .form-input {
      height: 48px;
      padding: 0 16px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      font-size: 1rem;
      outline: none;
      transition: border-color var(--transition);
    }
    .form-input:focus { border-color: var(--accent); }

    /* ── Tabs ─────────────────────────────────── */
    .tabs {
      display: flex;
      gap: 4px;
      background: var(--surface);
      border-radius: var(--radius-sm);
      padding: 4px;
    }
    .tab {
      flex: 1;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--muted);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition);
    }
    .tab.active { background: var(--bg); color: var(--accent); font-weight: 600; box-shadow: var(--shadow); }

    /* ── Badge chips ──────────────────────────── */
    .badge-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent-soft);
      color: var(--accent);
      border-radius: 100px;
      padding: 4px 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* ── Stat cards ───────────────────────────── */
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label { font-size: 0.75rem; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-family: 'Syne', sans-serif; font-size: 1.6rem; font-weight: 800; line-height: 1; color: var(--text); }

    /* ── Progress bar ─────────────────────────── */
    .progress-bar {
      height: 8px;
      background: var(--surface);
      border-radius: 100px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 100px;
      transition: width 600ms cubic-bezier(0.34,1.56,0.64,1);
    }

    /* ── Divider ──────────────────────────────── */
    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--muted);
      font-size: 0.8rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    /* ── Skeleton ─────────────────────────────── */
    .skeleton {
      background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ═══════════════════════════════════════════
       HOME SCREEN
    ═══════════════════════════════════════════ */
    .home-screen {
      display: flex;
      flex-direction: column;
    }
    .home-hero {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px 20px 40px;
      gap: 24px;
    }
    .home-logo {
      font-family: 'Syne', sans-serif;
      font-size: clamp(3rem, 12vw, 5rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      color: var(--accent);
      line-height: 1;
    }
    .home-tagline {
      font-size: 1.1rem;
      color: var(--muted);
      font-weight: 400;
      letter-spacing: 0.02em;
    }
    .home-user-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      max-width: 400px;
    }
    .home-user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 1.1rem;
      color: #fff;
      flex-shrink: 0;
    }
    .home-user-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .home-user-name { font-weight: 600; font-size: 0.95rem; }
    .home-user-sub { font-size: 0.8rem; color: var(--muted); }
    .home-cta { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 400px; }
    .home-daily-streak {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(249,115,22,0.12);
      color: var(--streak);
      border-radius: 100px;
      padding: 6px 16px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .home-nav {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      border-top: 1px solid var(--border);
      flex-wrap: wrap;
    }

    /* ═══════════════════════════════════════════
       GAME SCREEN
    ═══════════════════════════════════════════ */
    .game-screen { display: flex; flex-direction: column; }
    .game-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }
    .game-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .game-stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 500; }
    .game-stat-value { font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 800; }
    .streak-value { color: var(--streak); }
    .xp-value { color: var(--accent); }

    .timer-bar {
      height: 3px;
      background: var(--border);
      overflow: hidden;
    }
    .timer-fill {
      height: 100%;
      background: var(--accent);
      transition: width 900ms linear, background 300ms;
    }
    .timer-fill.danger { background: var(--error); }

    .game-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 32px;
    }
    .game-difficulty-badge {
      padding: 4px 14px;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .diff-easy { background: rgba(34,197,94,0.12); color: var(--success); }
    .diff-medium { background: rgba(249,115,22,0.12); color: var(--streak); }
    .diff-hard { background: rgba(239,68,68,0.12); color: var(--error); }

    .problem-display {
      font-family: 'Syne', sans-serif;
      font-size: clamp(3.2rem, 12vw, 6.5rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
      text-align: center;
      transition: opacity 200ms;
    }
    .problem-display .op { color: var(--accent); }

    .answer-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      width: 100%;
      max-width: 320px;
    }
    .answer-input {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 3px solid var(--border);
      color: var(--text);
      font-family: 'Syne', sans-serif;
      font-size: 2.5rem;
      font-weight: 700;
      text-align: center;
      outline: none;
      padding: 8px 0;
      transition: border-color var(--transition);
    }
    .answer-input:focus { border-bottom-color: var(--accent); }
    .answer-input.correct { border-bottom-color: var(--success) !important; }
    .answer-input.wrong { border-bottom-color: var(--error) !important; }

    .game-feedback-flash {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 100;
      animation: flash 600ms ease both;
    }
    .game-feedback-flash.correct { background: rgba(34,197,94,0.1); }
    .game-feedback-flash.wrong { background: rgba(239,68,68,0.1); }
    @keyframes flash {
      0% { opacity: 0; }
      20% { opacity: 1; }
      100% { opacity: 0; }
    }

    .game-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .guest-counter {
      font-size: 0.8rem;
      color: var(--muted);
      font-weight: 500;
    }
    .guest-counter span { color: var(--accent); font-weight: 700; }

    /* ═══════════════════════════════════════════
       RESULT SCREEN
    ═══════════════════════════════════════════ */
    .result-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 40px 20px;
      gap: 32px;
    }
    .result-header { text-align: center; }
    .result-emoji { font-size: 3rem; margin-bottom: 12px; }
    .result-title {
      font-family: 'Syne', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .result-sub { color: var(--muted); margin-top: 4px; }
    .result-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 400px; }
    .result-stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 16px;
      text-align: center;
    }
    .result-stat-value {
      font-family: 'Syne', sans-serif;
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--accent);
    }
    .result-stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
    .result-actions { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 400px; }
    .result-guest-prompt {
      text-align: center;
      padding: 16px;
      background: var(--accent-soft);
      border-radius: var(--radius);
      border: 1px solid var(--accent);
    }
    .result-guest-prompt p { font-size: 0.9rem; color: var(--accent); margin-bottom: 10px; }

    /* ═══════════════════════════════════════════
       LOGIN SCREEN
    ═══════════════════════════════════════════ */
    .login-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 40px 20px;
      gap: 24px;
    }
    .login-card { width: 100%; max-width: 420px; }
    .login-header { text-align: center; margin-bottom: 28px; }
    .login-logo {
      font-family: 'Syne', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .login-title { font-weight: 600; font-size: 1.1rem; }
    .login-sub { color: var(--muted); font-size: 0.875rem; margin-top: 4px; }
    .login-gate-msg {
      background: rgba(249,115,22,0.1);
      border: 1px solid var(--streak);
      color: var(--streak);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      font-size: 0.875rem;
      text-align: center;
      margin-bottom: 16px;
    }
    .login-form { display: flex; flex-direction: column; gap: 14px; }
    .login-error {
      color: var(--error);
      font-size: 0.85rem;
      text-align: center;
      padding: 10px;
      background: rgba(239,68,68,0.08);
      border-radius: var(--radius-sm);
    }
    .login-footer { text-align: center; margin-top: 8px; }
    .login-footer button {
      background: none;
      border: none;
      color: var(--accent);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: underline;
    }

    /* ═══════════════════════════════════════════
       LEADERBOARD SCREEN
    ═══════════════════════════════════════════ */
    .leaderboard-screen {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    .leaderboard-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
    }
    .leaderboard-title {
      font-family: 'Syne', sans-serif;
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .leaderboard-body { flex: 1; overflow-y: auto; }
    .leaderboard-table { width: 100%; }
    .leaderboard-row {
      display: grid;
      grid-template-columns: 40px 44px 1fr auto auto auto;
      align-items: center;
      gap: 10px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      transition: background var(--transition);
    }
    .leaderboard-row:hover { background: var(--surface); }
    .leaderboard-row.me { background: var(--accent-soft); border-left: 3px solid var(--accent); }
    .leaderboard-rank {
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 0.95rem;
      text-align: center;
    }
    .rank-1 { color: #f59e0b; font-size: 1.2rem; }
    .rank-2 { color: #94a3b8; font-size: 1.1rem; }
    .rank-3 { color: #cd7c2f; font-size: 1.1rem; }
    .leaderboard-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      color: #fff;
      font-size: 1rem;
      flex-shrink: 0;
    }
    .leaderboard-name { font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .leaderboard-level { font-size: 0.75rem; color: var(--muted); }
    .leaderboard-xp { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.9rem; color: var(--accent); }
    .leaderboard-acc { font-size: 0.8rem; color: var(--muted); }
    .leaderboard-streak { font-size: 0.8rem; color: var(--streak); }
    .skeleton-row { height: 64px; margin: 8px 16px; border-radius: var(--radius-sm); }
    .leaderboard-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--muted);
      gap: 12px;
    }
    .leaderboard-empty .icon { font-size: 2.5rem; }

    /* ═══════════════════════════════════════════
       PROFILE SCREEN
    ═══════════════════════════════════════════ */
    .profile-screen { display: flex; flex-direction: column; min-height: 100dvh; }
    .profile-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .profile-hero {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .profile-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 1.6rem;
      color: #fff;
      flex-shrink: 0;
    }
    .profile-info { flex: 1; overflow: hidden; }
    .profile-name { font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 800; }
    .profile-email { font-size: 0.85rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .profile-level-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .level-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      background: var(--accent-soft);
      color: var(--accent);
      border-radius: 100px;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .section-title {
      font-family: 'Syne', sans-serif;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .xp-section { display: flex; flex-direction: column; gap: 8px; }
    .xp-row { display: flex; justify-content: space-between; align-items: baseline; }
    .xp-label { font-size: 0.85rem; color: var(--muted); }
    .xp-value-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.9rem; color: var(--accent); }
    .badges-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge-item {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      font-size: 0.85rem;
    }
    .badge-emoji { font-size: 1.2rem; }
    .profile-daily-streak {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: rgba(249,115,22,0.08);
      border: 1px solid rgba(249,115,22,0.2);
      border-radius: var(--radius);
    }
    .flame { font-size: 1.5rem; }
    .daily-streak-info { display: flex; flex-direction: column; gap: 2px; }
    .daily-streak-label { font-size: 0.8rem; color: var(--streak); font-weight: 500; }
    .daily-streak-count { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.3rem; color: var(--streak); }
    .premium-card {
      border: 1.5px dashed var(--border);
      border-radius: var(--radius);
      padding: 20px;
      text-align: center;
      opacity: 0.6;
    }
    .premium-card h3 { font-family: 'Syne', sans-serif; font-weight: 700; margin-bottom: 6px; }
    .premium-card p { font-size: 0.875rem; color: var(--muted); margin-bottom: 14px; }

    /* ─── Responsive ──────────────────────────── */
    @media (max-width: 420px) {
      .leaderboard-row {
        grid-template-columns: 32px 36px 1fr auto;
      }
      .leaderboard-acc,
      .leaderboard-streak { display: none; }
      .result-stats { grid-template-columns: 1fr 1fr; }
    }
  `],
  template: `
    <!-- Global feedback flash -->
    @if (svc.feedback()) {
      <div class="game-feedback-flash" [class.correct]="svc.feedback() === 'correct'" [class.wrong]="svc.feedback() === 'wrong'"></div>
    }

    <!-- ═══════════════════════════════════════
         HOME SCREEN
    ═══════════════════════════════════════ -->
    @if (svc.currentScreen() === 'home') {
      <div class="screen home-screen">

        <div class="topbar">
          <span class="topbar-logo">Mathozz</span>
          <div class="topbar-actions">
            @if (svc.isGuest()) {
              <button class="btn btn-ghost btn-sm" (click)="svc.currentScreen.set('login')">Sign In</button>
            }
            <button class="btn btn-ghost btn-icon" (click)="svc.toggleDarkMode()" [title]="svc.isDarkMode() ? 'Light mode' : 'Dark mode'">
              {{ svc.isDarkMode() ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>

        <div class="home-hero">
          <div>
            <div class="home-logo">Mathozz</div>
            <div class="home-tagline">Think fast. Go further.</div>
          </div>

          @if (!svc.isGuest()) {
            <div class="home-user-card">
              <div class="home-user-avatar">{{ avatarLetter() }}</div>
              <div class="home-user-info">
                <div class="home-user-name">{{ svc.user()?.displayName }}</div>
                <div class="home-user-sub">Level {{ svc.user()?.level }} · {{ svc.user()?.xp }} XP</div>
              </div>
              @if ((svc.user()?.dailyStreak ?? 0) > 0) {
                <div class="home-daily-streak">🔥 {{ svc.user()?.dailyStreak }} day streak</div>
              }
            </div>
          } @else {
            <div class="home-user-card">
              <div class="home-user-avatar" style="background: var(--muted)">👤</div>
              <div class="home-user-info">
                <div class="home-user-name">Playing as Guest</div>
                <div class="home-user-sub">{{ svc.guestSolvedCount() }} / 50 free problems</div>
              </div>
            </div>
          }

          <div class="home-cta">
            <button class="btn btn-primary btn-full" (click)="svc.startGame()">
              🚀 Start Game
            </button>
            <button class="btn btn-outline btn-full" (click)="goToLeaderboard()">
              🏆 Leaderboard
            </button>
          </div>
        </div>

        <div class="home-nav">
          @if (!svc.isGuest()) {
            <button class="btn btn-ghost btn-sm" (click)="svc.currentScreen.set('profile')">👤 Profile</button>
          } @else {
            <button class="btn btn-ghost btn-sm" (click)="svc.currentScreen.set('login')">🔐 Create Account</button>
          }
          <button class="btn btn-ghost btn-sm" (click)="svc.toggleDarkMode()">
            {{ svc.isDarkMode() ? '☀️ Light' : '🌙 Dark' }}
          </button>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════
         GAME SCREEN
    ═══════════════════════════════════════ -->
    @if (svc.currentScreen() === 'game') {
      <div class="screen game-screen">

        <div class="game-topbar">
          <button class="btn btn-ghost btn-sm" (click)="svc.endGame()">← End</button>

          <div class="game-stat">
            <span class="game-stat-label">Streak</span>
            <span class="game-stat-value streak-value">{{ svc.streak() }}</span>
          </div>
          <div class="game-stat">
            <span class="game-stat-label">Score</span>
            <span class="game-stat-value">{{ svc.score() }}</span>
          </div>
          <div class="game-stat">
            <span class="game-stat-label">XP</span>
            <span class="game-stat-value xp-value">{{ svc.xp() }}</span>
          </div>
          @if (svc.timerEnabled()) {
            <div class="game-stat">
              <span class="game-stat-label">Time</span>
              <span class="game-stat-value" [style.color]="svc.timeLeft() <= 5 ? 'var(--error)' : 'var(--text)'">{{ svc.timeLeft() }}</span>
            </div>
          }

          <button class="btn btn-ghost btn-sm" (click)="svc.toggleTimer()" [title]="svc.timerEnabled() ? 'Disable timer' : 'Enable timer'">
            {{ svc.timerEnabled() ? '⏱️' : '⏸️' }}
          </button>
        </div>

        @if (svc.timerEnabled()) {
          <div class="timer-bar">
            <div class="timer-fill"
              [class.danger]="svc.timeLeft() <= 5"
              [style.width.%]="(svc.timeLeft() / 15) * 100">
            </div>
          </div>
        }

        <div class="game-main">
          <div class="game-difficulty-badge" [class]="'diff-' + svc.difficulty()">
            {{ svc.difficulty() }}
          </div>

          @if (svc.currentProblem()) {
            <div class="problem-display">
              {{ svc.currentProblem()!.num1 }}
              <span class="op">{{ svc.currentProblem()!.operator }}</span>
              {{ svc.currentProblem()!.num2 }} = ?
            </div>
          }

          <div class="answer-section">
            <input
              #answerInput
              class="answer-input"
              [class.correct]="svc.feedback() === 'correct'"
              [class.wrong]="svc.feedback() === 'wrong'"
              type="number"
              inputmode="numeric"
              placeholder="?"
              [(ngModel)]="answerValue"
              (keydown.enter)="onSubmit()"
              autocomplete="off"
              autocorrect="off"
            />
            <button class="btn btn-primary btn-full" (click)="onSubmit()" [disabled]="!answerValue && answerValue !== 0">
              Submit →
            </button>
          </div>
        </div>

        <div class="game-footer">
          @if (svc.isGuest()) {
            <div class="guest-counter">
              Free problems: <span>{{ svc.guestSolvedCount() }}</span> / 50
            </div>
          } @else {
            <div class="guest-counter">Keep going! 💪</div>
          }
          <button class="btn btn-ghost btn-sm" (click)="svc.endGame()">Quit</button>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════
         RESULT SCREEN
    ═══════════════════════════════════════ -->
    @if (svc.currentScreen() === 'result') {
      <div class="screen result-screen">
        <div class="result-header">
          <div class="result-emoji">{{ resultEmoji() }}</div>
          <div class="result-title">Session Complete!</div>
          <div class="result-sub">{{ resultMessage() }}</div>
        </div>

        <div class="result-stats">
          <div class="result-stat">
            <div class="result-stat-value">{{ svc.score() }}</div>
            <div class="result-stat-label">Correct</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">{{ svc.sessionXP() }}</div>
            <div class="result-stat-label">XP Earned</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">{{ svc.sessionBestStreak() }}</div>
            <div class="result-stat-label">Best Streak</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">{{ svc.sessionAccuracy() }}%</div>
            <div class="result-stat-label">Accuracy</div>
          </div>
        </div>

        @if (svc.isGuest()) {
          <div class="result-guest-prompt">
            <p>💾 Create a free account to save your progress and appear on the leaderboard!</p>
            <button class="btn btn-primary" (click)="svc.currentScreen.set('login')">Create Account</button>
          </div>
        }

        <div class="result-actions">
          <button class="btn btn-primary btn-full" (click)="svc.startGame()">🔄 Play Again</button>
          <button class="btn btn-outline btn-full" (click)="goToLeaderboard()">🏆 View Leaderboard</button>
          <button class="btn btn-ghost btn-full" (click)="svc.currentScreen.set('home')">🏠 Home</button>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════
         LOGIN SCREEN
    ═══════════════════════════════════════ -->
    @if (svc.currentScreen() === 'login') {
      <div class="screen login-screen">
        <div class="card login-card">

          <div class="login-header">
            <div class="login-logo">Mathozz</div>
            <div class="login-title">{{ loginTab() === 'login' ? 'Welcome back!' : 'Join Mathozz' }}</div>
            <div class="login-sub">{{ loginTab() === 'login' ? 'Sign in to continue.' : 'Create your free account.' }}</div>
          </div>

          @if (svc.guestGateTriggered()) {
            <div class="login-gate-msg">
              🎉 You've solved 50 problems! Log in to keep going and save your progress.
            </div>
          }

          <div class="tabs" style="margin-bottom: 20px;">
            <button class="tab" [class.active]="loginTab() === 'login'" (click)="loginTab.set('login')">Sign In</button>
            <button class="tab" [class.active]="loginTab() === 'signup'" (click)="loginTab.set('signup')">Sign Up</button>
          </div>

          <div class="login-form">
            <button class="btn btn-google btn-full" (click)="svc.loginWithGoogle()" [disabled]="svc.isLoading()">
              <svg width="18" height="18" viewBox="0 0 48 48" style="flex-shrink:0"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.16C6.51 42.62 14.62 48 24 48z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.16C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.16C12.43 13.72 17.74 9.5 24 9.5z"/></svg>
              Continue with Google
            </button>

            <div class="divider">or</div>

            @if (loginTab() === 'signup') {
              <div class="form-group">
                <label class="form-label">Display Name</label>
                <input class="form-input" type="text" placeholder="Your name" [(ngModel)]="signupName" autocomplete="name" />
              </div>
            }

            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" placeholder="you@example.com" [(ngModel)]="loginEmail" autocomplete="email" />
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input class="form-input" type="password" placeholder="••••••••" [(ngModel)]="loginPassword" autocomplete="current-password" (keydown.enter)="onAuthSubmit()" />
            </div>

            @if (svc.authError()) {
              <div class="login-error">{{ svc.authError() }}</div>
            }

            <button class="btn btn-primary btn-full" (click)="onAuthSubmit()" [disabled]="svc.isLoading()">
              @if (svc.isLoading()) { ⏳ Please wait… }
              @else { {{ loginTab() === 'login' ? 'Sign In' : 'Create Account' }} }
            </button>
          </div>

          <div class="login-footer">
            <button (click)="svc.currentScreen.set('home')">Continue as Guest →</button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════
         LEADERBOARD SCREEN
    ═══════════════════════════════════════ -->
    @if (svc.currentScreen() === 'leaderboard') {
      <div class="screen leaderboard-screen">

        <div class="topbar">
          <button class="btn btn-ghost btn-sm" (click)="svc.currentScreen.set('home')">← Back</button>
          <span class="topbar-logo" style="font-size:1.1rem;">🏆 Leaderboard</span>
          <div style="width:60px;"></div>
        </div>

        <div class="leaderboard-header">
          <div class="tabs">
            <button class="tab" [class.active]="svc.selectedLeaderboardScope() === 'global'" (click)="switchScope('global')">🌍 Global</button>
            <button class="tab" [class.active]="svc.selectedLeaderboardScope() === 'country'" (click)="switchScope('country')">🌐 Country</button>
            <button class="tab" [class.active]="svc.selectedLeaderboardScope() === 'city'" (click)="switchScope('city')">📍 City</button>
          </div>
        </div>

        <div class="leaderboard-body">
          @if (svc.leaderboardLoading()) {
            @for (_ of skeletonRows; track $index) {
              <div class="skeleton skeleton-row"></div>
            }
          } @else if (svc.leaderboard().length === 0) {
            <div class="leaderboard-empty">
              <div class="icon">🏜️</div>
              <div>No players found yet.</div>
              <div style="font-size:0.85rem;color:var(--muted)">Be the first to claim the top spot!</div>
            </div>
          } @else {
            <div class="leaderboard-table">
              @for (entry of svc.leaderboard(); track entry.uid; let i = $index) {
                <div class="leaderboard-row" [class.me]="entry.uid === svc.user()?.uid">
                  <div class="leaderboard-rank" [class.rank-1]="i===0" [class.rank-2]="i===1" [class.rank-3]="i===2">
                    {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1) }}
                  </div>
                  <div class="leaderboard-avatar" [style.background]="avatarColor(entry.displayName)">
                    {{ entry.displayName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="leaderboard-name">{{ entry.displayName }}</div>
                    <div class="leaderboard-level">Lv {{ entry.level }}</div>
                  </div>
                  <div class="leaderboard-xp">{{ entry.xp }} XP</div>
                  <div class="leaderboard-acc">{{ entry.accuracy }}%</div>
                  <div class="leaderboard-streak">🔥{{ entry.bestStreak }}</div>
                </div>
              }
            </div>
          }
        </div>

      </div>
    }

    <!-- ═══════════════════════════════════════
         PROFILE SCREEN
    ═══════════════════════════════════════ -->
    @if (svc.currentScreen() === 'profile') {
      <div class="screen profile-screen">
        <div class="topbar">
          <button class="btn btn-ghost btn-sm" (click)="svc.currentScreen.set('home')">← Back</button>
          <span class="topbar-logo" style="font-size:1.1rem;">👤 Profile</span>
          <div style="width:60px;"></div>
        </div>

        @if (svc.user(); as u) {
          <div class="profile-body">

            <!-- Hero -->
            <div class="profile-hero">
              <div class="profile-avatar" [style.background]="avatarColor(u.displayName)">
                {{ u.displayName.charAt(0).toUpperCase() }}
              </div>
              <div class="profile-info">
                <div class="profile-name">{{ u.displayName }}</div>
                <div class="profile-email">{{ u.email }}</div>
                <div class="profile-level-row">
                  <span class="level-badge">Level {{ u.level }}</span>
                  @if (u.isPremium) {
                    <span class="badge-chip">✨ Premium</span>
                  }
                </div>
              </div>
            </div>

            <!-- Daily Streak -->
            @if (u.dailyStreak > 0) {
              <div class="profile-daily-streak">
                <div class="flame">🔥</div>
                <div class="daily-streak-info">
                  <div class="daily-streak-label">Daily Streak</div>
                  <div class="daily-streak-count">{{ u.dailyStreak }} days</div>
                </div>
              </div>
            }

            <!-- XP Progress -->
            <div>
              <div class="section-title">XP Progress</div>
              <div class="xp-section">
                <div class="xp-row">
                  <span class="xp-label">Level {{ u.level }}</span>
                  <span class="xp-value-text">{{ u.xp % 100 }} / 100 XP</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="u.xp % 100"></div>
                </div>
                <div class="xp-label" style="font-size:0.78rem;">
                  {{ 100 - (u.xp % 100) }} XP to Level {{ u.level + 1 }}
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div>
              <div class="section-title">Statistics</div>
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-label">Total Solved</div>
                  <div class="stat-value">{{ u.totalSolved }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Accuracy</div>
                  <div class="stat-value">{{ u.accuracy }}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Best Streak</div>
                  <div class="stat-value">{{ u.bestStreak }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Avg Speed</div>
                  <div class="stat-value">{{ u.averageResponseMs > 0 ? (u.averageResponseMs / 1000).toFixed(1) + 's' : '–' }}</div>
                </div>
              </div>
            </div>

            <!-- Badges -->
            <div>
              <div class="section-title">Badges</div>
              @if (u.badges.length > 0) {
                <div class="badges-grid">
                  @for (badge of u.badges; track badge) {
                    <div class="badge-item">
                      <span class="badge-emoji">{{ badgeEmoji(badge) }}</span>
                      <span>{{ badgeName(badge) }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div style="color:var(--muted);font-size:0.875rem;">Play games to earn badges!</div>
              }
            </div>

            <!-- Settings -->
            <div>
              <div class="section-title">Settings</div>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="btn btn-outline btn-full" (click)="svc.toggleDarkMode()">
                  {{ svc.isDarkMode() ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode' }}
                </button>
              </div>
            </div>

            <!-- Premium card (placeholder) -->
            <div class="premium-card">
              <h3>✨ Upgrade to Premium</h3>
              <p>Unlock advanced analytics, custom themes, and more — coming soon!</p>
              <button class="btn btn-outline" disabled>Coming Soon</button>
            </div>

            <button class="btn btn-danger btn-full" (click)="svc.logout()">Sign Out</button>

          </div>
        } @else {
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px;">
            <p>You're not signed in.</p>
            <button class="btn btn-primary" (click)="svc.currentScreen.set('login')">Sign In</button>
          </div>
        }
      </div>
    }
  `
})
export class AppComponent {
  readonly svc = inject(AppService);

  /** Current answer typed by user */
  answerValue: number | null = null;

  /** Active login/signup tab */
  loginTab = signal<'login' | 'signup'>('login');

  /** Login form fields */
  loginEmail = '';
  loginPassword = '';
  signupName = '';

  /** Dummy array for skeleton rows */
  readonly skeletonRows = Array(6).fill(0);

  /** Reference to the answer input for auto-focus */
  @ViewChild('answerInput') answerInputRef?: ElementRef<HTMLInputElement>;

  constructor() {
    // Auto-focus input when screen becomes 'game'
    effect(() => {
      const screen = this.svc.currentScreen();
      if (screen === 'game') {
        afterNextRender(() => {
          this.answerInputRef?.nativeElement.focus();
        });
      }
    });

    // Re-focus after each new problem
    effect(() => {
      this.svc.currentProblem(); // track
      if (this.svc.currentScreen() === 'game') {
        setTimeout(() => this.answerInputRef?.nativeElement?.focus(), 50);
      }
      this.answerValue = null;
    });
  }

  /** Submit the current answer */
  async onSubmit(): Promise<void> {
    if (this.answerValue === null) return;
    const val = Number(this.answerValue);
    this.answerValue = null;
    await this.svc.submitAnswer(val);
  }

  /** Handle auth form submission (login or signup) */
  async onAuthSubmit(): Promise<void> {
    if (this.loginTab() === 'login') {
      await this.svc.loginWithEmail(this.loginEmail, this.loginPassword);
    } else {
      await this.svc.signupWithEmail(this.loginEmail, this.loginPassword, this.signupName);
    }
  }

  /** Navigate to leaderboard and fetch data */
  async goToLeaderboard(): Promise<void> {
    await this.svc.goToLeaderboard();
  }

  /** Switch leaderboard scope */
  async switchScope(scope: LeaderboardScope): Promise<void> {
    await this.svc.switchLeaderboardScope(scope);
  }

  /** Handle global keyboard shortcuts */
  async onGlobalKeydown(event: KeyboardEvent): Promise<void> {
    if (event.key === 'Escape' && this.svc.currentScreen() !== 'home') {
      this.svc.currentScreen.set('home');
    }
  }

  /** Compute first letter for avatar */
  avatarLetter = computed(() => {
    const name = this.svc.user()?.displayName ?? 'G';
    return name.charAt(0).toUpperCase();
  });

  /** Return result screen emoji based on score */
  resultEmoji(): string {
    const s = this.svc.score();
    if (s >= 20) return '🏆';
    if (s >= 10) return '🔥';
    if (s >= 5) return '⭐';
    return '💪';
  }

  /** Return motivational result message */
  resultMessage(): string {
    const acc = this.svc.sessionAccuracy();
    if (acc === 100) return 'Perfect score! Unbelievable!';
    if (acc >= 80) return 'Amazing accuracy! Keep it up!';
    if (acc >= 60) return 'Solid round! Practice makes perfect.';
    return 'Good effort! Try again to improve!';
  }

  /** Generate a deterministic avatar background color from a name */
  avatarColor(name: string): string {
    const colors = ['#6c47ff', '#22c55e', '#f97316', '#ef4444', '#0ea5e9', '#ec4899', '#8b5cf6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /** Get emoji for a badge ID */
  badgeEmoji(badge: string): string {
    const map: Record<string, string> = {
      first_blood: '🩸',
      streak_10: '🔥',
      streak_25: '⚡',
      speed_demon: '⚡',
      century: '💯',
    };
    return map[badge] ?? '🏅';
  }

  /** Get human-readable badge name */
  badgeName(badge: string): string {
    const map: Record<string, string> = {
      first_blood: 'First Blood',
      streak_10: 'Streak 10',
      streak_25: 'Streak 25',
      speed_demon: 'Speed Demon',
      century: 'Century',
    };
    return map[badge] ?? badge;
  }
}