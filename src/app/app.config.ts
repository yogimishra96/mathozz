import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';
import { provideServiceWorker } from '@angular/service-worker';

import { ReportsComponent }   from './reports.component';
import { DashboardComponent } from './dashboard.component';
import { ProfileComponent }   from './profile.component';
import { PlayComponent }      from './play.component';

export const firebaseApp  = initializeApp(environment.firebase);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb   = getFirestore(firebaseApp);

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

      // ── Login — handled inside AppComponent via <router-outlet>
      // We keep /login as an alias that tells AppComponent to show login screen.
      // Alternatively just navigate to /dashboard and let currentScreen do it.
      // For simplicity, /login redirects to dashboard where the guest flow takes over.
      { path: 'login',     redirectTo: 'dashboard', pathMatch: 'full' },

      // ── Admin ───────────────────────────────────────────────────────────
      { path: 'admin-reports-secret-2024', component: ReportsComponent },

      // ── Fallback ────────────────────────────────────────────────────────
      { path: '**', redirectTo: 'dashboard' },
    ]),
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};