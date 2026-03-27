import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  return toObservable(auth.initialized).pipe(
    filter((v) => v),
    take(1),
    map(() =>
      auth.user() !== null ? true : router.createUrlTree(['/auth']),
    ),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  return toObservable(auth.initialized).pipe(
    filter((v) => v),
    take(1),
    map(() =>
      auth.user() === null ? true : router.createUrlTree(['/practice']),
    ),
  );
};
