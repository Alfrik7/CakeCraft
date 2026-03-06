import { describe, expect, it } from 'vitest';
import { calculateTotal, estimateWeightKg, getItemPrice } from './price';

describe('price helpers', () => {
  it('estimateWeightKg uses explicit serving-to-weight mapping', () => {
    expect(estimateWeightKg(0)).toBe(0);
    expect(estimateWeightKg(6)).toBe(0.6);
    expect(estimateWeightKg(8)).toBe(0.8);
    expect(estimateWeightKg(12)).toBe(1.2);
    expect(estimateWeightKg(16)).toBe(1.6);
    expect(estimateWeightKg(20)).toBe(2);
  });

  it('getItemPrice handles fixed and per_kg items', () => {
    expect(getItemPrice(10, { price: 500, price_type: 'fixed' })).toBe(500);
    expect(getItemPrice(10, { price: 700, price_type: 'per_kg' })).toBeCloseTo(700);
  });

  it('calculateTotal sums filling, coating and decor with rounding', () => {
    const total = calculateTotal(
      12,
      { price: 1000, price_type: 'fixed' },
      { price: 400, price_type: 'per_kg' },
      [
        { price: 300, price_type: 'fixed' },
        { price: 120, price_type: 'per_kg' },
      ],
    );

    // 1000 + (400 * 1.2) + 300 + (120 * 1.2) = 1924
    expect(total).toBe(1924);
  });
});
