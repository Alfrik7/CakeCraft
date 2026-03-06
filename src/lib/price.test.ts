import { describe, expect, it } from 'vitest';
import { calculateTotal, estimateWeightKg, getItemPrice } from './price';

describe('price helpers', () => {
  it('estimateWeightKg uses minimum 1kg and scales by servings', () => {
    expect(estimateWeightKg(0)).toBe(1);
    expect(estimateWeightKg(6)).toBe(1);
    expect(estimateWeightKg(12)).toBeCloseTo(1.8);
  });

  it('getItemPrice handles fixed and per_kg items', () => {
    expect(getItemPrice(10, { price: 500, price_type: 'fixed' })).toBe(500);
    expect(getItemPrice(10, { price: 700, price_type: 'per_kg' })).toBeCloseTo(1050);
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

    // 1000 + (400 * 1.8) + 300 + (120 * 1.8) = 2236
    expect(total).toBe(2236);
  });
});
