import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { environment } from '../environments/environment';
import { AppService } from './app.service';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * GA4 (gtag) for SPA: route changes, optional User-ID (Firebase uid), and virtual paths under /play.
 * In GA4 Admin, enable User-ID reporting and Enhanced measurement (scroll, outbound clicks) as needed.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  private readonly router = inject(Router);
  private readonly app = inject(AppService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private measurementId = '';
  private ready = false;
  /** Avoid double send when `NavigationEnd` and `afterNextRender` both fire for the same URL. */
  private _lastPageEmitUrl = '';
  private _lastPageEmitAt = 0;

  constructor() {
    const id = environment.firebase.measurementId;
    if (!environment.enableAnalytics || !id || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.measurementId = id;
    this._installGtagStub();
    this.ready = true;
    this._loadScript(id);
    this._subscribeRouter();
    this._bindUserId(id);
  }

  /**
   * SPA page views: GA4 expects `gtag('config', id, { page_path, ... })`, not only a custom event.
   * See: https://developers.google.com/tag-platform/gtagjs/reference#config
   */
  trackPageView(path: string): void {
    if (!this.ready || !this.measurementId) return;
    const pagePath = path.split('?')[0] || '/';
    const pageLocation = `${window.location.origin}${pagePath}${window.location.search}`;
    window.gtag?.('config', this.measurementId, {
      page_path: pagePath,
      page_location: pageLocation,
      page_title: document.title,
    });
  }

  /** Custom GA4 events (e.g. `level_up`, `share`). */
  trackEvent(name: string, params?: Record<string, unknown>): void {
    if (!this.ready || !this.measurementId) return;
    window.gtag?.('event', name, params);
  }

  private _installGtagStub(): void {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', this.measurementId, { send_page_view: false });
  }

  private _loadScript(measurementId: string): void {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(s);
  }

  private _subscribeRouter(): void {
    const emit = (url: string): void => {
      const path = url.split('?')[0];
      if (path === '/play') {
        return;
      }
      const now = Date.now();
      if (url === this._lastPageEmitUrl && now - this._lastPageEmitAt < 400) {
        return;
      }
      this._lastPageEmitUrl = url;
      this._lastPageEmitAt = now;
      this.trackPageView(url);
    };

    // Initial navigation often completes before this subscription runs — single-page visits had 0 hits.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(emit);

    afterNextRender(() => {
      queueMicrotask(() => emit(this.router.url));
    });
  }

  private _bindUserId(measurementId: string): void {
    effect(() => {
      const uid = this.app.user()?.uid;
      if (!this.ready) return;
      window.gtag?.('config', measurementId, uid ? { user_id: uid } : {});
    });
  }
}
