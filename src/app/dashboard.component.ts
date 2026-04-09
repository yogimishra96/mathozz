import {
  Component, inject, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from './app.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen shell">
      <aside class="sidebar">
        <div class="sb-top">
          <div class="sb-brand" (click)="go('/dashboard')">Mathozz</div>
          <div class="sb-tagline">Think fast.</div>
        </div>
        <nav class="sb-nav">
          <button class="ni active"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
          <button class="ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Solve</span></button>
          <div class="sb-div"></div>
          @if (!svc.isGuest()) {
            <button class="ni" (click)="go('/profile')"><i class="fa-solid fa-user"></i><span>Profile</span></button>
          } @else {
            <button class="ni" (click)="go('/login')"><i class="fa-solid fa-right-to-bracket"></i><span>Sign In</span></button>
          }
        </nav>
        <div class="sb-foot">
          <button class="ni" (click)="svc.toggleDarkMode()">
            <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
            <span>{{ svc.isDarkMode() ? 'Light mode' : 'Dark mode' }}</span>
          </button>
          @if (!svc.isGuest()) {
            <button class="ni logout" (click)="showLogoutConfirm.set(true)">
              <i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span>
            </button>
          }
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="tb-logo" (click)="go('/dashboard')">Mathozz</div>
          @if (!svc.isGuest()) {
            <span class="tb-user">{{ svc.user()!.displayName }}</span>
          }
        </div>

        <div class="home-content">
          <div class="hero-card">
            <div class="hero-eyebrow">{{ svc.isGuest() ? 'Guest Mode' : 'Welcome back' }}</div>
            <div class="hero-title">{{ svc.isGuest() ? 'Ready to train?' : 'Keep going.' }}</div>
            <div class="hero-sub">
              @if (svc.isGuest()) { {{ Math.max(0, 50 - svc.guestSolvedCount()) }} free problems remaining }
              @else if (!svc.userStatsReady()) {
                <span class="inline-stat-loader"><span class="spinner-sm" aria-hidden="true"></span> Loading stats…</span>
              }
              @else { {{ svc.user()!.totalSolved }} solved · {{ svc.user()!.accuracy }}% accuracy }
            </div>
            <div class="hero-btns">
              @if (svc.hasSavedGame()) {
                <button class="btn btn-outline btn-lg" (click)="resumeSavedGame()">
                  <i class="fa-solid fa-play"></i> Resume 
                </button>
              }
              <button class="btn btn-primary btn-lg" (click)="startFreshGame()">
                <i class="fa-solid fa-plus"></i> New 
              </button>
            </div>
          </div>

          @if (svc.isGuest()) {
            <div class="guest-banner">
              <div class="gp">
                <div class="gp-lbl">
                  <span>Guest Progress</span>
                  <span>{{ Math.min(svc.guestSolvedCount(), 50) }} / 50</span>
                </div>
                <div class="prog-track">
                  <div class="prog-fill" [style.width.%]="Math.min((svc.guestSolvedCount()/50)*100,100)"></div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" (click)="go('/login')">Sign Up</button>
            </div>
          }

          @if (!svc.isGuest()) {
            <div>
              <div class="section-hd">Your Numbers</div>
              <p class="stat-explain">
                <strong>Best Game:</strong> Most correct in one game.&nbsp;&nbsp;
                <strong>Longest Run:</strong> Longest consecutive correct run.
              </p>
              @if (!svc.userStatsReady()) {
                <div class="stats-loading" role="status" aria-live="polite">
                  <span class="spinner" aria-hidden="true"></span>
                  <span>Loading your stats…</span>
                </div>
              } @else {
                <div class="stats-grid">
                  <div class="sc"><div class="sc-lbl">Total Solved</div><div class="sc-val">{{ svc.user()!.totalSolved }}</div></div>
                  <div class="sc"><div class="sc-lbl">Accuracy</div><div class="sc-val">{{ svc.user()!.accuracy }}%</div></div>
                  <div class="sc"><div class="sc-lbl">Best Game</div><div class="sc-val c-correct">{{ svc.user()!.topSession }}</div></div>
                  <div class="sc"><div class="sc-lbl">Longest Run</div><div class="sc-val c-streak">{{ svc.user()!.bestStreak }}</div></div>
                </div>
              }
            </div>
          }
        </div>
      </main>
    </div>

    <nav class="mobile-nav">
      <div class="mob-nav-inner">
        <button class="mob-ni active"><i class="fa-solid fa-house"></i><span>Home</span></button>
        <button class="mob-ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Play</span></button>
        @if (!svc.isGuest()) {
          <button class="mob-ni" (click)="go('/profile')"><i class="fa-solid fa-user"></i><span>Profile</span></button>
          <button class="mob-ni mob-logout" (click)="showLogoutConfirm.set(true)"><i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span></button>
        } @else {
          <button class="mob-ni" (click)="go('/login')"><i class="fa-solid fa-right-to-bracket"></i><span>Sign In</span></button>
        }
        <button class="mob-ni" (click)="svc.toggleDarkMode()">
          <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
          <span>{{ svc.isDarkMode() ? 'Light' : 'Dark' }}</span>
        </button>
      </div>
    </nav>

    <!-- Logout confirm sheet (self-contained in this component) -->
    @if (showLogoutConfirm()) {
      <div class="logout-overlay" (click)="showLogoutConfirm.set(false)">
        <div class="logout-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-title">Sign out?</div>
          <div class="sheet-sub">You'll need to sign in again to access your stats.</div>
          <div class="sheet-btns">
            <button class="btn btn-danger btn-lg" style="flex:1" (click)="confirmLogout()">
              <i class="fa-solid fa-right-from-bracket"></i> Yes, Sign Out
            </button>
            <button class="btn btn-outline btn-lg" style="flex:1" (click)="showLogoutConfirm.set(false)">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardComponent {
  readonly svc    = inject(AppService);
  private router  = inject(Router);
  readonly Math   = Math;

  showLogoutConfirm = signal(false);

  go(path: string): void {
    if (path === '/login') {
      void this.router.navigate(['/login']);
      return;
    }
    this.router.navigate([path]);
  }

  startFreshGame(): void {
    this.svc.clearSavedGame();
    this.svc.startGame();
    this.router.navigate(['/play']);
  }

  resumeSavedGame(): void {
    this.svc.resumeGame();
    this.router.navigate(['/play']);
  }

  async confirmLogout(): Promise<void> {
    this.showLogoutConfirm.set(false);
    await this.svc.logout();
    this.router.navigate(['/dashboard']);
  }
}