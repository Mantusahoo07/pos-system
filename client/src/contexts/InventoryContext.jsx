import React, { createContext, useState, useEffect, useContext } from 'react';
import { SocketContext } from './SocketContext';

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    socket.on('initial-data', (data) => {
      setMenuItems(data.menu);
      setOutOfStockItems(data.outOfStock);
    });

    socket.on('item-out-of-stock', (itemId) => {
      setOutOfStockItems(prev => [...prev, itemId]);
      setMenuItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, available: false } : item
      ));
    });

    socket.on('item-in-stock', (itemId) => {
      setOutOfStockItems(prev => prev.filter(id => id !== itemId));
      setMenuItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, available: true } : item
      ));
    });

    return () => {
      socket.off('initial-data');
      socket.off('item-out-of-stock');
      socket.off('item-in-stock');
    };
  }, [socket]);

  const updateStock = (itemId, isOutOfStock) => {
    if (isOutOfStock) {
      socket.emit('mark-out-of-stock', itemId);
    } else {
      socket.emit('mark-in-stock', itemId);
    }
  };

  return (
    <InventoryContext.Provider value={{ menuItems, outOfStockItems, updateStock }}>
      {children}
    </InventoryContext.Provider>
  );
};