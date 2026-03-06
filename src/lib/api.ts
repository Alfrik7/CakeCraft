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

export interface MenuItemPayload {
  baker_id: string;
  category: MenuCategory;
  name: string;
  description?: string | null;
  photo_url?: string | null;
  price: number;
  price_type: MenuItem['price_type'];
  is_active?: boolean;
  sort_order?: number;
  tags?: string[];
}

type MenuItemPatch = Partial<Omit<MenuItemPayload, 'baker_id' | 'category'>>;

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

export async function getAdminMenuItems(bakerId: string, category: MenuCategory): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('baker_id', bakerId)
    .eq('category', category)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<MenuItemRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMenuItem);
}

export async function createMenuItem(payload: MenuItemPayload): Promise<MenuItem> {
  const insertPayload = {
    description: null,
    photo_url: null,
    is_active: true,
    sort_order: 0,
    tags: [],
    ...payload,
  };

  const { data, error } = await supabase
    .from('menu_items')
    .insert(insertPayload)
    .select('*')
    .single<MenuItemRow>();

  if (error) {
    throw error;
  }

  return mapMenuItem(data);
}

export async function updateMenuItem(id: string, bakerId: string, patch: MenuItemPatch): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .update(patch)
    .eq('id', id)
    .eq('baker_id', bakerId)
    .select('*')
    .single<MenuItemRow>();

  if (error) {
    throw error;
  }

  return mapMenuItem(data);
}

export async function setMenuItemActive(
  id: string,
  bakerId: string,
  isActive: boolean,
): Promise<MenuItem> {
  return updateMenuItem(id, bakerId, { is_active: isActive });
}

export async function deleteMenuItem(id: string, bakerId: string): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', id).eq('baker_id', bakerId);

  if (error) {
    throw error;
  }
}

export async function reorderMenuItems(
  bakerId: string,
  category: MenuCategory,
  orderedIds: string[],
): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('menu_items')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('baker_id', bakerId)
      .eq('category', category),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw failed.error;
  }
}

export async function uploadMenuPhoto(bakerId: string, file: File): Promise<string> {
  const fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
  const safeExt = fileExt && /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'jpg';
  const filePath = `menu/${bakerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error } = await supabase.storage.from('photos').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
  return data.publicUrl;
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
