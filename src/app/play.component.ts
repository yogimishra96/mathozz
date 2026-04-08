import {
  Component, inject, signal,
  ChangeDetectionStrategy, OnInit, OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from './app.service';
import { PwaInstallService } from './pwa-install.service';

@Component({
  selector: 'app-play',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Feedback flash -->
    @if (svc.feedback()) {
      <div class="feedback-overlay"
        [class.correct]="svc.feedback()==='correct'"
        [class.wrong]="svc.feedback()==='wrong'">
      </div>
    }

    <!-- Toast -->
    @if (showToast()) {
      <div class="toast-wrap">
        <div class="toast">
          <i class="fa-solid fa-check-circle"></i>
          <span>{{ toastMessage() }}</span>
        </div>
      </div>
    }

    <!-- ══ GAME SCREEN ══ -->
    @if (svc.currentScreen() === 'game') {
      <div class="game-wrap screen" (click)="gameWrapClick($event)">

        <div class="game-header">
          <span class="gh-logo" (click)="pauseAndGoHome()">Mathozz</span>

          <div class="gh-stats">
            <div class="ghs-item">
              <div class="ghs-label">✓</div>
              <div class="ghs-val correct">{{ svc.sessionCorrect() }}</div>
            </div>
            <div class="ghs-item">
              <div class="ghs-label">✗</div>
              <div class="ghs-val wrong">{{ svc.sessionWrong() }}</div>
            </div>
            <div class="ghs-item">
              <div class="ghs-label">Skip</div>
              <div class="ghs-val skipped">{{ svc.sessionSkipped() }}</div>
            </div>
            <div class="ghs-item">
              <div class="ghs-label">🔥</div>
              <div class="ghs-val streak">{{ svc.streak() }}</div>
            </div>
          </div>

          <div class="gh-actions">
            @if (!pwa.isStandalone()) {
              <button class="gh-icon-btn install" title="Install app" (click)="installPwa()">
                <i class="fa-solid fa-download"></i>
              </button>
            }
            <button class="gh-icon-btn" title="Submit Feedback" (click)="openFeedback.set(true)">
              <i class="fa-regular fa-comment-dots"></i>
            </button>
            <button class="gh-icon-btn" [title]="svc.isPaused() ? 'Resume' : 'Pause'" (click)="togglePause()">
              <i class="fa-solid" [class.fa-pause]="!svc.isPaused()" [class.fa-play]="svc.isPaused()"></i>
            </button>
            <button class="gh-icon-btn danger" title="End game" (click)="endGame()">
              <i class="fa-solid fa-stop"></i>
            </button>
          </div>
        </div>

        <!-- Timer bar -->
        <div class="timer-bar">
          <div class="timer-fill"
            [class.warn]="svc.timeLeft() <= 8 && svc.timeLeft() > 4"
            [class.danger]="svc.timeLeft() <= 4"
            [class.paused]="svc.isPaused()"
            [style.width.%]="(svc.timeLeft() / 15) * 100">
          </div>
        </div>

        <!-- Problem -->
        <div class="problem-zone">
          @if (svc.isPaused()) {
            <div class="paused-overlay">
              <div class="paused-label">Paused</div>
              <div class="paused-sub">Tap ▶ to resume</div>
              <button class="btn btn-primary btn-lg" (click)="togglePause()">
                <i class="fa-solid fa-play"></i> Resume
              </button>
            </div>
          }

          <div class="diff-badge" [class]="svc.difficulty()">{{ svc.difficulty() }}</div>
          @if (svc.currentProblem(); as p) {
            <div class="problem-eq">
              {{ p.num1 }}&thinsp;<span class="problem-op">{{ p.operator }}</span>&thinsp;{{ p.num2 }}
            </div>
          }
          <div class="answer-display"
            [class.is-empty]="!svc.currentInput()"
            [class.state-correct]="svc.feedback()==='correct'"
            [class.state-wrong]="svc.feedback()==='wrong'">
            {{ svc.currentInput() || '?' }}
          </div>
        </div>

        <!-- Numpad -->
        <div class="numpad-zone">
          <div class="numpad-inner">
            <div class="nk-submit-wrap">
              <button class="nk-submit"
                [disabled]="!svc.currentInput() || svc.isTransitioning() || svc.isPaused()"
                (click)="nkClick('submit', undefined, $event.currentTarget)">
                Submit &nbsp;→
              </button>
            </div>
            <div class="numpad-grid">
              @for (k of numpadKeys; track k) {
                @if (k === 'CLR') {
                  <button class="nk nk-action" [disabled]="svc.isPaused()"
                    (click)="nkClick('clear', undefined, $event.currentTarget)">CLR</button>
                } @else if (k === '⌫') {
                  <button class="nk nk-action" [disabled]="svc.isPaused()"
                    (click)="nkClick('backspace', undefined, $event.currentTarget)">⌫</button>
                } @else {
                  <button class="nk" [disabled]="svc.isPaused()"
                    (click)="nkClick('digit', k, $event.currentTarget)">{{ k }}</button>
                }
              }
            </div>
          </div>
        </div>

        @if (svc.isGuest()) {
          <div class="guest-strip">
            <span class="gs-label">{{ Math.max(0, 50 - svc.guestSolvedCount()) }} free problems left</span>
            <div class="gs-track">
              <div class="gs-fill" [style.width.%]="Math.min((svc.guestSolvedCount()/50)*100,100)"></div>
            </div>
          </div>
        }
      </div>
    }

    <!-- ══ RESULT ══ -->
    @if (svc.currentScreen() === 'result') {
      <div class="screen shell">
        <aside class="sidebar">
          <div class="sb-top"><div class="sb-brand" (click)="go('/dashboard')">Mathozz</div><div class="sb-tagline">Think fast.</div></div>
          <nav class="sb-nav">
            <button class="ni" (click)="go('/dashboard')"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
            <button class="ni" (click)="startFreshGame()"><i class="fa-solid fa-rotate-right"></i><span>Play Again</span></button>
          </nav>
        </aside>
        <main class="main">
          <div class="topbar"><div class="tb-logo" (click)="go('/dashboard')">Mathozz</div></div>
          <div class="result-content">
            <div class="result-top">
              <div>
                <div class="result-eyebrow">Session Complete</div>
                <div class="result-title">{{ resultLabel() }}</div>
                <div class="result-sub">
                  @if (svc.isGuest()) { Create an account to save progress. }
                  @else { Stats saved to your profile. }
                </div>
              </div>
              <div class="result-big">
                <div class="result-big-num">{{ svc.sessionCorrect() }}</div>
                <div class="result-big-lbl">Correct</div>
              </div>
            </div>

            <div class="result-stats">
              <div class="rsc"><div class="rsc-val" style="color:var(--wrong)">{{ svc.sessionWrong() }}</div><div class="rsc-lbl">Wrong</div></div>
              <div class="rsc"><div class="rsc-val c-skipped">{{ svc.sessionSkipped() }}</div><div class="rsc-lbl">Skipped</div></div>
              <div class="rsc"><div class="rsc-val c-streak">{{ svc.sessionBestStreak() }}</div><div class="rsc-lbl">Best Streak</div></div>
              <div class="rsc"><div class="rsc-val">{{ svc.sessionAccuracy() }}<span style="font-size:0.9rem;opacity:0.4;">%</span></div><div class="rsc-lbl">Accuracy</div></div>
            </div>

            @if (svc.isGuest()) {
              <div class="result-guest-card">
                <div class="rgc-body">
                  <div class="rgc-title">Save your progress</div>
                  <div class="rgc-sub">Create a free account to track stats.</div>
                </div>
                <button class="btn btn-primary" (click)="go('/login')">Sign Up</button>
              </div>
            }

            <div class="result-btns">
              <button class="btn btn-primary btn-lg" (click)="startFreshGame()">
                <i class="fa-solid fa-rotate-right"></i> Play Again
              </button>
              <button class="btn btn-outline btn-lg" (click)="go('/dashboard')">
                <i class="fa-solid fa-house"></i> Dashboard
              </button>
              <button class="btn btn-ghost btn-lg" (click)="openFeedback.set(true)">
                <i class="fa-regular fa-comment-dots"></i> Feedback
              </button>
            </div>
          </div>
        </main>
      </div>

      <nav class="mobile-nav">
        <div class="mob-nav-inner">
          <button class="mob-ni" (click)="go('/dashboard')"><i class="fa-solid fa-house"></i><span>Home</span></button>
          <button class="mob-ni active" (click)="startFreshGame()"><i class="fa-solid fa-rotate-right"></i><span>Play Again</span></button>
          <button class="mob-ni" (click)="openFeedback.set(true)"><i class="fa-regular fa-comment-dots"></i><span>Feedback</span></button>
        </div>
      </nav>
    }

    <!-- ══ Feedback Modal ══ -->
    @if (openFeedback()) {
      <div class="feedback-modal-overlay" (click)="openFeedback.set(false)">
        <div class="feedback-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-title">Submit Feedback</div>
          <div class="sheet-sub">Help us improve. Contact details are optional.</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Mobile <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
              <input class="form-input" type="tel" placeholder="+91 98765 43210" (input)="feedbackPhone = $any($event.target).value"/>
            </div>
            <div class="form-group">
              <label class="form-label">Email <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
              <input class="form-input" type="email" placeholder="you@example.com" (input)="feedbackEmail = $any($event.target).value"/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Feedback <span style="color:var(--wrong);font-weight:400;">*</span></label>
            <textarea class="form-textarea" rows="4" maxlength="600"
              placeholder="Tell us what you love, what's broken, or what you'd like to see..."
              (input)="feedbackText = $any($event.target).value"></textarea>
            <span class="form-hint">{{ feedbackText.length }}/600</span>
          </div>
          <div class="sheet-btns">
            <button class="btn btn-outline btn-lg" style="flex:1" (click)="closeFeedback()">Cancel</button>
            <button class="btn btn-primary btn-lg" style="flex:1" (click)="submitFeedback()" [disabled]="!feedbackText.trim() || isSendingFeedback()">
              @if (isSendingFeedback()) { <i class="fa-solid fa-spinner fa-spin"></i> Sending… }
              @else { <i class="fa-solid fa-paper-plane"></i> Send }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PlayComponent implements OnInit, OnDestroy {
  readonly svc   = inject(AppService);
  readonly pwa   = inject(PwaInstallService);
  private router = inject(Router);
  readonly Math  = Math;

  readonly numpadKeys = ['1','2','3','4','5','6','7','8','9','CLR','0','⌫'];

  showToast         = signal(false);
  toastMessage      = signal('');
  openFeedback      = signal(false);
  isSendingFeedback = signal(false);
  feedbackText  = '';
  feedbackEmail = '';
  feedbackPhone = '';

  private boundKeydown = this.onKeydown.bind(this);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    document.addEventListener('keydown', this.boundKeydown, true);

    // If we land on /play but game isn't running, start a fresh game
    if (svc_screen_not_game(this.svc)) {
      this.svc.clearSavedGame();
      this.svc.startGame();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.boundKeydown, true);
  }

  go(path: string): void {
    if (path === '/login') {
      this.svc.currentScreen.set('login');
      return;
    }
    this.router.navigate([path]);
  }

  startFreshGame(): void {
    this.svc.clearSavedGame();
    this.svc.startGame();
  }

  pauseAndGoHome(): void {
    this.svc.pauseAndSave();
    this.router.navigate(['/dashboard']);
  }

  endGame(): void {
    this.svc.stopTimer();
    this.svc.currentScreen.set('result');
  }

  togglePause(): void {
    this.svc.togglePause();
  }

  nkClick(action: 'digit'|'clear'|'backspace'|'submit', value?: string, btn?: EventTarget|null): void {
    (btn as HTMLButtonElement)?.blur();
    if (this.svc.isPaused()) return;
    if (this.svc.isTransitioning()) return;
    if      (action === 'digit' && value) this.svc.pressDigit(value);
    else if (action === 'clear')          this.svc.pressClear();
    else if (action === 'backspace')      this.svc.pressBackspace();
    else if (action === 'submit')         this.svc.submitAnswer();
  }

  gameWrapClick(e: Event): void {
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      (document.activeElement as HTMLElement)?.blur();
    }
  }

  onKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (this.svc.currentScreen() !== 'game') return;

    if (e.key === ' ') { e.preventDefault(); this.togglePause(); return; }
    if (this.svc.isPaused()) return;

    if      (e.key >= '0' && e.key <= '9') { e.preventDefault(); this.svc.pressDigit(e.key); }
    else if (e.key === 'Backspace')         { e.preventDefault(); this.svc.pressBackspace(); }
    else if (e.key === 'Delete')            { e.preventDefault(); this.svc.pressClear(); }
    else if (e.key === 'Enter')             { e.preventDefault(); this.svc.submitAnswer(); }
    else if (e.key === 'Escape')            { this.pauseAndGoHome(); }
  }

  resultLabel(): string {
    const c = this.svc.sessionCorrect();
    if (c >= 25) return 'Outstanding.';
    if (c >= 15) return 'Great Session.';
    if (c >= 8)  return 'Well Done.';
    return 'Good Effort.';
  }

  closeFeedback(): void {
    this.openFeedback.set(false);
    this.feedbackText = '';
    this.feedbackEmail = '';
    this.feedbackPhone = '';
  }

  async submitFeedback(): Promise<void> {
    if (!this.feedbackText.trim()) return;
    this.isSendingFeedback.set(true);
    try {
      await this.svc.submitFeedback({
        text:  this.feedbackText.trim(),
        email: this.feedbackEmail.trim(),
        phone: this.feedbackPhone.trim(),
      });
      this.closeFeedback();
      this.toast('Feedback sent — thank you! 🙏');
    } catch {
      this.toast('Failed to send. Please try again.');
    } finally {
      this.isSendingFeedback.set(false);
    }
  }

  async installPwa(): Promise<void> {
    const r = await this.pwa.promptInstall();
    if (r === 'unavailable') {
      this.toast(
        'To install: use the browser menu (⋮) → Install app, or the install icon in the address bar when shown.'
      );
    }
  }

  private toast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.showToast.set(false), 3000);
  }
}

/** Helper: returns true if game screen is not currently active */
function svc_screen_not_game(svc: AppService): boolean {
  const s = svc.currentScreen();
  return s !== 'game' && s !== 'result';
}