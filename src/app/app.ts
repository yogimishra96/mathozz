import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthSessionService } from './core/auth/auth-session.service';
import { UiFeedbackService } from './core/ui/ui-feedback.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthSessionService);
  readonly ui = inject(UiFeedbackService);
  readonly flashOn = signal(false);
  readonly flashKind = signal<'success' | 'error'>('success');

  constructor() {
    effect((onCleanup) => {
      const n = this.ui.flashPulse();
      if (n === 0) {
        return;
      }
      const tone = this.ui.flashTone();
      this.flashKind.set(tone === 'error' ? 'error' : 'success');
      this.flashOn.set(true);
      const t = window.setTimeout(() => this.flashOn.set(false), 160);
      onCleanup(() => window.clearTimeout(t));
    });
  }
}
