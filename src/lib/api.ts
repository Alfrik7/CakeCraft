import { supabase } from './supabase';
import type {
  Baker,
  BlockedDate,
  MenuCategory,
  MenuItem,
  Order,
  OrderFormData,
  OrderStatus,
} from '../types';

type NumericLike = number | string;

type BakerRow = Omit<Baker, 'delivery_price' | 'theme'> & {
  delivery_price: NumericLike;
  theme?: Baker['theme'] | null;
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
    delivery_price_type: row.delivery_price_type ?? 'fixed',
    delivery_price: toNumber(row.delivery_price),
    theme: row.theme ?? 'pink',
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

export interface BakerProfilePatch {
  name: string;
  logo_url?: string | null;
  notification_telegram: string | null;
  welcome_message: string;
  min_order_days: number;
  delivery_enabled: boolean;
  delivery_price_type: Baker['delivery_price_type'];
  delivery_price: number;
  theme: Baker['theme'];
  pickup_address: string | null;
  working_hours: Baker['working_hours'];
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

export async function getBakerById(bakerId: string): Promise<Baker | null> {
  const { data, error } = await supabase
    .from('bakers')
    .select('*')
    .eq('id', bakerId)
    .limit(1)
    .maybeSingle<BakerRow>();

  if (error) {
    throw error;
  }

  return data ? mapBaker(data) : null;
}

export async function updateBakerProfile(bakerId: string, patch: BakerProfilePatch): Promise<Baker> {
  const { data, error } = await supabase
    .from('bakers')
    .update(patch)
    .eq('id', bakerId)
    .select('*')
    .single<BakerRow>();

  if (error) {
    throw error;
  }

  return mapBaker(data);
}

export async function uploadBakerLogo(bakerId: string, file: File): Promise<string> {
  const fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
  const safeExt = fileExt && /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'jpg';
  const filePath = `gallery/${bakerId}/logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error } = await supabase.storage.from('photos').upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
  return data.publicUrl;
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

export interface ConstructorMenuData {
  shape: MenuItem[];
  filling: MenuItem[];
  decor: MenuItem[];
}

export async function getConstructorMenuData(bakerId: string): Promise<ConstructorMenuData> {
  const [shape, filling, decor] = await Promise.all([
    getMenuItems(bakerId, 'shape'),
    getMenuItems(bakerId, 'filling'),
    getMenuItems(bakerId, 'decor'),
  ]);

  return { shape, filling, decor };
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

interface AdminOrdersFilter {
  dateFrom?: string;
  dateTo?: string;
}

export async function getAdminOrders(
  bakerId: string,
  filters: AdminOrdersFilter = {},
): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('baker_id', bakerId)
    .order('created_at', { ascending: false });

  if (filters.dateFrom) {
    query = query.gte('order_date', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('order_date', filters.dateTo);
  }

  const { data, error } = await query.returns<OrderRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapOrder);
}

export async function setOrderStatus(
  orderId: string,
  bakerId: string,
  status: OrderStatus,
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('baker_id', bakerId)
    .select('*')
    .single<OrderRow>();

  if (error) {
    throw error;
  }

  return mapOrder(data);
}

export interface OrderDetailsPatch {
  shape?: string | null;
  filling_id?: string | null;
  servings?: number | null;
  decor_items?: string[];
  topper_text?: string | null;
  delivery_type?: Order['delivery_type'];
  address?: string | null;
  order_date?: string;
  order_time?: string | null;
  comment?: string | null;
  total_price?: number;
}

export async function updateOrderDetails(
  orderId: string,
  bakerId: string,
  patch: OrderDetailsPatch,
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .eq('baker_id', bakerId)
    .select('*')
    .single<OrderRow>();

  if (error) {
    throw error;
  }

  return mapOrder(data);
}

export async function getMenuItemsByIds(bakerId: string, itemIds: string[]): Promise<MenuItem[]> {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('baker_id', bakerId)
    .in('id', uniqueIds)
    .returns<MenuItemRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMenuItem);
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

export async function blockDate(bakerId: string, date: string): Promise<BlockedDate> {
  const { data, error } = await supabase
    .from('blocked_dates')
    .upsert(
      {
        baker_id: bakerId,
        date,
        reason: null,
      },
      { onConflict: 'baker_id,date' },
    )
    .select('*')
    .single<BlockedDate>();

  if (error) {
    throw error;
  }

  return data;
}

export async function unblockDate(bakerId: string, date: string): Promise<void> {
  const { error } = await supabase.from('blocked_dates').delete().eq('baker_id', bakerId).eq('date', date);

  if (error) {
    throw error;
  }
}
