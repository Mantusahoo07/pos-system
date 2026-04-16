export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return re.test(phone);
};

export const validateOrder = (order) => {
  const errors = [];
  
  if (!order.items || order.items.length === 0) {
    errors.push('Order must have at least one item');
  }
  
  if (order.total <= 0) {
    errors.push('Order total must be greater than 0');
  }
  
  if (order.orderType === 'delivery' && !order.deliveryAddress) {
    errors.push('Delivery address is required for delivery orders');
  }
  
  return errors;
};

export const validateMenuItem = (item) => {
  const errors = [];
  
  if (!item.name || item.name.trim() === '') {
    errors.push('Item name is required');
  }
  
  if (!item.price || item.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  if (!item.category) {
    errors.push('Category is required');
  }
  
  return errors;
};