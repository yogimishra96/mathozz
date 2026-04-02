import { ApplicationConfig, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';
import { provideServiceWorker } from '@angular/service-worker';

/** Initialize Firebase app (raw modular SDK, no AngularFire) */
export const firebaseApp = initializeApp(environment.firebase);

/** Firebase Auth instance — injected manually into AppService */
export const firebaseAuth = getAuth(firebaseApp);

/** Firestore instance — injected manually into AppService */
export const firebaseDb = getFirestore(firebaseApp);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
