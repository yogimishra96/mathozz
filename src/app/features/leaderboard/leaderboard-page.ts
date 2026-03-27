import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LEADERBOARD_REPOSITORY } from '../../core/data/data.tokens';
import type { LeaderboardRepository } from '../../core/data/leaderboard.repository';
import { weekKeyUtc } from '../../domain/date-week.util';

type LbTab = 'all' | 'week';

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  templateUrl: './leaderboard-page.html',
  styleUrl: './leaderboard-page.scss',
})
export class LeaderboardPage implements OnInit {
  private readonly board = inject(LEADERBOARD_REPOSITORY) as LeaderboardRepository;
  readonly auth = inject(AuthSessionService);
  readonly i18n = inject(I18nService);

  readonly tab = signal<LbTab>('all');
  readonly rowsAll = signal<readonly { rank: number; uid: string; name: string; xp: number }[]>([]);
  readonly rowsWeek = signal<readonly { rank: number; uid: string; name: string; xp: number }[]>([]);
  readonly loadError = signal(false);
  readonly loading = signal(true);

  readonly selfUid = computed(() => this.auth.user()?.uid ?? '');

  readonly visibleRows = computed(() =>
    this.tab() === 'all' ? this.rowsAll() : this.rowsWeek(),
  );

  ngOnInit(): void {
    void this.load();
  }

  setTab(t: LbTab): void {
    this.tab.set(t);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const [all, wk] = await Promise.all([
        this.board.topByXp(100),
        this.board.topByWeeklyXp(weekKeyUtc(), 100),
      ]);
      this.rowsAll.set(
        all.map((r, i) => ({
          rank: i + 1,
          uid: r.uid,
          name: r.name,
          xp: r.xp,
        })),
      );
      this.rowsWeek.set(
        wk.map((r, i) => ({
          rank: i + 1,
          uid: r.uid,
          name: r.name,
          xp: r.weeklyXp,
        })),
      );
    } catch {
      this.loadError.set(true);
    }
    this.loading.set(false);
  }
}
