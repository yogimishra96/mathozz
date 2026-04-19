import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics'; // ✅ Line 1: import add karo
import { environment } from '../environments/environment';
import { provideServiceWorker } from '@angular/service-worker';

import { ReportsComponent }   from './reports.component';
import { DashboardComponent } from './dashboard.component';
import { ProfileComponent }   from './profile.component';
import { PlayComponent }      from './play.component';
import { LoginComponent }     from './login.component';

export const firebaseApp  = initializeApp(environment.firebase);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb   = getFirestore(firebaseApp);
export const firebaseAnalytics = getAnalytics(firebaseApp); // ✅ Line 2: initialize karo

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter([
      // ── Redirect root to dashboard ──────────────────────────────────────
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },

      // ── Main app routes ─────────────────────────────────────────────────
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile',   component: ProfileComponent },
      { path: 'play',      component: PlayComponent },
      { path: 'login',     component: LoginComponent },

      // ── Admin ───────────────────────────────────────────────────────────
      { path: 'feedback-report', component: ReportsComponent },

      // ── Fallback ────────────────────────────────────────────────────────
      { path: '**', redirectTo: 'dashboard' },
    ]),
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};