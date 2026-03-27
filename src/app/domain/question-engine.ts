import { CATEGORY_IDS, type CategoryId } from './category.types';
import { buildHint } from './question-hint';
import type { Difficulty, ReviewQueueItem } from './user-stats.model';
import type { GeneratedQuestion, QuestionMeta } from './question.model';

const rand = (a: number, b: number): number =>
  Math.floor(Math.random() * (b - a + 1)) + a;

const fmt = (n: number): string => n.toLocaleString('en-IN');

const MAX_ANS = 9_999_999;

const SPLIT_MIN_PER_PERSON: Record<Difficulty, number> = {
  easy: 20,
  medium: 15,
  hard: 10,
};

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Pick rupee amount so (mult * pct) / 100 is an exact integer (no rounding).
 */
function pickMultExactDiscount(
  pct: number,
  minMult: number,
  maxMult: number,
): number {
  const step = 100 / gcd(pct, 100);
  const low = Math.ceil(minMult / step) * step;
  const high = Math.floor(maxMult / step) * step;
  if (low > high) {
    return Math.ceil(minMult / step) * step;
  }
  const steps = (high - low) / step;
  return low + rand(0, steps) * step;
}

type RawQ = Omit<GeneratedQuestion, 'cat'>;

function genShopping(d: Difficulty): RawQ {
  if (d === 'easy') {
    if (rand(1, 100) <= 72) {
      const a = rand(10, 49);
      const b = rand(10, 49);
      return {
        text: `₹${fmt(a)} + ₹${fmt(b)}`,
        ans: a + b,
        templateKey: `shopping:${d}:2:${a}+${b}`,
      };
    }
    const a = rand(8, 35);
    const b = rand(8, 35);
    const c = rand(8, 35);
    return {
      text: `₹${fmt(a)} + ₹${fmt(b)} + ₹${fmt(c)}`,
      ans: a + b + c,
      templateKey: `shopping:${d}:3s:${a}+${b}+${c}`,
    };
  }
  if (d === 'medium') {
    const roll = rand(1, 100);
    if (roll <= 55) {
      const a = rand(25, 99);
      const b = rand(25, 99);
      return {
        text: `₹${fmt(a)} + ₹${fmt(b)}`,
        ans: a + b,
        templateKey: `shopping:${d}:2:${a}+${b}`,
      };
    }
    if (roll <= 82) {
      const a = rand(48, 120);
      const b = rand(32, 95);
      const hi = Math.min(a + b - 28, 98);
      if (hi >= 20) {
        const c = rand(18, hi);
        return {
          text: `₹${fmt(a)} + ₹${fmt(b)} − ₹${fmt(c)}`,
          ans: a + b - c,
          templateKey: `shopping:${d}:+-:${a}+${b}-${c}`,
        };
      }
    }
    const a = rand(18, 55);
    const b = rand(18, 55);
    const c = rand(18, 55);
    return {
      text: `₹${fmt(a)} + ₹${fmt(b)} + ₹${fmt(c)}`,
      ans: a + b + c,
      templateKey: `shopping:${d}:3:${a}+${b}+${c}`,
    };
  }
  const roll = rand(1, 100);
  if (roll <= 45) {
    const a = rand(50, 999);
    const b = rand(50, 999);
    const c = rand(20, 199);
    return {
      text: `₹${fmt(a)} + ₹${fmt(b)} + ₹${fmt(c)}`,
      ans: a + b + c,
      templateKey: `shopping:${d}:3:${a}+${b}+${c}`,
    };
  }
  if (roll <= 78) {
    const a = rand(130, 480);
    const b = rand(90, 300);
    const hi = Math.min(a + b - 55, 340);
    if (hi >= 45) {
      const c = rand(40, hi);
      return {
        text: `₹${fmt(a)} + ₹${fmt(b)} − ₹${fmt(c)}`,
        ans: a + b - c,
        templateKey: `shopping:${d}:+-:${a}+${b}-${c}`,
      };
    }
  }
  const a = rand(35, 180);
  const b = rand(35, 180);
  const c = rand(35, 180);
  const e = rand(35, 180);
  return {
    text: `₹${fmt(a)} + ₹${fmt(b)} + ₹${fmt(c)} + ₹${fmt(e)}`,
    ans: a + b + c + e,
    templateKey: `shopping:${d}:4:${a}+${b}+${c}+${e}`,
  };
}

function genDiscount(d: Difficulty): RawQ {
  const pcts =
    d === 'easy'
      ? [10, 20]
      : d === 'medium'
        ? [5, 10, 15, 20]
        : [5, 10, 12, 15, 20, 25];
  const pct = pcts[rand(0, pcts.length - 1)]!;
  const [minMult, maxMult] =
    d === 'easy'
      ? [100, 2500]
      : d === 'medium'
        ? [150, 8000]
        : [200, 25_000];
  const mult = pickMultExactDiscount(pct, minMult, maxMult);
  const ans = (mult * pct) / 100;
  const roll = rand(1, 100);
  const isTip =
    roll <= 30 && [10, 12, 15].includes(pct) && d !== 'hard';
  const text = isTip
    ? `${pct}% tip on ₹${fmt(mult)}`
    : roll <= 58
      ? `${pct}% of ₹${fmt(mult)}`
      : `${pct}% off ₹${fmt(mult)} — how much saved?`;
  return {
    text,
    ans,
    templateKey: `discount:${d}:${isTip ? 'tip' : 'std'}:${pct}:${mult}`,
    meta: { discount: { mult, pct } },
  };
}

function genSplit(d: Difficulty): RawQ {
  const divs =
    d === 'easy' ? [2, 4, 5] : d === 'medium' ? [3, 4, 5, 6] : [3, 4, 5, 6, 7, 8];
  const cap = d === 'easy' ? 200 : d === 'medium' ? 600 : 1200;
  const minPer = SPLIT_MIN_PER_PERSON[d];
  const viable = divs.filter((dv) => Math.floor(cap / dv) >= minPer);
  const pool = viable.length > 0 ? viable : divs;
  const div = pool[rand(0, pool.length - 1)]!;
  const maxK = Math.floor(cap / div);
  const minK = Math.min(minPer, maxK);
  const k = rand(minK, maxK);
  const tot = k * div;
  const ans = tot / div;
  const roll = rand(1, 100);
  const text =
    roll <= 50
      ? `₹${fmt(tot)} split equally · ${div} people`
      : roll <= 80
        ? `₹${fmt(tot)} ÷ ${div} people (each pays)`
        : `Each of ${div} pays the same · total ₹${fmt(tot)}`;
  return {
    text,
    ans,
    templateKey: `split:${d}:${div}:${tot}`,
    meta: { split: { people: div, total: tot } },
  };
}

function genChange(d: Difficulty): RawQ {
  const bases =
    d === 'easy'
      ? [100, 500]
      : d === 'medium'
        ? [100, 500, 1000]
        : [500, 1000, 2000, 5000];
  const base = bases[rand(0, bases.length - 1)]!;
  if (d === 'hard' && rand(1, 100) <= 26) {
    const x = rand(80, Math.min(420, Math.floor(base * 0.22)));
    const y = rand(55, Math.min(300, Math.floor(base * 0.17)));
    const z = rand(35, Math.min(220, Math.floor(base * 0.13)));
    if (x + y + z < base - 40) {
      return {
        text: `₹${fmt(base)} − ₹${fmt(x)} − ₹${fmt(y)} − ₹${fmt(z)}`,
        ans: base - x - y - z,
        templateKey: `change:${d}:3:${base}-${x}-${y}-${z}`,
      };
    }
  }
  if (d === 'easy' || rand(1, 100) <= 48) {
    const sub = rand(10, base - 1);
    return {
      text: `₹${fmt(base)} − ₹${fmt(sub)}`,
      ans: base - sub,
      templateKey: `change:${d}:1:${base}-${sub}`,
    };
  }
  const x = rand(15, Math.floor(base * 0.35));
  const y = rand(10, Math.floor(base * 0.28));
  if (x + y >= base - 5) {
    const sub = rand(10, base - 1);
    return {
      text: `₹${fmt(base)} − ₹${fmt(sub)}`,
      ans: base - sub,
      templateKey: `change:${d}:1f:${base}-${sub}`,
    };
  }
  return {
    text: `₹${fmt(base)} − ₹${fmt(x)} − ₹${fmt(y)}`,
    ans: base - x - y,
    templateKey: `change:${d}:2:${base}-${x}-${y}`,
  };
}

function genMultiplyEasy(): RawQ {
  const a = rand(2, 5);
  const b = rand(2, 9);
  if (rand(1, 100) <= 22) {
    const price = rand(12, 48);
    const n = rand(2, 6);
    return {
      text: `${n} × ₹${fmt(price)}`,
      ans: n * price,
      templateKey: `multiply:easy:₹:${n}x${price}`,
      meta: { multiply: { a: n, b: price, money: true } },
    };
  }
  const flip = rand(0, 1) === 1;
  return {
    text: flip ? `${b} × ${a}` : `${a} × ${b}`,
    ans: a * b,
    templateKey: `multiply:easy:${a}x${b}`,
    meta: { multiply: { a, b } },
  };
}

function genMultiplyMedium(): RawQ {
  const roll = rand(1, 100);
  if (roll <= 18) {
    const n = rand(3, 9);
    const price = rand(15, 85);
    return {
      text: `${n} packs × ₹${fmt(price)}`,
      ans: n * price,
      templateKey: `multiply:medium:pack:${n}x${price}`,
      meta: { multiply: { a: n, b: price, money: true } },
    };
  }
  if (roll <= 62) {
    const a = rand(3, 12);
    const b = rand(3, 12);
    return {
      text: `${a} × ${b}`,
      ans: a * b,
      templateKey: `multiply:medium:grid:${a}x${b}`,
      meta: { multiply: { a, b } },
    };
  }
  if (roll <= 84) {
    const a = rand(11, 24);
    const b = rand(2, 9);
    return {
      text: `${a} × ${b}`,
      ans: a * b,
      templateKey: `multiply:medium:x11:${a}x${b}`,
      meta: { multiply: { a, b } },
    };
  }
  const tricks = [12, 15, 16, 25] as const;
  const t = tricks[rand(0, tricks.length - 1)]!;
  const other = rand(4, 12);
  const a = rand(0, 1) === 0 ? t : other;
  const b = a === t ? other : t;
  return {
    text: `${a} × ${b}`,
    ans: a * b,
    templateKey: `multiply:medium:trick:${a}x${b}`,
    meta: { multiply: { a, b } },
  };
}

function genMultiplyHard(): RawQ {
  const roll = rand(1, 100);
  if (roll <= 15) {
    const n = rand(8, 24);
    const price = rand(22, 180);
    return {
      text: `${n} × ₹${fmt(price)}`,
      ans: n * price,
      templateKey: `multiply:hard:₹:${n}x${price}`,
      meta: { multiply: { a: n, b: price, money: true } },
    };
  }
  if (roll <= 72) {
    const a = rand(13, 49);
    const b = rand(13, 49);
    return {
      text: `${a} × ${b}`,
      ans: a * b,
      templateKey: `multiply:hard:grid:${a}x${b}`,
      meta: { multiply: { a, b } },
    };
  }
  const t = [11, 12, 15, 25][rand(0, 3)]!;
  const other = rand(14, 44);
  const a = rand(0, 1) === 0 ? t : other;
  const b = a === t ? other : t;
  return {
    text: `${a} × ${b}`,
    ans: a * b,
    templateKey: `multiply:hard:trick:${a}x${b}`,
    meta: { multiply: { a, b } },
  };
}

function genMultiply(d: Difficulty): RawQ {
  if (d === 'easy') {
    return genMultiplyEasy();
  }
  if (d === 'medium') {
    return genMultiplyMedium();
  }
  return genMultiplyHard();
}

function genFraction(d: Difficulty): RawQ {
  const denoms =
    d === 'easy' ? [2, 4] : d === 'medium' ? [2, 3, 4, 5] : [3, 4, 5, 6, 8];
  const den = denoms[rand(0, denoms.length - 1)]!;
  const k =
    d === 'easy'
      ? rand(5, 28)
      : d === 'medium'
        ? rand(4, 44)
        : rand(6, 88);
  const total = k * den;
  const useProper =
    d !== 'easy' && den > 2 && rand(1, 100) <= (d === 'hard' ? 72 : 48);
  if (!useProper) {
    return {
      text: `1/${den} of ₹${fmt(total)}`,
      ans: k,
      templateKey: `fraction:${d}:1/${den}:${total}`,
      meta: { fractionOf: { n: 1, d: den, total } },
    };
  }
  const n = rand(1, den - 1);
  const ans = n * k;
  return {
    text: `${n}/${den} of ₹${fmt(total)}`,
    ans,
    templateKey: `fraction:${d}:${n}/${den}:${total}`,
    meta: { fractionOf: { n, d: den, total } },
  };
}

const GENS: Record<CategoryId, (difficulty: Difficulty) => RawQ> = {
  shopping: genShopping,
  discount: genDiscount,
  split: genSplit,
  change: genChange,
  multiply: genMultiply,
  fraction: genFraction,
};

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  shopping: 'Totals · Add & adjust',
  discount: 'Percent · Discount & tip',
  split: 'Split · Fair shares',
  change: 'Change · Take away',
  multiply: 'Multiply · Tables & ₹',
  fraction: 'Fractions · Part of a total',
};

export function pickNextCategory(
  exclude: CategoryId | '',
  all: readonly CategoryId[] = CATEGORY_IDS,
): CategoryId {
  const pool = exclude ? all.filter((c) => c !== exclude) : [...all];
  return pool[rand(0, pool.length - 1)]!;
}

function pickWeightedCategory(
  pool: readonly CategoryId[],
  exclude: CategoryId | '',
  weights: Partial<Record<CategoryId, number>>,
  focus: string,
): CategoryId {
  let filtered = exclude
    ? pool.filter((c) => c !== exclude)
    : [...pool];
  if (filtered.length === 0) {
    filtered = [...pool];
  }
  const focusId = focus as CategoryId;
  if (
    focus &&
    filtered.includes(focusId) &&
    rand(1, 100) <= 72
  ) {
    return focusId;
  }
  const w = filtered.map((c) => Math.max(0.35, weights[c] ?? 1));
  const sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < filtered.length; i++) {
    r -= w[i]!;
    if (r <= 0) {
      return filtered[i]!;
    }
  }
  return filtered[filtered.length - 1]!;
}

function attachHint(q: GeneratedQuestion): GeneratedQuestion {
  return { ...q, hint: buildHint(q) };
}

export interface QuestionGenerationContext {
  readonly difficulty: Difficulty;
  readonly excludeCategory: CategoryId | '';
  readonly recentTexts: readonly string[];
  readonly recentTemplateKeys: readonly string[];
  readonly smartPracticeEnabled?: boolean;
  readonly reviewProbability?: number;
  readonly reviewQueue?: readonly ReviewQueueItem[];
  readonly categoryWeights?: Partial<Record<CategoryId, number>>;
  readonly focusCategory?: string;
  readonly allowedCategories?: readonly CategoryId[];
}

export function generateQuestionWithContext(
  ctx: QuestionGenerationContext,
): GeneratedQuestion {
  const smartOn = ctx.smartPracticeEnabled !== false;
  const reviewProb = smartOn ? (ctx.reviewProbability ?? 0.34) : 0;
  const queue = ctx.reviewQueue ?? [];
  if (reviewProb > 0 && queue.length > 0 && Math.random() < reviewProb) {
    const item = queue[rand(0, queue.length - 1)]!;
    const q: GeneratedQuestion = {
      text: item.text,
      ans: item.ans,
      cat: item.cat,
      templateKey: `review:${item.templateKey}`,
      meta: item.meta,
      hint:
        item.hint ??
        buildHint({
          text: item.text,
          ans: item.ans,
          cat: item.cat,
          templateKey: item.templateKey,
          meta: item.meta,
        }),
    };
    if (validateReviewReplay(q) && !ctx.recentTexts.includes(q.text)) {
      return q;
    }
  }
  let pool = [...CATEGORY_IDS];
  if (ctx.allowedCategories?.length) {
    pool = pool.filter((c) => ctx.allowedCategories!.includes(c));
  }
  if (pool.length === 0) {
    pool = [...CATEGORY_IDS];
  }
  const weights = ctx.categoryWeights ?? {};
  let q: GeneratedQuestion;
  let attempts = 0;
  const maxAttempts = 100;
  do {
    const cat = pickWeightedCategory(
      pool,
      ctx.excludeCategory,
      weights,
      ctx.focusCategory ?? '',
    );
    const raw = GENS[cat](ctx.difficulty);
    q = attachHint({ ...raw, cat });
    const textDup = ctx.recentTexts.includes(q.text);
    const keyDup = isTemplateTooRecent(q.templateKey, ctx.recentTemplateKeys);
    const bad = !validateQuestion(q, ctx.difficulty) || textDup || keyDup;
    attempts++;
    if (!bad) {
      break;
    }
  } while (attempts < maxAttempts);
  return q;
}

function isIntegerAns(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n - Math.round(n)) < 1e-9;
}

function validateReviewReplay(q: GeneratedQuestion): boolean {
  if (!isIntegerAns(q.ans)) {
    return false;
  }
  const ans = Math.round(q.ans);
  return ans >= 0 && ans <= MAX_ANS;
}

/**
 * Validates pedagogy + numeric sanity. Uses `meta` when present for strict checks.
 */
export function validateQuestion(
  q: GeneratedQuestion,
  difficulty: Difficulty,
): boolean {
  if (!isIntegerAns(q.ans)) {
    return false;
  }
  const ans = Math.round(q.ans);
  if (ans < 0 || ans > MAX_ANS) {
    return false;
  }
  const m: QuestionMeta | undefined = q.meta;
  if (m?.split) {
    const { people, total } = m.split;
    if (people < 2 || total < people) {
      return false;
    }
    if (ans * people !== total) {
      return false;
    }
    if (total % people !== 0) {
      return false;
    }
    const per = total / people;
    if (per < SPLIT_MIN_PER_PERSON[difficulty]) {
      return false;
    }
  }
  if (m?.discount) {
    const { mult, pct } = m.discount;
    if (pct < 1 || pct > 100 || mult < 1) {
      return false;
    }
    const exact = (mult * pct) / 100;
    if (!isIntegerAns(exact) || Math.round(exact) !== ans) {
      return false;
    }
  }
  if (m?.multiply) {
    const { a, b, money } = m.multiply;
    if (a * b !== ans) {
      return false;
    }
    if (difficulty === 'easy') {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (money === true) {
        if (lo < 2 || hi > 99 || lo > 9) {
          return false;
        }
      } else if (lo < 2 || hi > 9 || lo > 5) {
        return false;
      }
    }
  }
  if (m?.fractionOf) {
    const { n: fn, d: fd, total } = m.fractionOf;
    if (fd < 2 || fn < 1 || fn >= fd) {
      return false;
    }
    if (total % fd !== 0) {
      return false;
    }
    if (fn * (total / fd) !== ans) {
      return false;
    }
  }
  return true;
}

const RECENT_KEY_WINDOW = 6;

function isTemplateTooRecent(
  key: string,
  recentTemplateKeys: readonly string[],
): boolean {
  const slice = recentTemplateKeys.slice(-RECENT_KEY_WINDOW);
  return slice.includes(key);
}

export function generateQuestion(
  difficulty: Difficulty,
  excludeCategory: CategoryId | '',
  recentTexts: readonly string[],
  recentTemplateKeys: readonly string[] = [],
): GeneratedQuestion {
  return generateQuestionWithContext({
    difficulty,
    excludeCategory,
    recentTexts,
    recentTemplateKeys,
    smartPracticeEnabled: false,
  });
}
