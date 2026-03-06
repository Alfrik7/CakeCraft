export type WorkingHours = Record<
  string,
  {
    from: string;
    to: string;
    enabled?: boolean;
  }
>;

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
  delivery_price: number;
  pickup_address: string | null;
  working_hours: WorkingHours | null;
  created_at: string;
  updated_at: string;
}
