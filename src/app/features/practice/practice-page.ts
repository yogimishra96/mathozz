import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AnswerChimeService } from '../../core/audio/answer-chime.service';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UiFeedbackService } from '../../core/ui/ui-feedback.service';
import { UserProgressService } from '../../core/user/user-progress.service';
import type { CategoryId } from '../../domain/category.types';
import {
  CATEGORY_LABELS,
  generateQuestionWithContext,
} from '../../domain/question-engine';
import type { QuestionMeta } from '../../domain/question.model';
import type { Difficulty, ReviewQueueItem } from '../../domain/user-stats.model';

@Component({
  selector: 'app-practice-page',
  standalone: true,
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.scss',
})
export class PracticePage {
  readonly auth = inject(AuthSessionService);
  private readonly chime = inject(AnswerChimeService);
  readonly progress = inject(UserProgressService);
  readonly ui = inject(UiFeedbackService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly ansRef =
    viewChild.required<ElementRef<HTMLInputElement>>('ans');

  readonly difficulties: readonly Difficulty[] = [
    'easy',
    'medium',
    'hard',
  ];

  readonly answer = signal('');
  readonly questionText = signal('…');
  readonly currentCat = signal<CategoryId | ''>('');
  readonly currentAnswer = signal(0);
  readonly currentTemplateKey = signal('');
  readonly currentHint = signal('');
  readonly currentMeta = signal<QuestionMeta | undefined>(undefined);
  readonly recentTexts = signal<string[]>([]);
  readonly recentTemplateKeys = signal<string[]>([]);
  readonly isTransition = signal(false);
  readonly qState = signal<'idle' | 'ok' | 'bad'>('idle');
  readonly shakeInput = signal(false);
  readonly qPop = signal(0);
  readonly recentOutcomes = signal<boolean[]>([]);
  readonly hintOpen = signal(false);
  /** 0–100 fraction of time left (100 = full). */
  readonly timerPct = signal(100);
  private readonly booted = signal(false);

  readonly stats = computed(() => this.progress.stats());
  readonly difficulty = computed(
    () => this.stats()?.settings.difficulty ?? 'easy',
  );
  readonly todaySolved = computed(() => this.stats()?.todaySolved ?? 0);
  readonly categoryLabel = computed(() => {
    const c = this.currentCat();
    return c ? CATEGORY_LABELS[c] : '—';
  });
  readonly avatarLetter = computed(() => {
    const u = this.auth.user();
    if (!u) {
      return '?';
    }
    const n = this.progress.displayName(u);
    return n[0]?.toUpperCase() ?? '?';
  });

  constructor() {
    effect(() => {
      if (!this.auth.user()) {
        this.booted.set(false);
        this.recentTexts.set([]);
        this.recentTemplateKeys.set([]);
        this.recentOutcomes.set([]);
        return;
      }
      const s = this.stats();
      if (!s || this.booted()) {
        return;
      }
      this.booted.set(true);
      this.nextQuestion();
    });
    effect(() => {
      this.questionText();
      queueMicrotask(() => {
        try {
          this.ansRef().nativeElement.focus();
        } catch {
          /* ignore */
        }
      });
    });
    effect((onCleanup) => {
      this.questionText();
      const st = this.stats()?.settings;
      if (!st?.timedMode || st.timePerQuestionSec <= 0) {
        this.timerPct.set(100);
        return;
      }
      const total = st.timePerQuestionSec;
      let elapsed = 0;
      this.timerPct.set(100);
      const id = window.setInterval(() => {
        if (this.isTransition()) {
          return;
        }
        elapsed += 0.1;
        this.timerPct.set(Math.max(0, (1 - elapsed / total) * 100));
        if (elapsed >= total) {
          window.clearInterval(id);
          void this.handleTimeout();
        }
      }, 100);
      onCleanup(() => window.clearInterval(id));
    });
  }

  setDifficulty(d: Difficulty): void {
    void this.progress.patchSettings({ difficulty: d });
    this.answer.set('');
    this.nextQuestion();
  }

  goProfile(): void {
    void this.router.navigate(['/profile']);
  }

  toggleHint(): void {
    this.hintOpen.update((v) => !v);
  }

  nextQuestion(): void {
    const s = this.stats();
    const d = this.difficulty();
    const exclude = this.currentCat();
    const q = generateQuestionWithContext({
      difficulty: d,
      excludeCategory: exclude,
      recentTexts: this.recentTexts(),
      recentTemplateKeys: this.recentTemplateKeys(),
      smartPracticeEnabled: s?.settings.smartPractice !== false,
      reviewQueue: s?.reviewQueue ?? [],
      categoryWeights: this.progress.categoryWeightsForPractice(),
      focusCategory: s?.settings.focusCategory ?? '',
    });
    this.recentTexts.update((rt) => [...rt, q.text].slice(-15));
    this.recentTemplateKeys.update((keys) =>
      [...keys, q.templateKey].slice(-12),
    );
    this.currentCat.set(q.cat);
    this.questionText.set(q.text);
    this.currentAnswer.set(q.ans);
    this.currentTemplateKey.set(q.templateKey);
    this.currentHint.set(q.hint ?? '');
    this.currentMeta.set(q.meta);
    this.hintOpen.set(!!s?.settings.hintVisibleDefault);
    this.qState.set('idle');
    this.answer.set('');
    this.qPop.update((n) => n + 1);
    queueMicrotask(() => this.ansRef().nativeElement.focus());
  }

  onAnswerInput(ev: Event): void {
    if (this.isTransition()) {
      return;
    }
    const el = ev.target as HTMLInputElement;
    const filtered = el.value.replace(/[^0-9]/g, '');
    if (filtered !== el.value) {
      el.value = filtered;
    }
    this.answer.set(filtered);
    const v = parseInt(filtered, 10);
    if (!Number.isNaN(v) && v === this.currentAnswer()) {
      void this.handleCorrect();
    }
  }

  onEnter(): void {
    if (this.isTransition()) {
      return;
    }
    const v = parseInt(this.answer(), 10);
    if (!Number.isNaN(v) && v === this.currentAnswer()) {
      void this.handleCorrect();
    } else if (this.answer().length > 0) {
      void this.handleWrong();
    }
  }

  skip(): void {
    if (this.isTransition()) {
      return;
    }
    this.answer.set('');
    this.nextQuestion();
    this.ui.showToast('skipped');
  }

  onStageTouch(ev: TouchEvent): void {
    const input = this.ansRef().nativeElement;
    if (ev.target === input) {
      return;
    }
    ev.preventDefault();
    input.focus();
  }

  private buildReviewItem(): ReviewQueueItem {
    const cat = this.currentCat();
    const tk = this.currentTemplateKey();
    const baseKey = tk.startsWith('review:') ? tk.slice('review:'.length) : tk;
    return {
      text: this.questionText(),
      ans: this.currentAnswer(),
      cat: cat || 'shopping',
      templateKey: baseKey,
      hint: this.currentHint() || undefined,
      meta: this.currentMeta(),
    };
  }

  private async handleTimeout(): Promise<void> {
    if (this.isTransition()) {
      return;
    }
    this.ui.showToast(this.i18n.t('timeUp'));
    await this.handleWrong();
  }

  private async handleCorrect(): Promise<void> {
    if (this.isTransition()) {
      return;
    }
    this.isTransition.set(true);
    this.qState.set('ok');
    this.ui.pulseFlash('success');
    const st = this.stats();
    if (st?.settings.haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(35);
    }
    if (st?.settings.sound) {
      await this.chime.playCorrect();
    }
    const cat = this.currentCat();
    if (!cat) {
      this.isTransition.set(false);
      return;
    }
    await this.progress.recordCorrect({
      category: cat,
      difficulty: this.difficulty(),
      solvedTemplateKey: this.currentTemplateKey(),
    });
    this.recentOutcomes.update((o) => [...o, true].slice(-10));
    this.applyAdaptive();
    setTimeout(() => {
      this.answer.set('');
      this.ansRef().nativeElement.value = '';
      this.qState.set('idle');
      this.nextQuestion();
      this.isTransition.set(false);
    }, 380);
  }

  private async handleWrong(): Promise<void> {
    if (this.isTransition()) {
      return;
    }
    this.isTransition.set(true);
    this.qState.set('bad');
    this.shakeInput.set(true);
    this.ui.pulseFlash('error');
    const st = this.stats();
    if (st?.settings.haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([25, 15, 25]);
    }
    if (st?.settings.sound) {
      await this.chime.playWrong();
    }
    const cat = this.currentCat();
    if (cat) {
      await this.progress.recordWrong({
        category: cat,
        reviewItem: this.buildReviewItem(),
      });
    }
    this.recentOutcomes.update((o) => [...o, false].slice(-10));
    this.applyAdaptive();
    setTimeout(() => {
      this.answer.set('');
      this.ansRef().nativeElement.value = '';
      this.shakeInput.set(false);
      this.qState.set('idle');
      this.nextQuestion();
      this.isTransition.set(false);
    }, 520);
  }

  private applyAdaptive(): void {
    const next = this.progress.suggestAdaptiveDifficulty(
      this.recentOutcomes(),
      this.difficulty(),
    );
    if (!next) {
      return;
    }
    void this.progress.patchSettings({ difficulty: next });
    this.ui.showToast(`Adaptive → ${next}`);
  }

}
