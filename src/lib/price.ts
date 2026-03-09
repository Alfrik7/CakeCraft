import type { MenuItem } from '../types';

function normalizePrice(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function estimateWeightKg(guests: number): number {
  if (!Number.isFinite(guests) || guests <= 0) {
    return 0;
  }

  return Number((guests * 0.125).toFixed(3));
}

export function getItemPrice(guests: number, item?: Pick<MenuItem, 'price' | 'price_type'> | null): number {
  if (!item) {
    return 0;
  }

  const basePrice = normalizePrice(item.price);

  if (item.price_type === 'per_kg') {
    return basePrice * estimateWeightKg(guests);
  }

  return basePrice;
}

export function calculateTotal(
  guests: number,
  filling?: Pick<MenuItem, 'price' | 'price_type'> | null,
  decorItems: Array<Pick<MenuItem, 'price' | 'price_type'>> = [],
  deliveryPrice = 0,
): number {
  const fillingTotal = getItemPrice(guests, filling);
  const decorTotal = decorItems.reduce((sum, decorItem) => sum + getItemPrice(guests, decorItem), 0);
  const normalizedDeliveryPrice = Number.isFinite(deliveryPrice) ? deliveryPrice : 0;

  return Math.round(fillingTotal + decorTotal + normalizedDeliveryPrice);
}
