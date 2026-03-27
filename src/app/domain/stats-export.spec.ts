import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from './category.types';
import { newUserStatsDoc } from './user-stats.factory';
import { buildStatsCsv } from './stats-export';

describe('stats-export', () => {
  it('buildStatsCsv includes core metrics and categories', () => {
    const doc = newUserStatsDoc();
    doc.xp = 42;
    doc.catSolved.shopping = 5;
    const csv = buildStatsCsv(doc);
    expect(csv).toContain('xp,42');
    expect(csv).toContain('cat_shopping,5');
    for (const id of CATEGORY_IDS) {
      expect(csv).toContain(`cat_${id}`);
      expect(csv).toContain(`wrong_${id}`);
    }
    expect(csv).toContain('reviewQueueLen');
  });
});
