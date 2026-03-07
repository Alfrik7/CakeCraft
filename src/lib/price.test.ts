import { describe, expect, it } from 'vitest';
import { calculateTotal, estimateWeightKg, getItemPrice } from './price';

describe('price helpers', () => {
  it('estimateWeightKg uses guest-to-weight formula', () => {
    expect(estimateWeightKg(0)).toBe(0);
    expect(estimateWeightKg(4)).toBe(0.6);
    expect(estimateWeightKg(10)).toBe(1.5);
    expect(estimateWeightKg(20)).toBe(3);
  });

  it('getItemPrice handles fixed and per_kg items', () => {
    expect(getItemPrice(10, { price: 500, price_type: 'fixed' })).toBe(500);
    expect(getItemPrice(10, { price: 700, price_type: 'per_kg' })).toBeCloseTo(1050);
  });

  it('calculateTotal matches guest-based formula', () => {
    const total = calculateTotal(10, { price: 1400, price_type: 'per_kg' }, [{ price: 800, price_type: 'fixed' }]);
    expect(total).toBe(2900);
  });
});
