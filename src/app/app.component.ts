import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, OnInit, OnDestroy,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

import { AppService } from './app.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterOutlet],
  styleUrls: ['./app.scss'],
  host: { '[class.theme-light]': '!svc.isDarkMode()' },
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

    <!-- ── Logout confirm ── -->
    @if (showLogoutConfirm()) {
      <div class="logout-overlay" (click)="showLogoutConfirm.set(false)">
        <div class="logout-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-title">Sign out?</div>
          <div class="sheet-sub">You'll need to sign in again to access your stats.</div>
          <div class="sheet-btns">
            <button class="btn btn-danger btn-lg" style="flex:1" (click)="confirmLogout()">
              <i class="fa-solid fa-right-from-bracket"></i> Yes, Sign Out
            </button>
            <button class="btn btn-outline btn-lg" style="flex:1" (click)="showLogoutConfirm.set(false)">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Submit Feedback Modal ── -->
    @if (showFeedbackModal()) {
      <div class="feedback-modal-overlay" (click)="showFeedbackModal.set(false)">
        <div class="feedback-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-title">Submit Feedback</div>
          <div class="sheet-sub">Help us improve. Contact details are optional.</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Mobile <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
              <input class="form-input" type="tel" placeholder="+91 98765 43210"
                [(ngModel)]="feedbackPhone" autocomplete="tel"/>
            </div>
            <div class="form-group">
              <label class="form-label">Email <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
              <input class="form-input" type="email" placeholder="you@example.com"
                [(ngModel)]="feedbackEmail" autocomplete="email"/>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Feedback <span style="color:var(--wrong);font-weight:400;">*</span></label>
            <textarea class="form-textarea" rows="4" maxlength="600"
              placeholder="Tell us what you love, what's broken, or what you'd like to see..."
              [(ngModel)]="feedbackText"></textarea>
            <span class="form-hint">{{ feedbackText.length }}/600</span>
          </div>

          <div class="sheet-btns">
            <button class="btn btn-outline btn-lg" style="flex:1" (click)="showFeedbackModal.set(false)">Cancel</button>
            <button class="btn btn-primary btn-lg" style="flex:1"
              (click)="submitFeedback()"
              [disabled]="!feedbackText.trim() || isSendingFeedback()">
              @if (isSendingFeedback()) { <i class="fa-solid fa-spinner fa-spin"></i> Sending… }
              @else { <i class="fa-solid fa-paper-plane"></i> Send }
            </button>
          </div>
        </div>
      </div>
    }

    @if (!isAdminRoute()) {

    <!-- ══════════════════════════════════════════
         GAME SCREEN
    ══════════════════════════════════════════ -->
    @if (svc.currentScreen() === 'game') {
      <div class="game-wrap screen" (click)="gameWrapClick($event)">

        <!-- Header: Logo | Stats | Actions -->
        <div class="game-header">
          <span class="gh-logo" (click)="resumeAndGo('home')">Mathozz</span>

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

          <!-- Right action buttons -->
          <div class="gh-actions">
            <!-- PWA Install (shown only when installable) -->
            @if (pwaInstallable()) {
              <button class="gh-icon-btn install" title="Install App" (click)="installPwa()">
                <i class="fa-solid fa-download"></i>
              </button>
            }
            <!-- Feedback -->
            <button class="gh-icon-btn" title="Submit Feedback" (click)="openFeedback()">
              <i class="fa-regular fa-comment-dots"></i>
            </button>
            <!-- Pause / Resume -->
            <button class="gh-icon-btn" [title]="svc.isPaused() ? 'Resume' : 'Pause'"
              (click)="togglePause()">
              <i class="fa-solid" [class.fa-pause]="!svc.isPaused()" [class.fa-play]="svc.isPaused()"></i>
            </button>
            <!-- End game -->
            <button class="gh-icon-btn danger" title="End game" (click)="svc.endGame()">
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
          <!-- Paused overlay -->
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

    <!-- ══════════════════════════════════════════
         HOME
    ══════════════════════════════════════════ -->
    @if (svc.currentScreen() === 'home') {
      <div class="screen shell">
        <aside class="sidebar">
          <div class="sb-top">
            <div class="sb-brand" (click)="svc.currentScreen.set('home')">Mathozz</div>
            <div class="sb-tagline">Think fast.</div>
          </div>
          <nav class="sb-nav">
            <button class="ni active"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
            <button class="ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Play</span></button>
            <div class="sb-div"></div>
            @if (!svc.isGuest()) {
              <button class="ni" (click)="svc.currentScreen.set('profile')"><i class="fa-solid fa-user"></i><span>Profile</span></button>
            } @else {
              <button class="ni" (click)="svc.currentScreen.set('login')"><i class="fa-solid fa-right-to-bracket"></i><span>Sign In</span></button>
            }
          </nav>
          <div class="sb-foot">
            <button class="ni" (click)="svc.toggleDarkMode()">
              <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
              <span>{{ svc.isDarkMode() ? 'Light mode' : 'Dark mode' }}</span>
            </button>
            @if (!svc.isGuest()) {
              <button class="ni logout" (click)="showLogoutConfirm.set(true)">
                <i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span>
              </button>
            }
          </div>
        </aside>

        <main class="main">
          <div class="topbar">
            <div class="tb-logo" (click)="svc.currentScreen.set('home')">Mathozz</div>
            @if (!svc.isGuest()) {
              <span class="tb-user">{{ svc.user()!.displayName }}</span>
            }
          </div>

          <div class="home-content">
            <!-- Hero: no "Play Again" button, only Start Game -->
            <div class="hero-card">
              <div class="hero-eyebrow">{{ svc.isGuest() ? 'Guest Mode' : 'Welcome back' }}</div>
              <div class="hero-title">{{ svc.isGuest() ? 'Ready to train?' : 'Keep going.' }}</div>
              <div class="hero-sub">
                @if (svc.isGuest()) { {{ Math.max(0, 50 - svc.guestSolvedCount()) }} free problems remaining }
                @else { {{ svc.user()!.totalSolved }} solved · {{ svc.user()!.accuracy }}% accuracy }
              </div>
              <div class="hero-btns">
                <!-- Resume button if game was paused/saved -->
                @if (svc.hasSavedGame()) {
                  <button class="btn btn-outline btn-lg" (click)="resumeSavedGame()">
                    <i class="fa-solid fa-play"></i> Resume Game
                  </button>
                }
                <button class="btn btn-primary btn-lg" (click)="startFreshGame()">
                  <i class="fa-solid fa-plus"></i> New Game
                </button>
              </div>
            </div>

            @if (svc.isGuest()) {
              <div class="guest-banner">
                <div class="gp">
                  <div class="gp-lbl">
                    <span>Guest Progress</span>
                    <span>{{ Math.min(svc.guestSolvedCount(), 50) }} / 50</span>
                  </div>
                  <div class="prog-track">
                    <div class="prog-fill" [style.width.%]="Math.min((svc.guestSolvedCount()/50)*100,100)"></div>
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" (click)="svc.currentScreen.set('login')">Sign Up</button>
              </div>
            }

            @if (!svc.isGuest()) {
              <div>
                <div class="section-hd">Your Numbers</div>
                <p class="stat-explain">
                  <strong>Top Session:</strong> Most correct in one game.&nbsp;&nbsp;
                  <strong>Best Streak:</strong> Longest consecutive correct run.
                </p>
                <div class="stats-grid">
                  <div class="sc"><div class="sc-lbl">Total Solved</div><div class="sc-val">{{ svc.user()!.totalSolved }}</div></div>
                  <div class="sc"><div class="sc-lbl">Accuracy</div><div class="sc-val">{{ svc.user()!.accuracy }}%</div></div>
                  <div class="sc"><div class="sc-lbl">Top Session</div><div class="sc-val c-correct">{{ svc.user()!.topSession }}</div></div>
                  <div class="sc"><div class="sc-lbl">Best Streak</div><div class="sc-val c-streak">{{ svc.user()!.bestStreak }}</div></div>
                </div>
              </div>
            }
          </div>
        </main>
      </div>

      <nav class="mobile-nav">
        <div class="mob-nav-inner">
          <button class="mob-ni active"><i class="fa-solid fa-house"></i><span>Home</span></button>
          <button class="mob-ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Play</span></button>
          @if (!svc.isGuest()) {
            <button class="mob-ni" (click)="svc.currentScreen.set('profile')"><i class="fa-solid fa-user"></i><span>Profile</span></button>
            <button class="mob-ni mob-logout" (click)="showLogoutConfirm.set(true)"><i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span></button>
          } @else {
            <button class="mob-ni" (click)="svc.currentScreen.set('login')"><i class="fa-solid fa-right-to-bracket"></i><span>Sign In</span></button>
          }
          <button class="mob-ni" (click)="svc.toggleDarkMode()">
            <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
            <span>{{ svc.isDarkMode() ? 'Light' : 'Dark' }}</span>
          </button>
        </div>
      </nav>
    }

    <!-- ══════════════════════════════════════════
         RESULT
    ══════════════════════════════════════════ -->
    @if (svc.currentScreen() === 'result') {
      <div class="screen shell">
        <aside class="sidebar">
          <div class="sb-top"><div class="sb-brand" (click)="svc.currentScreen.set('home')">Mathozz</div><div class="sb-tagline">Think fast.</div></div>
          <nav class="sb-nav">
            <button class="ni" (click)="svc.currentScreen.set('home')"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
            <button class="ni" (click)="startFreshGame()"><i class="fa-solid fa-rotate-right"></i><span>Play Again</span></button>
          </nav>
        </aside>
        <main class="main">
          <div class="topbar"><div class="tb-logo" (click)="svc.currentScreen.set('home')">Mathozz</div></div>
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

            <!-- 4 stats: correct, wrong, skipped, streak -->
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
                <button class="btn btn-primary" (click)="svc.currentScreen.set('login')">Sign Up</button>
              </div>
            }

            <div class="result-btns">
              <button class="btn btn-primary btn-lg" (click)="startFreshGame()">
                <i class="fa-solid fa-rotate-right"></i> Play Again
              </button>
              <button class="btn btn-outline btn-lg" (click)="svc.currentScreen.set('home')">
                <i class="fa-solid fa-house"></i> Dashboard
              </button>
              <button class="btn btn-ghost btn-lg" (click)="openFeedback()">
                <i class="fa-regular fa-comment-dots"></i> Feedback
              </button>
            </div>
          </div>
        </main>
      </div>

      <nav class="mobile-nav">
        <div class="mob-nav-inner">
          <button class="mob-ni" (click)="svc.currentScreen.set('home')"><i class="fa-solid fa-house"></i><span>Home</span></button>
          <button class="mob-ni active" (click)="startFreshGame()"><i class="fa-solid fa-rotate-right"></i><span>Play Again</span></button>
          <button class="mob-ni" (click)="openFeedback()"><i class="fa-regular fa-comment-dots"></i><span>Feedback</span></button>
        </div>
      </nav>
    }

    <!-- ══════════════════════════════════════════
         LOGIN
    ══════════════════════════════════════════ -->
    @if (svc.currentScreen() === 'login') {
      <div class="screen login-shell">
        <div class="login-left">
          <div class="ll-brand">Mathozz</div>
          <div>
            <div class="ll-headline">Train your<br>mental math.</div>
            <div class="ll-sub">Track progress and sharpen your mind every day.</div>
          </div>
          <div class="ll-stats">
            <div><div class="lls-num">∞</div><div class="lls-lbl">Free to Play</div></div>
            <div><div class="lls-num">3</div><div class="lls-lbl">Difficulties</div></div>
          </div>
        </div>
        <div class="login-right">
          <div class="lf-box">
            <div class="lf-mobile-brand">Mathozz</div>
            @if (svc.guestGateTriggered()) {
              <div class="gate-msg">50 free problems used. Sign in to continue.</div>
            }
            <div class="lf-title">{{ loginTab() === 'login' ? 'Welcome back' : 'Create account' }}</div>
            <div class="lf-sub">{{ loginTab() === 'login' ? 'Sign in to continue.' : 'Start your journey.' }}</div>
            <div class="lf-tabs">
              <div class="tabs">
                <button class="tab" [class.active]="loginTab()==='login'" (click)="loginTab.set('login')">Sign In</button>
                <button class="tab" [class.active]="loginTab()==='signup'" (click)="loginTab.set('signup')">Sign Up</button>
              </div>
            </div>
            <div class="lf-fields">
              <button class="btn btn-google btn-full btn-lg" (click)="svc.loginWithGoogle()" [disabled]="svc.isLoading()">
                <svg width="16" height="16" viewBox="0 0 48 48" style="flex-shrink:0;">
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.16C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.16C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.16C12.43 13.72 17.74 9.5 24 9.5z"/>
                </svg>
                Continue with Google
              </button>
              <div class="divider">or</div>
              @if (loginTab() === 'signup') {
                <div class="form-group">
                  <label class="form-label">Name</label>
                  <input class="form-input" type="text" placeholder="Your name" [(ngModel)]="signupName" autocomplete="name"/>
                </div>
              }
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" type="email" placeholder="you@example.com" [(ngModel)]="loginEmail" autocomplete="email"/>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <input class="form-input" type="password" placeholder="••••••••" [(ngModel)]="loginPassword" autocomplete="current-password" (keydown.enter)="onAuthSubmit()"/>
              </div>
              @if (svc.authError()) {
                <div class="login-err"><i class="fa-solid fa-circle-exclamation" style="flex-shrink:0;"></i> {{ svc.authError() }}</div>
              }
              <button class="btn btn-primary btn-full btn-lg" (click)="onAuthSubmit()" [disabled]="svc.isLoading()">
                @if (svc.isLoading()) { <i class="fa-solid fa-spinner fa-spin"></i> Wait… }
                @else { {{ loginTab() === 'login' ? 'Sign In' : 'Create Account' }} <i class="fa-solid fa-arrow-right"></i> }
              </button>
            </div>
            <div class="lf-foot">
              <button (click)="svc.currentScreen.set('home')">Continue as Guest →</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════
         PROFILE
    ══════════════════════════════════════════ -->
    @if (svc.currentScreen() === 'profile') {
      <div class="screen shell">
        <aside class="sidebar">
          <div class="sb-top"><div class="sb-brand" (click)="svc.currentScreen.set('home')">Mathozz</div><div class="sb-tagline">Think fast.</div></div>
          <nav class="sb-nav">
            <button class="ni" (click)="svc.currentScreen.set('home')"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
            <button class="ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Play</span></button>
            <div class="sb-div"></div>
            <button class="ni active"><i class="fa-solid fa-user"></i><span>Profile</span></button>
          </nav>
          <div class="sb-foot">
            <button class="ni" (click)="svc.toggleDarkMode()">
              <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
              <span>{{ svc.isDarkMode() ? 'Light mode' : 'Dark mode' }}</span>
            </button>
            <button class="ni logout" (click)="showLogoutConfirm.set(true)">
              <i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span>
            </button>
          </div>
        </aside>
        <main class="main">
          <div class="topbar">
            <div class="tb-logo" (click)="svc.currentScreen.set('home')">Mathozz</div>
            <button class="btn btn-ghost btn-sm" (click)="openFeedback()">
              <i class="fa-regular fa-comment-dots"></i> Feedback
            </button>
          </div>
          @if (svc.user(); as u) {
            <div class="profile-content">
              <div class="profile-hero">
                @if (u.photoURL) {
                  <img class="pav pav-photo" [src]="u.photoURL" [alt]="u.displayName"/>
                } @else {
                  <div class="pav" [style.background]="avatarColor(u.displayName)">
                    {{ u.displayName.charAt(0).toUpperCase() }}
                  </div>
                }
                <div style="flex:1;min-width:0;">
                  <div class="pm-name">{{ u.displayName }}</div>
                  <div class="pm-email">{{ u.email }}</div>
                  <div class="pm-chips">
                    @if (u.isPremium) { <span class="chip chip-green">Premium</span> }
                  </div>
                </div>
              </div>

              <div>
                <div class="section-hd">Statistics</div>
                <p class="stat-explain">
                  <strong>Top Session:</strong> Most correct in one game.&nbsp;&nbsp;
                  <strong>Best Streak:</strong> Longest consecutive correct run.
                </p>
                <div class="stats-grid">
                  <div class="sc"><div class="sc-lbl">Total Solved</div><div class="sc-val">{{ u.totalSolved }}</div></div>
                  <div class="sc"><div class="sc-lbl">Accuracy</div><div class="sc-val">{{ u.accuracy }}%</div></div>
                  <div class="sc" title="Total correct in best single game"><div class="sc-lbl">Top Session</div><div class="sc-val c-correct">{{ u.topSession }}</div></div>
                  <div class="sc" title="Longest streak of right answers ever"><div class="sc-lbl">Best Streak</div><div class="sc-val c-streak">{{ u.bestStreak }}</div></div>
                </div>
              </div>

              @if (u.badges.length > 0) {
                <div>
                  <div class="section-hd">Badges</div>
                  <div class="badges-row">
                    @for (b of u.badges; track b) {
                      <div class="badge-pill">{{ badgeEmoji(b) }} {{ badgeName(b) }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </main>
      </div>

      <nav class="mobile-nav">
        <div class="mob-nav-inner">
          <button class="mob-ni" (click)="svc.currentScreen.set('home')"><i class="fa-solid fa-house"></i><span>Home</span></button>
          <button class="mob-ni" (click)="startFreshGame()"><i class="fa-solid fa-play"></i><span>Play</span></button>
          <button class="mob-ni active"><i class="fa-solid fa-user"></i><span>Profile</span></button>
          <button class="mob-ni mob-logout" (click)="showLogoutConfirm.set(true)"><i class="fa-solid fa-right-from-bracket"></i><span>Sign Out</span></button>
          <button class="mob-ni" (click)="svc.toggleDarkMode()">
            <i class="fa-solid" [class.fa-moon]="svc.isDarkMode()" [class.fa-sun]="!svc.isDarkMode()"></i>
            <span>{{ svc.isDarkMode() ? 'Light' : 'Dark' }}</span>
          </button>
        </div>
      </nav>
    }

    } <!-- end !isAdminRoute -->

    <router-outlet></router-outlet>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  readonly svc      = inject(AppService);
  private router    = inject(Router);

  // ── UI state ──
  loginTab          = signal<'login' | 'signup'>('login');
  showLogoutConfirm = signal(false);
  showFeedbackModal = signal(false);
  showToast         = signal(false);
  toastMessage      = signal('');
  isAdminRoute      = signal(false);
  isSendingFeedback = signal(false);
  pwaInstallable    = signal(false);

  // ── Form fields ──
  loginEmail    = '';
  loginPassword = '';
  signupName    = '';
  feedbackText  = '';
  feedbackEmail = '';
  feedbackPhone = '';

  readonly numpadKeys = ['1','2','3','4','5','6','7','8','9','CLR','0','⌫'];
  readonly Math = Math;

  private boundKeydown    = this.onKeydown.bind(this);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private pwaHandler      = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    this.pwaInstallable.set(true);
  };

  ngOnInit(): void {
    document.addEventListener('keydown', this.boundKeydown, true);
    window.addEventListener('beforeinstallprompt', this.pwaHandler as EventListener);

    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.isAdminRoute.set(e.url.includes('admin-reports-secret-2024'));
      });
    this.isAdminRoute.set(this.router.url.includes('admin-reports-secret-2024'));
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.boundKeydown, true);
    window.removeEventListener('beforeinstallprompt', this.pwaHandler as EventListener);
  }

  // ── Game controls ──────────────────────────────────────────────────────────

  /** Start a completely fresh game (clears saved state) */
  startFreshGame(): void {
    this.svc.clearSavedGame();
    this.svc.startGame();
  }

  /** Resume a saved game that was interrupted */
  resumeSavedGame(): void {
    this.svc.resumeGame();
  }

  /** When navigating away from game, auto-save state */
  resumeAndGo(screen: string): void {
    if (this.svc.currentScreen() === 'game') {
      this.svc.pauseAndSave();
    }
    this.svc.currentScreen.set(screen as any);
  }

  togglePause(): void {
    this.svc.togglePause();
  }

  /** Numpad button: blur immediately to prevent mobile keyboard, then act */
  nkClick(action: 'digit'|'clear'|'backspace'|'submit', value?: string, btn?: EventTarget|null): void {
    (btn as HTMLButtonElement)?.blur();
    if (this.svc.isPaused()) return;
    if (this.svc.isTransitioning()) return;
    if      (action === 'digit' && value) this.svc.pressDigit(value);
    else if (action === 'clear')          this.svc.pressClear();
    else if (action === 'backspace')      this.svc.pressBackspace();
    else if (action === 'submit')         this.svc.submitAnswer();
  }

  /** Blur any focus on non-button tap (prevents mobile keyboard) */
  gameWrapClick(e: Event): void {
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      (document.activeElement as HTMLElement)?.blur();
    }
  }

  /** Desktop keyboard — captured at document level */
  onKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (this.svc.currentScreen() !== 'game') {
      if (e.key === 'Escape') this.svc.currentScreen.set('home');
      return;
    }
    // Space = pause/resume
    if (e.key === ' ') { e.preventDefault(); this.togglePause(); return; }
    if (this.svc.isPaused()) return;

    if      (e.key >= '0' && e.key <= '9') { e.preventDefault(); this.svc.pressDigit(e.key); }
    else if (e.key === 'Backspace')         { e.preventDefault(); this.svc.pressBackspace(); }
    else if (e.key === 'Delete')            { e.preventDefault(); this.svc.pressClear(); }
    else if (e.key === 'Enter')             { e.preventDefault(); this.svc.submitAnswer(); }
    else if (e.key === 'Escape')            { this.svc.pauseAndSave(); this.svc.currentScreen.set('home'); }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async confirmLogout(): Promise<void> {
    this.showLogoutConfirm.set(false);
    await this.svc.logout();
  }

  async onAuthSubmit(): Promise<void> {
    if (this.loginTab() === 'login') {
      await this.svc.loginWithEmail(this.loginEmail, this.loginPassword);
    } else {
      await this.svc.signupWithEmail(this.loginEmail, this.loginPassword, this.signupName);
    }
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  openFeedback(): void {
    this.feedbackText = '';
    this.feedbackEmail = '';
    this.feedbackPhone = '';
    this.showFeedbackModal.set(true);
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
      this.showFeedbackModal.set(false);
      this.feedbackText = '';
      this.toast('Feedback sent — thank you! 🙏');
    } catch {
      this.toast('Failed to send. Please try again.');
    } finally {
      this.isSendingFeedback.set(false);
    }
  }

  // ── PWA install ───────────────────────────────────────────────────────────

  async installPwa(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.pwaInstallable.set(false);
      this.deferredPrompt = null;
    }
  }

  // ── Toast helper ──────────────────────────────────────────────────────────

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  toast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.showToast.set(false), 3000);
  }

  // ── Result label ──────────────────────────────────────────────────────────

  resultLabel(): string {
    const c = this.svc.sessionCorrect();
    if (c >= 25) return 'Outstanding.';
    if (c >= 15) return 'Great Session.';
    if (c >= 8)  return 'Well Done.';
    return 'Good Effort.';
  }

  avatarColor(name: string): string {
    const colors = ['#3a6e1a','#1b5c3a','#1d4a70','#5a2e00','#1a3a6e','#3a1a6e','#6e1a1a'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  }

  badgeEmoji(b: string): string {
    return ({first_blood:'⚡',streak_10:'🔥',streak_25:'💥',speed_demon:'🚀',century:'💯'} as Record<string,string>)[b] ?? '🏅';
  }
  badgeName(b: string): string {
    return ({first_blood:'First Blood',streak_10:'Streak ×10',streak_25:'Streak ×25',speed_demon:'Speed Demon',century:'Century'} as Record<string,string>)[b] ?? b;
  }
}

// PWA type augment
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}