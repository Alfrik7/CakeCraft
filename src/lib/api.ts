import { supabase } from './supabase';
import type { Baker, BlockedDate, MenuCategory, MenuItem, Order, OrderFormData } from '../types';

type NumericLike = number | string;

type BakerRow = Omit<Baker, 'delivery_price'> & {
  delivery_price: NumericLike;
};

type MenuItemRow = Omit<MenuItem, 'price'> & {
  price: NumericLike;
};

type OrderRow = Omit<Order, 'total_price'> & {
  total_price: NumericLike;
};

function toNumber(value: NumericLike): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function mapBaker(row: BakerRow): Baker {
  return {
    ...row,
    delivery_price: toNumber(row.delivery_price),
  };
}

function mapMenuItem(row: MenuItemRow): MenuItem {
  return {
    ...row,
    price: toNumber(row.price),
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    ...row,
    total_price: toNumber(row.total_price),
  };
}

export async function getBaker(slug: string): Promise<Baker | null> {
  const { data, error } = await supabase
    .from('bakers')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle<BakerRow>();

  if (error) {
    throw error;
  }

  return data ? mapBaker(data) : null;
}

export async function getMenuItems(bakerId: string, category: MenuCategory): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('baker_id', bakerId)
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .returns<MenuItemRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMenuItem);
}

export async function createOrder(data: OrderFormData): Promise<Order> {
  const payload = {
    ...data,
    client_contact_type: data.client_contact_type ?? 'telegram',
    delivery_type: data.delivery_type ?? 'pickup',
    decor_items: data.decor_items ?? [],
  };

  const { data: insertedOrder, error } = await supabase
    .from('orders')
    .insert(payload)
    .select('*')
    .single<OrderRow>();

  if (error) {
    throw error;
  }

  return mapOrder(insertedOrder);
}

export async function getBlockedDates(bakerId: string): Promise<BlockedDate[]> {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .eq('baker_id', bakerId)
    .order('date', { ascending: true })
    .returns<BlockedDate[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
