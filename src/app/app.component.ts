import {
  Component, inject,
  ChangeDetectionStrategy, OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

import { AppService } from './app.service';
import { PwaInstallService } from './pwa-install.service';

/**
 * Shell: global theme + router-outlet. Login lives at `/login` (LoginComponent).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterOutlet],
  styleUrl: './app.scss',
  host: { '[class.theme-light]': '!svc.isDarkMode()' },
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  readonly svc   = inject(AppService);
  private router = inject(Router);
  /** Eager init so `beforeinstallprompt` is captured on first load, not only after opening /play. */
  private readonly _pwaInstall = inject(PwaInstallService);

  ngOnInit(): void {
    this._patchAuthNavigation();
  }

  /**
   * After successful auth, go to dashboard (AppService alone sets currentScreen to home).
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
}
