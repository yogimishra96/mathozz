import type { CategoryId } from './category.types';
import type { GeneratedQuestion } from './question.model';

/**
 * Short strategy line + optional micro-example (mental math coaching).
 */
export function buildHint(q: GeneratedQuestion): string {
  const m = q.meta;
  switch (q.cat as CategoryId) {
    case 'shopping':
      return 'Add left to right: tens first, then ones. For “+ then −”, sum the adds, then subtract.';
    case 'change':
      return 'Subtract in order left→right, or split: take away big chunks first.';
    case 'multiply':
      if (m?.multiply?.money) {
        return 'Multiply as usual; treat ₹ like a normal number. Check with rounding (e.g. 9×₹40 ≈ 360).';
      }
      return 'Use facts you know: 9×n = 10×n − n. For 11–25, break one side (12×15 = 12×10 + 12×5).';
    case 'discount':
      return 'Percent of ₹: move decimal for 10% (÷10), double for 20%, half of 10% for 5%. “Saved” = same as “X% of”.';
    case 'split':
      return 'Total ÷ people = each share. Check: each × people should equal the total.';
    case 'fraction':
      if (m?.fractionOf) {
        const { n, d, total } = m.fractionOf;
        const unit = total / d;
        return `1/${d} of ₹${total} is ₹${unit}. For ${n}/${d}, multiply that slice by ${n}.`;
      }
      return 'Divide total by denominator for one slice; multiply by numerator if needed.';
    default:
      return 'Break the problem into smaller steps you can do in your head.';
  }
}
