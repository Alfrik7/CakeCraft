export type ContactType = 'telegram' | 'whatsapp' | 'phone';

export type DeliveryType = 'pickup' | 'delivery';

export type OrderStatus = 'new' | 'confirmed' | 'in_progress' | 'done' | 'cancelled';

export interface Order {
  id: string;
  baker_id: string;
  client_name: string;
  client_contact: string;
  client_contact_type: ContactType;
  occasion: string | null;
  shape: string | null;
  servings: number | null;
  filling_id: string | null;
  coating_id: string | null;
  decor_items: string[];
  topper_text: string | null;
  reference_photo_url: string | null;
  delivery_type: DeliveryType;
  address: string | null;
  order_date: string;
  order_time: string | null;
  comment: string | null;
  total_price: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderFormData {
  baker_id: string;
  client_name: string;
  client_contact: string;
  client_contact_type?: ContactType;
  occasion?: string | null;
  shape?: string | null;
  servings?: number | null;
  filling_id?: string | null;
  coating_id?: string | null;
  decor_items?: string[];
  topper_text?: string | null;
  reference_photo_url?: string | null;
  delivery_type?: DeliveryType;
  address?: string | null;
  order_date: string;
  order_time?: string | null;
  comment?: string | null;
  total_price: number;
}
