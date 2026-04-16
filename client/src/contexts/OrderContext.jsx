import React, { createContext, useState, useEffect, useContext } from 'react';
import { SocketContext } from './SocketContext';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    socket.on('initial-data', (data) => {
      setOrders(data.orders);
    });

    socket.on('order-received', (order) => {
      setOrders(prev => [order, ...prev]);
    });

    socket.on('order-updated', (updatedOrder) => {
      setOrders(prev => prev.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ));
    });

    return () => {
      socket.off('initial-data');
      socket.off('order-received');
      socket.off('order-updated');
    };
  }, [socket]);

  const addOrder = (order) => {
    // Local addition, will be synced via socket
    setOrders(prev => [order, ...prev]);
  };

  const updateOrder = (orderId, updates) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, ...updates } : order
    ));
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder }}>
      {children}
    </OrderContext.Provider>
  );
};