export type WorkingHours = Record<
  string,
  {
    from: string;
    to: string;
    enabled?: boolean;
  }
>;

export type DeliveryPriceType = 'fixed' | 'custom';
export type BakerTheme = 'pink' | 'chocolate' | 'minimal' | 'lavender' | 'mint';

export interface Baker {
  id: string;
  telegram_id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  email: string | null;
  welcome_message: string;
  min_order_days: number;
  delivery_enabled: boolean;
  delivery_price_type: DeliveryPriceType;
  delivery_price: number;
  theme: BakerTheme;
  pickup_address: string | null;
  working_hours: WorkingHours | null;
  created_at: string;
  updated_at: string;
}
