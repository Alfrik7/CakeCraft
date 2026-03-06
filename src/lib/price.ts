import type { MenuItem } from '../types';

const KG_PER_SERVING = 0.15;

function normalizePrice(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function estimateWeightKg(servings: number): number {
  if (!Number.isFinite(servings) || servings <= 0) {
    return 1;
  }

  return Math.max(1, servings * KG_PER_SERVING);
}

export function getItemPrice(servings: number, item?: Pick<MenuItem, 'price' | 'price_type'> | null): number {
  if (!item) {
    return 0;
  }

  const basePrice = normalizePrice(item.price);

  if (item.price_type === 'per_kg') {
    return basePrice * estimateWeightKg(servings);
  }

  return basePrice;
}

export function calculateTotal(
  servings: number,
  filling?: Pick<MenuItem, 'price' | 'price_type'> | null,
  coating?: Pick<MenuItem, 'price' | 'price_type'> | null,
  decorItems: Array<Pick<MenuItem, 'price' | 'price_type'>> = [],
): number {
  const fillingTotal = getItemPrice(servings, filling);
  const coatingTotal = getItemPrice(servings, coating);
  const decorTotal = decorItems.reduce((sum, decorItem) => sum + getItemPrice(servings, decorItem), 0);

  return Math.round(fillingTotal + coatingTotal + decorTotal);
}
