import type { CategoryId } from './category.types';

export interface QuestionMeta {
  readonly split?: { readonly people: number; readonly total: number };
  readonly discount?: { readonly mult: number; readonly pct: number };
  readonly multiply?: {
    readonly a: number;
    readonly b: number;
    /** n × ₹price (looser easy bounds than times-table grid). */
    readonly money?: boolean;
  };
  /** Proper fraction n/d of ₹total (total divisible by d). */
  readonly fractionOf?: {
    readonly n: number;
    readonly d: number;
    readonly total: number;
  };
}

export interface GeneratedQuestion {
  readonly text: string;
  readonly ans: number;
  readonly cat: CategoryId;
  /** Stable id for template diversity (not shown in UI). */
  readonly templateKey: string;
  readonly meta?: QuestionMeta;
  /** Strategy / micro-explanation for training. */
  readonly hint?: string;
}
