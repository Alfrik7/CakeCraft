import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface OrderDraft {
  baker_id: string;
  client_name: string;
  client_contact: string;
  client_contact_type: 'telegram' | 'whatsapp' | 'phone';
  occasion: string | null;
  shape: string | null;
  servings: number | null;
  filling_id: string | null;
  coating_id: string | null;
  decor_items: string[];
  topper_text: string | null;
  reference_photo_url: string | null;
  delivery_type: 'pickup' | 'delivery';
  address: string | null;
  order_date: string;
  order_time: string | null;
  comment: string | null;
  total_price: number;
}

interface OrderContextValue {
  order: OrderDraft;
  setOrder: (updater: (prev: OrderDraft) => OrderDraft) => void;
  updateOrder: (patch: Partial<OrderDraft>) => void;
  resetOrder: () => void;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

function createInitialOrder(bakerId: string): OrderDraft {
  return {
    baker_id: bakerId,
    client_name: '',
    client_contact: '',
    client_contact_type: 'telegram',
    occasion: null,
    shape: null,
    servings: null,
    filling_id: null,
    coating_id: null,
    decor_items: [],
    topper_text: null,
    reference_photo_url: null,
    delivery_type: 'pickup',
    address: null,
    order_date: '',
    order_time: null,
    comment: null,
    total_price: 0,
  };
}

interface OrderProviderProps {
  bakerId: string;
  children: React.ReactNode;
}

export function OrderProvider({ bakerId, children }: OrderProviderProps) {
  const [order, setOrderState] = useState<OrderDraft>(() => createInitialOrder(bakerId));

  const setOrder: OrderContextValue['setOrder'] = (updater) => {
    setOrderState((prev) => updater(prev));
  };

  const updateOrder: OrderContextValue['updateOrder'] = (patch) => {
    setOrderState((prev) => ({
      ...prev,
      ...patch,
      baker_id: prev.baker_id,
    }));
  };

  const resetOrder: OrderContextValue['resetOrder'] = useCallback(() => {
    setOrderState(createInitialOrder(bakerId));
  }, [bakerId]);

  const value = useMemo(
    () => ({
      order,
      setOrder,
      updateOrder,
      resetOrder,
    }),
    [order, resetOrder],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrderContext(): OrderContextValue {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }

  return context;
}
