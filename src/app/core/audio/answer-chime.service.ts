import { Injectable } from '@angular/core';

/**
 * Single shared AudioContext (mobile Safari requires resume after user gesture).
 */
@Injectable({ providedIn: 'root' })
export class AnswerChimeService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    const w = globalThis as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  /**
   * Resume/unlock audio pipeline (call from a click/tap handler on mobile).
   */
  async unlock(): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) {
      return;
    }
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  /**
   * Short preview when user turns sound on in settings.
   */
  async previewToggle(): Promise<void> {
    await this.playTone(660, 0.05, 90);
  }

  async playCorrect(): Promise<void> {
    await this.playTone(880, 0.055, 120);
  }

  async playWrong(): Promise<void> {
    await this.playTone(220, 0.045, 140);
  }

  private async playTone(
    frequency: number,
    peakGain: number,
    durationMs: number,
  ): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) {
      return;
    }
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const t0 = ctx.currentTime;
      const dur = durationMs / 1000;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = frequency;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch {
      /* ignore */
    }
  }
}
