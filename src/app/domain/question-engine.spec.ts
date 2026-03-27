import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS, type CategoryId } from './category.types';
import { generateQuestion, pickNextCategory } from './question-engine';

describe('question-engine', () => {
  it('pickNextCategory excludes current', () => {
    const next = pickNextCategory('shopping');
    expect(next).not.toBe('shopping');
    expect(CATEGORY_IDS).toContain(next);
  });

  it('generateQuestion returns integer answer and known category', () => {
    const q = generateQuestion('easy', '', []);
    expect(Number.isInteger(q.ans)).toBe(true);
    expect(CATEGORY_IDS).toContain(q.cat);
    expect(q.text.length).toBeGreaterThan(0);
    expect(q.templateKey.length).toBeGreaterThan(0);
  });

  it('avoids repeating same text when possible', () => {
    const first = generateQuestion('easy', 'shopping', []);
    const second = generateQuestion('easy', first.cat as CategoryId, [first.text]);
    expect(second.text).not.toBe(first.text);
  });

  it('avoids repeating same templateKey when recent list includes it', () => {
    const first = generateQuestion('easy', '', []);
    const second = generateQuestion('easy', '', [], [first.templateKey]);
    expect(second.templateKey).not.toBe(first.templateKey);
  });
});
