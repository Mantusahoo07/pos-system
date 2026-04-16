export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getTimeRemaining = (startTime, prepTime = 300) => {
  const elapsed = Math.floor((Date.now() - new Date(startTime)) / 1000);
  return Math.max(0, prepTime - elapsed);
};

export const generateOrderNumber = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

export const groupOrdersByStatus = (orders) => {
  return orders.reduce((acc, order) => {
    if (!acc[order.status]) {
      acc[order.status] = [];
    }
    acc[order.status].push(order);
    return acc;
  }, {});
};

export const calculateOrderTotal = (items) => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};