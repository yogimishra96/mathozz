import { CATEGORY_IDS } from './category.types';
import type { UserStatsDoc } from './user-stats.model';

function escapeCell(v: string): string {
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function buildStatsCsv(stats: UserStatsDoc): string {
  const rows: string[][] = [
    ['metric', 'value'],
    ['xp', String(stats.xp)],
    ['totalSolved', String(stats.totalSolved)],
    ['totalCorrect', String(stats.totalCorrect)],
    ['totalWrong', String(stats.totalWrong)],
    ['todaySolved', String(stats.todaySolved)],
    ['weeklyXp', String(stats.weeklyXp)],
    ['monthlyXp', String(stats.monthlyXp)],
  ];
  for (const id of CATEGORY_IDS) {
    rows.push([`cat_${id}`, String(stats.catSolved[id] ?? 0)]);
    rows.push([`wrong_${id}`, String(stats.catWrong[id] ?? 0)]);
  }
  rows.push(['reviewQueueLen', String(stats.reviewQueue.length)]);
  return rows.map((r) => r.map(escapeCell).join(',')).join('\n');
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
