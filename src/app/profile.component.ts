import {
  Component, inject, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from './app.service';

@Component({
  selector: 'app-profile',
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
          <button class="ni" (click)="go('/dashboard')"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
          <button class="ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Play</span></button>
          <div class="sb-div"></div>
          <button class="ni active"><i class="fa-solid fa-user"></i><span>Profile</span></button>
        </nav>
        <div class="sb-foot">
          <button class="ni" (click)="svc.toggleDarkMode()">
            <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
            <span>{{ svc.isDarkMode() ? 'Light mode' : 'Dark mode' }}</span>
          </button>
          <button class="ni logout" (click)="showLogoutConfirm.set(true)">
            <i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="tb-logo" (click)="go('/dashboard')">Mathozz</div>
          <button class="btn btn-ghost btn-sm" (click)="openFeedback.set(true)">
            <i class="fa-regular fa-comment-dots"></i> Feedback
          </button>
        </div>

        @if (!svc.authReady()) {
          <div class="profile-content">
            <div class="stats-loading" role="status" aria-live="polite">
              <span class="spinner" aria-hidden="true"></span>
              <span>Loading profile…</span>
            </div>
          </div>
        } @else if (svc.user(); as u) {
          <div class="profile-content">
            <div class="profile-hero">
              @if (u.photoURL) {
                <img class="pav pav-photo" [src]="u.photoURL" [alt]="u.displayName"/>
              } @else {
                <div class="pav" [style.background]="avatarColor(u.displayName)">
                  {{ u.displayName.charAt(0).toUpperCase() }}
                </div>
              }
              <div style="flex:1;min-width:0;">
                <div class="pm-name">{{ u.displayName }}</div>
                <div class="pm-email">{{ u.email }}</div>
                <div class="pm-chips">
                  @if (u.isPremium) { <span class="chip chip-green">Premium</span> }
                </div>
              </div>
            </div>

 

            @if (u.badges.length > 0) {
              <div>
                <div class="section-hd">Badges</div>
                <div class="badges-row">
                  @for (b of u.badges; track b) {
                    <div class="badge-pill">{{ badgeEmoji(b) }} {{ badgeName(b) }}</div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Guest trying to access profile -->
          <div class="profile-content">
            <div class="hero-card">
              <div class="hero-eyebrow">Not signed in</div>
              <div class="hero-title">Create an account</div>
              <div class="hero-sub">Sign up to save your stats, badges, and streaks.</div>
              <div class="hero-btns">
                <button class="btn btn-primary btn-lg" (click)="go('/login')">
                  <i class="fa-solid fa-right-to-bracket"></i> Sign In / Sign Up
                </button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>

    <nav class="mobile-nav">
      <div class="mob-nav-inner">
        <button class="mob-ni" (click)="go('/dashboard')"><i class="fa-solid fa-house"></i><span>Home</span></button>
        <button class="mob-ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Play</span></button>
        <button class="mob-ni active"><i class="fa-solid fa-user"></i><span>Profile</span></button>
        @if (!svc.isGuest()) {
          <button class="mob-ni mob-logout" (click)="showLogoutConfirm.set(true)"><i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span></button>
        }
        <button class="mob-ni" (click)="svc.toggleDarkMode()">
          <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
          <span>{{ svc.isDarkMode() ? 'Light' : 'Dark' }}</span>
        </button>
      </div>
    </nav>

    <!-- Logout confirm -->
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

    <!-- Feedback modal (self-contained) -->
    @if (openFeedback()) {
      <div class="feedback-modal-overlay" (click)="openFeedback.set(false)">
        <div class="feedback-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-title">Submit Feedback</div>
          <div class="sheet-sub">Help us improve. Contact details are optional.</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Mobile <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
              <input class="form-input" type="tel" placeholder="+91 98765 43210" [(value)]="feedbackPhone" (input)="feedbackPhone = $any($event.target).value"/>
            </div>
            <div class="form-group">
              <label class="form-label">Email <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
              <input class="form-input" type="email" placeholder="you@example.com" [(value)]="feedbackEmail" (input)="feedbackEmail = $any($event.target).value"/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Feedback <span style="color:var(--wrong);font-weight:400;">*</span></label>
            <textarea class="form-textarea" rows="4" maxlength="600"
              placeholder="Tell us what you love, what's broken, or what you'd like to see..."
              (input)="feedbackText = $any($event.target).value">{{ feedbackText }}</textarea>
            <span class="form-hint">{{ feedbackText.length }}/600</span>
          </div>
          <div class="sheet-btns">
            <button class="btn btn-outline btn-lg" style="flex:1" (click)="openFeedback.set(false)">Cancel</button>
            <button class="btn btn-primary btn-lg" style="flex:1" (click)="submitFeedback()" [disabled]="!feedbackText.trim() || isSending()">
              @if (isSending()) { <i class="fa-solid fa-spinner fa-spin"></i> Sending… }
              @else { <i class="fa-solid fa-paper-plane"></i> Send }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProfileComponent {
  readonly svc   = inject(AppService);
  private router = inject(Router);

  showLogoutConfirm = signal(false);
  openFeedback      = signal(false);
  isSending         = signal(false);

  feedbackText  = '';
  feedbackEmail = '';
  feedbackPhone = '';

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

  async confirmLogout(): Promise<void> {
    this.showLogoutConfirm.set(false);
    await this.svc.logout();
    this.router.navigate(['/dashboard']);
  }

  async submitFeedback(): Promise<void> {
    if (!this.feedbackText.trim()) return;
    this.isSending.set(true);
    try {
      await this.svc.submitFeedback({ text: this.feedbackText.trim(), email: this.feedbackEmail.trim(), phone: this.feedbackPhone.trim() });
      this.openFeedback.set(false);
      this.feedbackText = '';
    } catch { /* silent */ }
    finally { this.isSending.set(false); }
  }

  avatarColor(name: string): string {
    const colors = ['#3a6e1a','#1b5c3a','#1d4a70','#5a2e00','#1a3a6e','#3a1a6e','#6e1a1a'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  }

  badgeEmoji(b: string): string {
    return ({first_blood:'⚡',streak_10:'🔥',streak_25:'💥',speed_demon:'🚀',century:'💯'} as Record<string,string>)[b] ?? '🏅';
  }

  badgeName(b: string): string {
    return ({first_blood:'First Blood',streak_10:'Streak ×10',streak_25:'Streak ×25',speed_demon:'Speed Demon',century:'Century'} as Record<string,string>)[b] ?? b;
  }
}