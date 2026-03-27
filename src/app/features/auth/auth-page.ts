import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UiFeedbackService } from '../../core/ui/ui-feedback.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})
export class AuthPage {
  readonly auth = inject(AuthSessionService);
  readonly ui = inject(UiFeedbackService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.auth.user()) {
        void this.router.navigateByUrl('/practice');
      }
    });
  }

  readonly email = signal('');
  readonly password = signal('');
  readonly name = signal('');
  readonly signUp = signal(false);
  readonly showEmail = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);

  inputVal(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }

  toggleMode(): void {
    this.signUp.update((v) => !v);
    this.error.set('');
  }

  async google(): Promise<void> {
    this.error.set('');
    this.busy.set(true);
    try {
      await this.auth.signInGooglePopup();
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      this.error.set(this.mapErr(code));
    }
    this.busy.set(false);
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.busy.set(true);
    try {
      const e = this.email().trim();
      const p = this.password();
      const n = this.name().trim();
      if (this.signUp()) {
        await this.auth.signUpEmail(e, p, n);
      } else {
        await this.auth.signInEmail(e, p);
      }
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      this.error.set(this.mapErr(code));
      this.busy.set(false);
      return;
    }
    this.busy.set(false);
  }

  async guest(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.signInGuest();
    } catch {
      this.ui.showToast('Guest sign-in failed');
    }
    this.busy.set(false);
  }

  private mapErr(code: string): string {
    const m: Record<string, string> = {
      'auth/invalid-email': 'Invalid email',
      'auth/user-not-found': 'No account with that email',
      'auth/wrong-password': 'Wrong password',
      'auth/email-already-in-use': 'Email already in use',
      'auth/weak-password': 'Password must be 6+ chars',
      'auth/too-many-requests': 'Too many attempts',
      'auth/account-exists-with-different-credential':
        'Account exists with another sign-in method',
      'auth/cancelled-popup-request': 'Sign-in cancelled',
    };
    return m[code] ?? 'Something went wrong';
  }
}
