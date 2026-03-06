export type MenuCategory = 'shape' | 'filling' | 'coating' | 'decor';

export type PriceType = 'fixed' | 'per_kg';

export type MenuTag = 'Хит' | 'Новинка' | 'Сезонное';

export interface MenuItem {
  id: string;
  baker_id: string;
  category: MenuCategory;
  name: string;
  description: string | null;
  photo_url: string | null;
  price: number;
  price_type: PriceType;
  is_active: boolean;
  sort_order: number;
  tags: string[];
  created_at: string;
}
