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

    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
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
    const ev = this.deferred;
    if (!ev) return 'unavailable';
    // Each event supports at most one `prompt()`; clear before awaiting so we never reuse it.
    this.deferred = null;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === 'accepted') {
      this.canPrompt.set(false);
      return 'accepted';
    }
    this.canPrompt.set(false);
    return 'dismissed';
  }
}
