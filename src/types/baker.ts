export type DeliveryPriceType = 'fixed' | 'custom';
export type BakerTheme = 'pink' | 'chocolate' | 'minimal' | 'lavender' | 'mint';

export interface Baker {
  id: string;
  telegram_id: number;
  telegram_chat_id: number | null;
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string;
  min_order_days: number;
  delivery_enabled: boolean;
  delivery_price_type: DeliveryPriceType;
  delivery_price: number;
  theme: BakerTheme;
  pickup_address: string | null;
  created_at: string;
  updated_at: string;
}
