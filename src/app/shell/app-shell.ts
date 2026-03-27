import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { UserProgressService } from '../core/user/user-progress.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div
      class="shell-root"
      [class.theme-light]="themeLight()"
      [class.high-contrast]="highContrast()"
      [class.large-text]="largeText()"
      [class.reduce-motion]="reduceMotion()"
    >
      <div class="shell-body">
        <div class="shell-outlet">
          <router-outlet />
        </div>
      </div>
      <nav class="b-nav" aria-label="Primary">
        <a
          class="nb"
          routerLink="/practice"
          routerLinkActive="on"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          {{ i18n.t('practice') }}
        </a>
        <a class="nb" routerLink="/leaderboard" routerLinkActive="on">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          {{ i18n.t('leaderboard') }}
        </a>
        <a class="nb" routerLink="/profile" routerLinkActive="on">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {{ i18n.t('profile') }}
        </a>
      </nav>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100dvh;
      }
      .shell-root {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--bg);
        color: var(--text);
      }
      .shell-body {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .shell-outlet {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .b-nav {
        margin-top: auto;
        width: 100%;
        display: flex;
        justify-content: space-around;
        padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
        border-top: 1px solid var(--line);
        background: var(--bg);
      }
      .nb {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: var(--text3);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-decoration: none;
        padding: 4px 16px;
      }
      .nb.on {
        color: var(--accent);
      }
      .nb svg {
        width: 22px;
        height: 22px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .large-text {
        font-size: 112%;
      }
      .reduce-motion .nb svg {
        transition: none;
      }
    `,
  ],
})
export class AppShell {
  private readonly progress = inject(UserProgressService);
  readonly i18n = inject(I18nService);

  readonly themeLight = computed(
    () => this.progress.stats()?.settings.theme === 'light',
  );
  readonly highContrast = computed(
    () => !!this.progress.stats()?.settings.highContrast,
  );
  readonly largeText = computed(
    () => !!this.progress.stats()?.settings.largeText,
  );
  readonly reduceMotion = computed(
    () => !!this.progress.stats()?.settings.reduceMotion,
  );
}
