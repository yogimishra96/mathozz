import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnswerChimeService } from '../../core/audio/answer-chime.service';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UiFeedbackService } from '../../core/ui/ui-feedback.service';
import { UserProgressService } from '../../core/user/user-progress.service';
import { CATEGORY_IDS, type CategoryId } from '../../domain/category.types';
import { CATEGORY_LABELS } from '../../domain/question-engine';
import {
  masteryPercent,
  recentDailySolves,
  recentDailyWrongs,
  weakestCategories,
} from '../../domain/skill-analytics';
import { buildStatsCsv, downloadTextFile } from '../../domain/stats-export';
import { defaultUserSettings } from '../../domain/user-stats.factory';
import type {
  AppLocale,
  Difficulty,
  FocusCategory,
  UserSettings,
} from '../../domain/user-stats.model';

type BoolSettingKey =
  | 'sound'
  | 'haptic'
  | 'highContrast'
  | 'smartPractice'
  | 'timedMode'
  | 'hintVisibleDefault'
  | 'reduceMotion'
  | 'largeText'
  | 'adaptiveDifficulty';

const TIMER_OPTS = [30, 45, 60, 90] as const;

@Component({
  selector: 'app-profile-page',
  standalone: true,
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  readonly Math = Math;
  readonly categoryIds = CATEGORY_IDS;

  readonly auth = inject(AuthSessionService);
  private readonly chime = inject(AnswerChimeService);
  readonly progress = inject(UserProgressService);
  readonly ui = inject(UiFeedbackService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly stats = computed(() => this.progress.stats());
  readonly settings = computed(
    () => this.stats()?.settings ?? defaultUserSettings(),
  );
  readonly weakest = computed(() => {
    const s = this.stats();
    if (!s) {
      return [] as CategoryId[];
    }
    return [...weakestCategories(s, 3)];
  });
  readonly weekSolves = computed(() =>
    recentDailySolves(this.stats()?.dailySolveHistory ?? {}, 7),
  );
  readonly weekWrongs = computed(() =>
    recentDailyWrongs(this.stats()?.dailyWrongHistory ?? {}, 7),
  );

  readonly feedbackOpen = signal(false);
  readonly privacyOpen = signal(false);
  readonly feedbackText = signal('');

  readonly avatarLetter = computed(() => {
    const u = this.auth.user();
    if (!u) {
      return '?';
    }
    const n = this.progress.displayName(u);
    return n[0]?.toUpperCase() ?? '?';
  });

  readonly displayName = computed(() =>
    this.progress.displayName(this.auth.user()),
  );

  readonly emailLabel = computed(() => {
    const u = this.auth.user();
    if (!u?.email) {
      return this.i18n.t('anonymous');
    }
    return u.email;
  });

  catLabel(c: CategoryId): string {
    return CATEGORY_LABELS[c];
  }

  mastery(c: CategoryId): number {
    const s = this.stats();
    if (!s) {
      return 0;
    }
    return masteryPercent(s.catSolved, s.catWrong, c);
  }

  async toggle(key: BoolSettingKey, event?: Event): Promise<void> {
    event?.stopPropagation();
    const s = this.stats();
    if (!s) {
      return;
    }
    await this.chime.unlock();
    const next = !s.settings[key];
    const patch: Partial<UserSettings> = { [key]: next } as Partial<UserSettings>;
    if (key === 'timedMode' && next && s.settings.timePerQuestionSec <= 0) {
      patch['timePerQuestionSec'] = 45;
    }
    await this.progress.patchSettings(patch);
    if (key === 'sound' && next) {
      await this.chime.previewToggle();
    }
  }

  cycleDifficulty(): void {
    const order: Difficulty[] = ['easy', 'medium', 'hard'];
    const cur = this.stats()?.settings.difficulty ?? 'easy';
    const idx = order.indexOf(cur);
    const next = order[(idx + 1) % order.length]!;
    void this.progress.patchSettings({ difficulty: next });
  }

  cycleTheme(): void {
    const cur = this.stats()?.settings.theme ?? 'dark';
    void this.progress.patchSettings({
      theme: cur === 'dark' ? 'light' : 'dark',
    });
  }

  cycleLocale(): void {
    const cur: AppLocale = this.stats()?.settings.locale ?? 'en';
    void this.progress.patchSettings({ locale: cur === 'en' ? 'hi' : 'en' });
  }

  cycleFocus(): void {
    const cur = this.settings().focusCategory as FocusCategory;
    const opts: FocusCategory[] = ['', ...CATEGORY_IDS];
    const idx = opts.indexOf(cur);
    const next = opts[(idx + 1) % opts.length]!;
    void this.progress.patchSettings({ focusCategory: next });
  }

  focusLabel(): string {
    const f = this.settings().focusCategory;
    if (!f) {
      return this.i18n.t('focusNone');
    }
    return CATEGORY_LABELS[f as CategoryId];
  }

  cycleTimerSecs(): void {
    const cur = this.settings().timePerQuestionSec || 45;
    let bestI = 0;
    let bestD = 999;
    for (let i = 0; i < TIMER_OPTS.length; i++) {
      const d = Math.abs(TIMER_OPTS[i]! - cur);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    const next = TIMER_OPTS[(bestI + 1) % TIMER_OPTS.length]!;
    void this.progress.patchSettings({ timePerQuestionSec: next });
  }

  exportCsv(): void {
    const s = this.stats();
    if (!s) {
      return;
    }
    const csv = buildStatsCsv(s);
    downloadTextFile('mathozz-stats.csv', csv);
    this.ui.showToast(this.i18n.t('exportDone'));
  }

  openFeedback(): void {
    this.feedbackText.set('');
    this.feedbackOpen.set(true);
  }

  closeFeedback(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.feedbackOpen.set(false);
    }
  }

  closePrivacy(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.privacyOpen.set(false);
    }
  }

  openPrivacy(): void {
    this.privacyOpen.set(true);
  }

  dismissPrivacy(): void {
    this.privacyOpen.set(false);
  }

  ta(ev: Event): string {
    return (ev.target as HTMLTextAreaElement).value;
  }

  async sendFeedback(): Promise<void> {
    const t = this.feedbackText().trim();
    if (t.length < 3) {
      this.ui.showToast('Please enter a bit more detail');
      return;
    }
    try {
      await this.progress.submitFeedback(t);
      this.feedbackOpen.set(false);
      this.ui.showToast(this.i18n.t('feedbackSent'));
    } catch {
      this.ui.showToast('Could not send feedback');
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOutUser();
    void this.router.navigateByUrl('/auth');
  }
}
