import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://server-uvyi.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = Infinity;
    this.keepAliveInterval = null;
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      pingTimeout: 60000,
      pingInterval: 25000,
      // Keep connection alive even when tab is inactive
      autoConnect: true,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected to Render server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startKeepAlive();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason);
      this.isConnected = false;
      this.stopKeepAlive();
      
      // Attempt to reconnect if disconnected by server
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          if (this.socket) {
            this.socket.connect();
          }
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
    });

    // Handle ping/pong for connection health
    this.socket.on('pong', () => {
      // Connection is alive
    });

    return this.socket;
  }

  startKeepAlive() {
    if (this.keepAliveInterval) return;
    
    // Send periodic ping to keep connection alive
    this.keepAliveInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, 20000); // Send ping every 20 seconds
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  disconnect() {
    this.stopKeepAlive();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, unable to emit:', event);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Force reconnection
  reconnect() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
  }
}

export default new SocketService();