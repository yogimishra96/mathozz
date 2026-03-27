import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { App } from './app';
import { AuthSessionService } from './core/auth/auth-session.service';
import { UiFeedbackService } from './core/ui/ui-feedback.service';
import { UserProgressService } from './core/user/user-progress.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthSessionService,
          useValue: {
            user: signal(null),
            initialized: signal(true),
            authReady$: () => of(undefined),
          },
        },
        {
          provide: UserProgressService,
          useValue: {
            stats: signal(null),
          },
        },
        {
          provide: UiFeedbackService,
          useValue: {
            flashPulse: signal(0),
            flashTone: signal('none'),
            toastVisible: signal(false),
            toastMessage: signal(''),
            showToast: () => {},
            pulseFlash: () => {},
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render router outlet after auth init', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });
});
