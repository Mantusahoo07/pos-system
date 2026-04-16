export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const ITEM_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  COMPLETED: 'completed'
};

export const TIMER_CONFIG = {
  DEFAULT_PREP_TIME: 300, // 5 minutes in seconds
  WARNING_THRESHOLD: 60, // 1 minute warning
  URGENT_THRESHOLD: 30 // 30 seconds urgent
};

export const SOUNDS = {
  NEW_ORDER: 'new-order',
  ORDER_ACCEPTED: 'order-accepted',
  TIMER_WARNING: 'timer-warning',
  TIMER_EXPIRED: 'timer-expired',
  OUT_OF_STOCK: 'out-of-stock',
  ORDER_PLACED: 'order-placed',
  ITEM_COMPLETED: 'item-completed'
};

export const VIBRATION_PATTERNS = {
  NEW_ORDER: [500, 200, 500],
  ORDER_ACCEPTED: [200],
  TIMER_WARNING: [1000],
  URGENT: [500, 500, 500]
};