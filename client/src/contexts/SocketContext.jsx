import React, { createContext, useEffect, useState } from 'react';
import socketService from '../services/socket';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = socketService.connect();
    setSocket(newSocket);

    const handleConnect = () => {
      setIsConnected(true);
      console.log('Connected to Render server');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from Render server');
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      socketService.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};