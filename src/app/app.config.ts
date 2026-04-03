import { ApplicationConfig, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';
import { provideServiceWorker } from '@angular/service-worker';
import { ReportsComponent } from './reports.component';

/** Initialize Firebase app (raw modular SDK, no AngularFire) */
export const firebaseApp = initializeApp(environment.firebase);

/** Firebase Auth instance — injected manually into AppService */
export const firebaseAuth = getAuth(firebaseApp);

/** Firestore instance — injected manually into AppService */
export const firebaseDb = getFirestore(firebaseApp);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter([
      { path: 'admin-reports-secret-2024', component: ReportsComponent }
    ]),
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
