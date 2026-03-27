import { Injectable, signal } from '@angular/core';

export type FlashTone = 'none' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  readonly toastMessage = signal<string>('');
  readonly toastVisible = signal(false);
  readonly flashTone = signal<FlashTone>('none');
  readonly flashPulse = signal(0);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  showToast(message: string, ms = 2000): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastMessage.set(message);
    this.toastVisible.set(true);
    this.toastTimer = setTimeout(() => {
      this.toastVisible.set(false);
      this.toastTimer = null;
    }, ms);
  }

  pulseFlash(tone: Exclude<FlashTone, 'none'>): void {
    this.flashTone.set(tone);
    this.flashPulse.update((n) => n + 1);
  }
}
