import {
  Component, inject, signal,
  ChangeDetectionStrategy, OnInit, OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

import { AppService } from './app.service';

/**
 * AppComponent is now a thin shell:
 *  - Hosts <router-outlet> for routed pages (dashboard, profile, play, admin)
 *  - Renders the LOGIN screen (not worth a separate component — it's a full-screen
 *    overlay driven by svc.currentScreen signal, same as before)
 *  - Handles the global guest-gate redirect (guestGateTriggered → show login)
 *  - Keyboard Escape on login → go to dashboard
 *
 *  All game, result, home/dashboard, profile screens are now routed components.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, RouterOutlet],
  styleUrl: './app.scss',
  host: { '[class.theme-light]': '!svc.isDarkMode()' },
  template: `
    <!-- ══════════════════════════════════════════
         LOGIN SCREEN  (shown as overlay when currentScreen==='login')
         Rendered here so it overlays any routed page seamlessly.
    ══════════════════════════════════════════ -->
    @if (svc.currentScreen() === 'login') {
      <div class="screen login-shell">
        <div class="login-left">
          <div class="ll-brand">Mathozz</div>
          <div>
            <div class="ll-headline">Train your<br>mental math.</div>
            <div class="ll-sub">Track progress and sharpen your mind every day.</div>
          </div>
          <div class="ll-stats">
            <div><div class="lls-num">∞</div><div class="lls-lbl">Free to Play</div></div>
            <div><div class="lls-num">3</div><div class="lls-lbl">Difficulties</div></div>
          </div>
        </div>
        <div class="login-right">
          <div class="lf-box">
            <div class="lf-mobile-brand">Mathozz</div>
            @if (svc.guestGateTriggered()) {
              <div class="gate-msg">50 free problems used. Sign in to continue.</div>
            }
            <div class="lf-title">{{ loginTab() === 'login' ? 'Welcome back' : 'Create account' }}</div>
            <div class="lf-sub">{{ loginTab() === 'login' ? 'Sign in to continue.' : 'Start your journey.' }}</div>
            <div class="lf-tabs">
              <div class="tabs">
                <button class="tab" [class.active]="loginTab()==='login'" (click)="loginTab.set('login')">Sign In</button>
                <button class="tab" [class.active]="loginTab()==='signup'" (click)="loginTab.set('signup')">Sign Up</button>
              </div>
            </div>
            <div class="lf-fields">
              <button class="btn btn-google btn-full btn-lg" (click)="svc.loginWithGoogle()" [disabled]="svc.isLoading()">
                <svg width="16" height="16" viewBox="0 0 48 48" style="flex-shrink:0;">
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.16C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.16C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.16C12.43 13.72 17.74 9.5 24 9.5z"/>
                </svg>
                Continue with Google
              </button>
              <div class="divider">or</div>
              @if (loginTab() === 'signup') {
                <div class="form-group">
                  <label class="form-label">Name</label>
                  <input class="form-input" type="text" placeholder="Your name" [(ngModel)]="signupName" autocomplete="name"/>
                </div>
              }
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" type="email" placeholder="you@example.com" [(ngModel)]="loginEmail" autocomplete="email"/>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <input class="form-input" type="password" placeholder="••••••••" [(ngModel)]="loginPassword" autocomplete="current-password" (keydown.enter)="onAuthSubmit()"/>
              </div>
              @if (svc.authError()) {
                <div class="login-err"><i class="fa-solid fa-circle-exclamation" style="flex-shrink:0;"></i> {{ svc.authError() }}</div>
              }
              <button class="btn btn-primary btn-full btn-lg" (click)="onAuthSubmit()" [disabled]="svc.isLoading()">
                @if (svc.isLoading()) { <i class="fa-solid fa-spinner fa-spin"></i> Wait… }
                @else { {{ loginTab() === 'login' ? 'Sign In' : 'Create Account' }} <i class="fa-solid fa-arrow-right"></i> }
              </button>
            </div>
            <div class="lf-foot">
              <button (click)="goToDashboard()">Continue as Guest →</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ══ Routed pages live here (dashboard, profile, play, admin) ══ -->
    @if (svc.currentScreen() !== 'login') {
      <router-outlet></router-outlet>
    }
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  readonly svc   = inject(AppService);
  private router = inject(Router);

  loginTab      = signal<'login' | 'signup'>('login');
  loginEmail    = '';
  loginPassword = '';
  signupName    = '';

  private boundKeydown = this.onKeydown.bind(this);

  ngOnInit(): void {
    document.addEventListener('keydown', this.boundKeydown, true);

    // Sync router → currentScreen when navigating to login from router
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        // When guest gate triggers, AppService sets currentScreen='login'.
        // When user logs in, AppService sets currentScreen='home'; we redirect to dashboard.
        if (!e.url.includes('login') && this.svc.currentScreen() === 'login') {
          // router navigated away from login, keep currentScreen in sync
          // (handled by auth callbacks in AppService already)
        }
      });

    // After login success, AppService sets currentScreen to 'home'.
    // We need to redirect to /dashboard in that case.
    // Use a simple effect-like watch via the router.
    // The cleanest approach: override AppService.loginWithGoogle etc. side-effects
    // by watching currentScreen changes — done below via interval-free approach.
    // Instead, we patch the three auth methods to navigate after login.
    this._patchAuthNavigation();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.boundKeydown, true);
  }

  /**
   * Patch AppService auth methods so that after a successful login
   * we navigate to /dashboard instead of relying on currentScreen='home'.
   *
   * We do this ONCE in ngOnInit so existing AppService logic stays intact.
   */
  private _patchAuthNavigation(): void {
    const svc    = this.svc;
    const router = this.router;

    const origGoogle = svc.loginWithGoogle.bind(svc);
    svc.loginWithGoogle = async () => {
      await origGoogle();
      if (!svc.authError()) { svc.currentScreen.set('home'); router.navigate(['/dashboard']); }
    };

    const origEmail = svc.loginWithEmail.bind(svc);
    svc.loginWithEmail = async (email: string, pw: string) => {
      await origEmail(email, pw);
      if (!svc.authError()) { svc.currentScreen.set('home'); router.navigate(['/dashboard']); }
    };

    const origSignup = svc.signupWithEmail.bind(svc);
    svc.signupWithEmail = async (email: string, pw: string, name: string) => {
      await origSignup(email, pw, name);
      if (!svc.authError()) { svc.currentScreen.set('home'); router.navigate(['/dashboard']); }
    };
  }

  goToDashboard(): void {
    this.svc.currentScreen.set('home');
    this.router.navigate(['/dashboard']);
  }

  onKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape' && this.svc.currentScreen() === 'login') {
      this.goToDashboard();
    }
  }

  async onAuthSubmit(): Promise<void> {
    if (this.loginTab() === 'login') {
      await this.svc.loginWithEmail(this.loginEmail, this.loginPassword);
    } else {
      await this.svc.signupWithEmail(this.loginEmail, this.loginPassword, this.signupName);
    }
  }
}