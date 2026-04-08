import { Injectable, signal } from '@angular/core';

/** Minimal shape for Chromium's BeforeInstallPromptEvent. */
type AnyBeforeInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

/**
 * Captures beforeinstallprompt as early as possible (providedIn root) so navigating
 * to /play after first paint does not miss the event. Exposes installability for UI.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  /** Browser offered an in-app install prompt (Chrome/Edge, etc.). */
  readonly canPrompt = signal(false);

  private deferred: AnyBeforeInstallPrompt | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferred = e as AnyBeforeInstallPrompt;
      this.canPrompt.set(true);
    });
  }

  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  /**
   * @returns 'accepted' | 'dismissed' | 'unavailable'
   */
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferred) return 'unavailable';
    await this.deferred.prompt();
    const { outcome } = await this.deferred.userChoice;
    if (outcome === 'accepted') {
      this.canPrompt.set(false);
      this.deferred = null;
      return 'accepted';
    }
    return 'dismissed';
  }
}
