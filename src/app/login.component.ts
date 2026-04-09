import {
  Component, inject, signal,
  ChangeDetectionStrategy, OnInit, OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AppService } from './app.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
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
              <button type="button" class="tab" [class.active]="loginTab()==='login'" (click)="loginTab.set('login')">Sign In</button>
              <button type="button" class="tab" [class.active]="loginTab()==='signup'" (click)="loginTab.set('signup')">Sign Up</button>
            </div>
          </div>
          <div class="lf-fields">
            <button type="button" class="btn btn-google btn-full btn-lg" (click)="svc.loginWithGoogle()" [disabled]="svc.isLoading()">
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
            <button type="button" class="btn btn-primary btn-full btn-lg" (click)="onAuthSubmit()" [disabled]="svc.isLoading()">
              @if (svc.isLoading()) { <i class="fa-solid fa-spinner fa-spin"></i> Wait… }
              @else { {{ loginTab() === 'login' ? 'Sign In' : 'Create Account' }} <i class="fa-solid fa-arrow-right"></i> }
            </button>
          </div>
          <div class="lf-foot">
            <button type="button" (click)="goToDashboard()">Continue as Guest →</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly svc = inject(AppService);
  private router = inject(Router);

  loginTab      = signal<'login' | 'signup'>('login');
  loginEmail    = '';
  loginPassword = '';
  signupName    = '';

  private boundKeydown = this.onKeydown.bind(this);

  ngOnInit(): void {
    this.svc.currentScreen.set('login');
    document.addEventListener('keydown', this.boundKeydown, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.boundKeydown, true);
    if (this.svc.currentScreen() === 'login') {
      this.svc.currentScreen.set('home');
    }
  }

  goToDashboard(): void {
    this.svc.currentScreen.set('home');
    this.router.navigate(['/dashboard']);
  }

  onKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') {
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
