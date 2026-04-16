import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import InstallPrompt from './components/Common/InstallPrompt';
import SplashScreen from './components/Common/SplashScreen';
import { io } from 'socket.io-client';
// import { Toaster, toast } from 'react-hot-toast'; // REMOVED - Toast notifications disabled
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import BottomBar from './components/Layout/BottomBar';
import POS from './components/POS/POS';
import KitchenDisplay from './components/Kitchen/KitchenDisplay';
import Settings from './components/Settings/Settings';
import OrderManagement from './components/Orders/OrderManagement';
import Reports from './components/Reports/Reports';
import Login from './components/Auth/Login';
import ErrorBoundary from './components/ErrorBoundary';
import ReceiptViewer from './components/Common/ReceiptViewer';
import CancellationNotification from './components/Common/CancellationNotification';
import notificationService from './services/notificationService';
import './styles/global.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://server-uvyi.onrender.com';

// Audio Manager for notification sounds - ONLY for Kitchen Display
class AudioManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.7;
    this.audioContext = null;
    this.lastPlayedTime = {};
    this.playCooldown = 2000;
    this.init();
  }

  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }

  loadSound(name, url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => {
        this.sounds[name] = audio;
        resolve(audio);
      });
      audio.addEventListener('error', reject);
      audio.load();
    });
  }

  play(name, options = {}) {
    if (!this.enabled) return null;
    
    const now = Date.now();
    if (this.lastPlayedTime[name] && (now - this.lastPlayedTime[name]) < this.playCooldown) {
      console.log(`Sound ${name} skipped due to cooldown`);
      return null;
    }
    
    const sound = this.sounds[name];
    if (sound) {
      const audio = sound.cloneNode();
      audio.volume = options.volume !== undefined ? options.volume : this.volume;
      audio.loop = options.loop || false;
      
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      audio.play().catch(err => {
        console.log('Audio play failed:', err);
        this.playBeep();
      });
      
      this.lastPlayedTime[name] = now;
      return audio;
    } else {
      this.playBeep();
    }
    return null;
  }

  playBeep(frequency = 880, duration = 300) {
    if (!this.audioContext) return;
    
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), duration);
    } catch (e) {
      console.log('Beep failed:', e);
    }
  }

  stop(name) {
    const sound = this.sounds[name];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  preloadAllSounds() {
    const soundsToLoad = [
      { name: 'new-order', url: '/sounds/new-order.mp3' },
      { name: 'new-dine-in', url: '/sounds/new-dine-in.mp3' },
      { name: 'new-delivery', url: '/sounds/new-delivery.mp3' },
      { name: 'new-zomato', url: '/sounds/new-zomato.mp3' },
      { name: 'new-swiggy', url: '/sounds/new-swiggy.mp3' },
      { name: 'new-takeaway', url: '/sounds/new-takeaway.mp3' },
      { name: 'order-ready', url: '/sounds/order-ready.mp3' },
      { name: 'cancellation-request', url: '/sounds/cancellation-request.mp3' },
      { name: 'instant-order', url: '/sounds/instant-order.mp3' },
      { name: 'payment-received', url: '/sounds/payment-received.mp3' }
    ];
    
    soundsToLoad.forEach(async ({ name, url }) => {
      try {
        await this.loadSound(name, url);
        console.log(`Loaded sound: ${name}`);
      } catch (error) {
        console.log(`Failed to load sound: ${name}`, error);
      }
    });
  }
}

const audioManager = new AudioManager();

// Enhanced Offline Service with better sync
class EnhancedOfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingOrders = [];
    this.pendingCart = null;
    this.syncInProgress = false;
    this.listeners = [];
    this.syncRetryCount = 0;
    this.maxRetries = 5;
    
    this.loadPendingOrders();
    this.loadPendingCart();
    
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    setInterval(() => {
      if (this.isOnline && this.hasPendingData()) {
        this.syncAll();
      }
    }, 30000);
  }

  hasPendingData() {
    return this.pendingOrders.length > 0 || this.pendingCart !== null;
  }

  loadPendingOrders() {
    try {
      const saved = localStorage.getItem('pendingOrders');
      if (saved) {
        this.pendingOrders = JSON.parse(saved);
        console.log('Loaded pending orders:', this.pendingOrders.length);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
  }

  loadPendingCart() {
    try {
      const saved = localStorage.getItem('pendingCart');
      if (saved) {
        this.pendingCart = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading pending cart:', error);
    }
  }

  savePendingOrders() {
    try {
      localStorage.setItem('pendingOrders', JSON.stringify(this.pendingOrders));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving pending orders:', error);
    }
  }

  savePendingCart() {
    try {
      if (this.pendingCart) {
        localStorage.setItem('pendingCart', JSON.stringify(this.pendingCart));
      } else {
        localStorage.removeItem('pendingCart');
      }
    } catch (error) {
      console.error('Error saving pending cart:', error);
    }
  }

  handleOnline() {
    console.log('🟢 Back online - Starting sync...');
    this.isOnline = true;
    this.syncRetryCount = 0;
    this.syncAll();
    this.notifyListeners();
    console.log('Back online! Syncing data...');
  }

  handleOffline() {
    console.log('🔴 Offline - Will store data locally');
    this.isOnline = false;
    this.notifyListeners();
    console.log('You are offline. Changes will be saved locally.');
  }

  async syncAll() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      await this.syncPendingOrders();
      await this.syncPendingCart();
      console.log('✅ Sync completed');
      if (this.pendingOrders.length === 0 && !this.pendingCart) {
        console.log('All data synced successfully!');
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Sync error:', error);
      this.syncRetryCount++;
      if (this.syncRetryCount < this.maxRetries) {
        setTimeout(() => this.syncAll(), 5000 * this.syncRetryCount);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncPendingOrders() {
    if (this.pendingOrders.length === 0) return;

    console.log(`Syncing ${this.pendingOrders.length} pending orders...`);
    
    const token = localStorage.getItem('token');
    const failed = [];

    for (const order of this.pendingOrders) {
      try {
        const response = await fetch(`${API_URL}/orders`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(order.data)
        });
        
        if (response.ok) {
          console.log(`✅ Synced order #${order.orderNumber}`);
        } else {
          failed.push(order);
        }
      } catch (error) {
        console.error(`Failed to sync order #${order.orderNumber}:`, error);
        failed.push(order);
      }
    }

    this.pendingOrders = failed;
    this.savePendingOrders();
  }

  async syncPendingCart() {
    if (!this.pendingCart) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/cart/${this.pendingCart.sessionId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(this.pendingCart.data)
      });
      
      if (response.ok) {
        console.log('✅ Synced cart');
        this.pendingCart = null;
        this.savePendingCart();
      }
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  }

  storeOrderOffline(orderData) {
    const pendingOrder = {
      id: Date.now(),
      orderNumber: orderData.orderNumber,
      data: orderData,
      timestamp: new Date().toISOString()
    };
    
    this.pendingOrders.push(pendingOrder);
    this.savePendingOrders();
    console.log(`Order #${orderData.orderNumber} saved locally. Will sync when online.`);
    return pendingOrder;
  }

  storeCartOffline(sessionId, cartData) {
    this.pendingCart = {
      sessionId,
      data: cartData,
      timestamp: new Date().toISOString()
    };
    this.savePendingCart();
  }

  getPendingOrders() {
    return this.pendingOrders;
  }

  getPendingCart() {
    return this.pendingCart;
  }

  get isConnected() {
    return this.isOnline;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  clearAll() {
    this.pendingOrders = [];
    this.pendingCart = null;
    this.savePendingOrders();
    this.savePendingCart();
  }
}

const offlineService = new EnhancedOfflineService();

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

function AppContent() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('pos');
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [syncPendingCount, setSyncPendingCount] = useState(0);
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const [notificationPromptShown, setNotificationPromptShown] = useState(false);
  
  const socketInitialized = useRef(false);
  const reconnectTimeout = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await notificationService.init();
        setNotificationsInitialized(true);
        console.log('Push notifications initialized');
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };
    initNotifications();
  }, []);

  // Check and subscribe to notifications after login
  useEffect(() => {
    const checkAndSubscribeNotifications = async () => {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (isAuthenticated && userData.role === 'kitchen') {
        console.log('🔔 Kitchen user detected, checking notification subscription status...');
        
        try {
          await notificationService.init();
          const isSubscribed = await notificationService.checkSubscription();
          
          console.log('📢 Current subscription status:', isSubscribed);
          
          if (!isSubscribed && !notificationPromptShown) {
            setNotificationPromptShown(true);
            
            setTimeout(async () => {
              const confirmSubscribe = window.confirm(
                '🔔 Enable Push Notifications?\n\n' +
                'Get real-time alerts for:\n' +
                '• New orders (Dine-in, Takeaway, Delivery)\n' +
                '• Order modifications\n' +
                '• Instant order requests\n' +
                '• Kitchen requests\n\n' +
                'Click OK to enable notifications.'
              );
              
              if (confirmSubscribe) {
                console.log('📝 User confirmed, requesting notification permission...');
                const success = await notificationService.ensureSubscription();
                if (success) {
                  console.log('✅ Notifications enabled successfully');
                  
                  setTimeout(() => {
                    notificationService.showLocalNotification('🔔 Notifications Enabled', {
                      body: 'You will now receive real-time order updates!',
                      icon: '/icon-192.png',
                      tag: 'welcome',
                      vibrate: [200, 100, 200]
                    });
                  }, 1000);
                } else {
                  console.log('❌ Failed to enable notifications');
                }
              } else {
                console.log('❌ User declined notifications');
              }
            }, 2000);
          } else if (isSubscribed) {
            console.log('✅ User already subscribed to notifications');
          }
        } catch (error) {
          console.error('Error checking notification subscription:', error);
        }
      }
    };
    
    if (isAuthenticated) {
      checkAndSubscribeNotifications();
    }
  }, [isAuthenticated, notificationPromptShown]);

  // Preload sounds on mount
  useEffect(() => {
    audioManager.preloadAllSounds();
    setSoundsLoaded(true);
  }, []);

  // Play notification sound based on order type - ONLY for kitchen
  const playNotificationSound = useCallback((order) => {
    // Only play sound if user is kitchen
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role !== 'kitchen') {
      console.log('🔇 Sound disabled - only kitchen staff receive audio alerts');
      return;
    }
    
    if (!soundsLoaded) return;
    
    let soundName = 'new-order';
    let volume = 0.7;
    
    if (order.orderType === 'dine-in') {
      soundName = 'new-dine-in';
      volume = 0.8;
    } else if (order.orderType === 'delivery') {
      if (order.deliveryPlatform === 'zomato') {
        soundName = 'new-zomato';
        volume = 0.9;
      } else if (order.deliveryPlatform === 'swiggy') {
        soundName = 'new-swiggy';
        volume = 0.9;
      } else {
        soundName = 'new-delivery';
        volume = 0.7;
      }
    } else if (order.orderType === 'takeaway') {
      soundName = 'new-takeaway';
      volume = 0.7;
    }
    
    audioManager.play(soundName, { volume });
  }, [soundsLoaded]);

  useEffect(() => {
    const updateSyncCount = () => {
      setSyncPendingCount(offlineService.getPendingOrders().length);
    };
    
    offlineService.addListener(updateSyncCount);
    updateSyncCount();
    
    return () => offlineService.removeListener(updateSyncCount);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
        console.log('User authenticated:', userData.username, 'Role:', userData.role);
      } catch (error) {
        console.error('Error parsing user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const getAvailableTabs = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        { id: 'pos', label: 'POS', icon: '🛒', path: '/pos' },
        { id: 'kitchen', label: 'Kitchen', icon: '👨‍🍳', path: '/kitchen' },
        { id: 'orders', label: 'Orders', icon: '📋', path: '/orders' },
        { id: 'reports', label: 'Reports', icon: '📊', path: '/reports' },
        { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' }
      ];
    }
    
    const tabs = [];
    if (user.permissions?.canAccessPOS) tabs.push({ id: 'pos', label: 'POS', icon: '🛒', path: '/pos' });
    if (user.permissions?.canAccessKitchen) tabs.push({ id: 'kitchen', label: 'Kitchen', icon: '👨‍🍳', path: '/kitchen' });
    if (user.permissions?.canAccessOrders) tabs.push({ id: 'orders', label: 'Orders', icon: '📋', path: '/orders' });
    if (user.permissions?.canAccessReports) tabs.push({ id: 'reports', label: 'Reports', icon: '📊', path: '/reports' });
    if (user.permissions?.canAccessSettings) tabs.push({ id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' });
    
    return tabs;
  };

  const availableTabs = getAvailableTabs();

  useEffect(() => {
    if (isAuthenticated && activeTab) {
      navigate(`/${activeTab}`, { replace: true });
    }
  }, [activeTab, isAuthenticated, navigate]);

  useEffect(() => {
    const handlePopState = () => {
      const path = location.pathname.slice(1);
      if (path && availableTabs.some(tab => tab.id === path)) {
        setActiveTab(path);
      } else if (availableTabs.length > 0) {
        setActiveTab(availableTabs[0].id);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location, availableTabs]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [user, availableTabs, activeTab]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const connectSocket = useCallback(() => {
    if (!isAuthenticated) return;
    if (socketInitialized.current && socket) return;
    
    socketInitialized.current = true;
    
    console.log('Connecting to socket:', SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 20000,
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
      setReconnectAttempts(0);
      console.log('Connected to server');
      
      const heartbeat = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('ping');
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);
      
      newSocket.on('pong', () => {
        console.log('Heartbeat received');
      });
    });
    
    newSocket.on('connected', (data) => {
      console.log('Server confirmation:', data);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      setConnected(false);
      setReconnectAttempts(prev => prev + 1);
      
      if (reconnectAttempts > 3) {
        console.log(`Connection issues. Retrying... (${reconnectAttempts})`);
      }
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected, reason:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          if (newSocket) newSocket.connect();
        }, 1000);
      }
      
      console.log('Disconnected from server. Reconnecting...');
    });
    
    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      console.log('Reconnected to server');
    });
    
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
    });
    
    newSocket.on('reconnect_error', (err) => {
      console.error('Socket reconnection error:', err);
    });
    
    newSocket.on('new-order-received', (order) => {
      console.log('📦 New order received via socket:', order);
      playNotificationSound(order);
      console.log(`New Order #${order.orderNumber}!`);
      fetchOrders();
    });
    
    newSocket.on('order-updated', (updatedOrder) => {
      console.log('📝 Order updated:', updatedOrder);
      setOrders(prev => prev.map(order => 
        order._id === updatedOrder._id ? updatedOrder : order
      ));
    });
    
    newSocket.on('order-accepted', (orderId) => {
      console.log('✅ Order accepted:', orderId);
      console.log('Order has been accepted by kitchen');
      fetchOrders();
    });
    
    newSocket.on('order-ready-for-billing', (orderId) => {
      console.log('💰 Order ready for billing:', orderId);
      // Only play sound for kitchen users
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'kitchen') {
        audioManager.play('order-ready', { volume: 0.5 });
      }
      console.log('Order ready for billing!');
      fetchOrders();
    });
    
    newSocket.on('order-completed', (orderId) => {
      console.log('🎉 Order completed:', orderId);
      // Only play sound for kitchen users
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'kitchen') {
        audioManager.play('payment-received', { volume: 0.5 });
      }
      console.log('Order completed!');
      fetchOrders();
    });
    
    newSocket.on('order-item-added', ({ orderId, item }) => {
      console.log('➕ Item added to order:', orderId, item);
      fetchOrders();
    });
    
    newSocket.on('order-item-removed', ({ orderId, itemId }) => {
      console.log('➖ Item removed from order:', orderId, itemId);
      fetchOrders();
    });
    
    newSocket.on('order-item-quantity-updated', ({ orderId, itemId, oldQuantity, newQuantity }) => {
      console.log('📊 Item quantity updated:', { orderId, itemId, oldQuantity, newQuantity });
      fetchOrders();
    });
    
    newSocket.on('cancellation-requested', (request) => {
      console.log('❌ Cancellation requested:', request);
      // Only play sound for kitchen users
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'kitchen') {
        audioManager.play('cancellation-request', { volume: 0.6 });
      }
    });
    
    newSocket.on('instant-order-request', (data) => {
      console.log('⚡ Instant order request:', data);
      // Only play sound for kitchen users
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'kitchen') {
        audioManager.play('instant-order', { volume: 0.8, loop: false });
      }
      console.log(`⚡ INSTANT ORDER REQUIRED for Order ${data.orderNumber}!`);
    });
    
    newSocket.on('order-modified', (data) => {
      console.log('✏️ Order modified:', data);
      // Only play sound for kitchen users
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'kitchen') {
        audioManager.play('order-modified', { volume: 0.5 });
      }
      fetchOrders();
    });
    
    newSocket.on('order-cancelled', (data) => {
      console.log('❌ Order cancelled:', data);
      // Only play sound for kitchen users
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.role === 'kitchen') {
        audioManager.play('order-cancelled', { volume: 0.5 });
      }
      fetchOrders();
    });
    
    setSocket(newSocket);
    window.socket = newSocket;
    
    return () => {
      clearTimeout(reconnectTimeout.current);
      if (newSocket) newSocket.close();
      socketInitialized.current = false;
      window.socket = null;
    };
  }, [isAuthenticated, reconnectAttempts, soundsLoaded, orders, playNotificationSound]);
  
  useEffect(() => {
    connectSocket();
  }, [connectSocket]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchMenu();
      fetchCategories();
      fetchOrders();
    }
  }, [isAuthenticated]);
  
  const fetchMenu = async () => {
    try {
      setLoading(true);
      console.log('Fetching menu from:', `${API_URL}/menu`);
      const response = await fetch(`${API_URL}/menu`, {
        headers: getAuthHeaders()
      });
      console.log('Menu response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setMenu(data || []);
        console.log('Menu loaded:', data?.length || 0, 'items');
      } else if (response.status === 401) {
        console.error('Authentication failed - redirecting to login');
        handleLogout();
      } else {
        console.error('Failed to fetch menu:', response.status);
        setError('Failed to load menu');
        setMenu([]);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setError(error.message);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories?showInMenu=true`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
        console.log('Categories loaded:', data?.length || 0, 'categories');
      } else if (response.status === 401) {
        console.error('Authentication failed for categories');
      } else {
        console.error('Failed to fetch categories:', response.status);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };
  
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Orders loaded:', data.length, 'orders');
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };
  
  const handleSync = async () => {
    if (offlineService.syncInProgress) {
      console.log('Sync already in progress...');
      return;
    }
    
    console.log('Syncing pending data...');
    await offlineService.syncAll();
    setSyncPendingCount(offlineService.getPendingOrders().length);
    console.log('Sync completed!');
  };
  
  const placeOrder = async (orderData) => {
    try {
      console.log('Placing order:', orderData);
      
      if (orderData.orderType === 'dine-in' && orderData.tableNumber) {
        try {
          const existingOrdersResponse = await fetch(`${API_URL}/orders/table/${orderData.tableNumber}/active`, {
            headers: getAuthHeaders()
          });
          
          if (existingOrdersResponse.ok) {
            const existingOrdersList = await existingOrdersResponse.json();
            if (existingOrdersList && existingOrdersList.length > 0) {
              orderData.isAdditionalOrder = true;
              orderData.parentOrderId = existingOrdersList[0]._id;
              orderData.tableSessionId = existingOrdersList[0].tableSessionId;
              console.log('Creating additional order for existing table session:', orderData.tableSessionId);
            }
          }
        } catch (err) {
          console.error('Error checking existing orders:', err);
        }
      }
      
      if (!offlineService.isConnected) {
        const savedOrder = offlineService.storeOrderOffline(orderData);
        setSyncPendingCount(offlineService.getPendingOrders().length);
        console.log(`Order #${orderData.orderNumber} saved offline!`);
        return savedOrder;
      }
      
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const savedOrder = await response.json();
        console.log('✅ Order saved to backend:', savedOrder);
        
        setOrders(prev => [savedOrder, ...prev]);
        
        if (socket && connected) {
          socket.emit('new-order', savedOrder);
          console.log('📡 Order emitted via socket');
        }
        
        // Only play sound for kitchen users
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.role === 'kitchen') {
          audioManager.play('new-order', { volume: 0.5 });
        }
        console.log(`Order #${savedOrder.orderNumber} placed!`);
        return savedOrder;
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        
        if (response.status === 401) {
          console.error('Session expired. Please login again.');
          handleLogout();
        } else if (response.status === 429) {
          console.error('Too many requests. Please wait a moment.');
        } else {
          console.error(errorData.error || 'Failed to save order');
        }
        throw new Error(errorData.error || 'Failed to save order');
      }
    } catch (error) {
      console.error('❌ Error placing order:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        const savedOrder = offlineService.storeOrderOffline(orderData);
        setSyncPendingCount(offlineService.getPendingOrders().length);
        console.log(`Order #${orderData.orderNumber} saved offline!`);
        return savedOrder;
      }
      
      console.error('Failed to place order. Please try again.');
      throw error;
    }
  };
  
  const updateOrderStatus = async (orderId, status) => {
    try {
      console.log(`Updating order ${orderId} to status: ${status}`);
      
      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(order => 
          order._id === orderId ? updatedOrder : order
        ));
        
        if (socket && connected) {
          if (status === 'accepted') socket.emit('accept-order', orderId);
          if (status === 'ready_for_billing') socket.emit('order-ready-for-billing', orderId);
          if (status === 'completed') socket.emit('complete-order', orderId);
          socket.emit('order-updated', updatedOrder);
        }
        
        console.log(`Order #${updatedOrder.orderNumber} ${status === 'ready_for_billing' ? 'ready for billing' : status}`);
        return updatedOrder;
      } else {
        const error = await response.json();
        
        if (response.status === 401) {
          console.error('Session expired. Please login again.');
          handleLogout();
        } else {
          console.error(error.error || 'Failed to update order status');
        }
        throw new Error(error.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      console.error('Failed to update order status');
      throw error;
    }
  };
  
  const completeOrderPayment = async (orderId, paymentDetails) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/complete-payment`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: paymentDetails.method,
          paymentDetails: {
            amount: paymentDetails.amount,
            paidAt: new Date(),
            transactionId: paymentDetails.transactionId || `TXN_${Date.now()}`,
            ...paymentDetails
          },
          status: 'completed',
          completedAt: new Date()
        })
      });
      
      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(order => 
          order._id === orderId ? updatedOrder : order
        ));
        
        if (socket && connected) {
          socket.emit('order-completed', orderId);
          socket.emit('order-updated', updatedOrder);
        }
        
        // Only play sound for kitchen users
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.role === 'kitchen') {
          audioManager.play('payment-received', { volume: 0.5 });
        }
        console.log(`Payment completed for Order #${updatedOrder.orderNumber}!`);
        return updatedOrder;
      } else {
        const error = await response.json();
        
        if (response.status === 401) {
          console.error('Session expired. Please login again.');
          handleLogout();
        } else {
          console.error(error.error || 'Failed to process payment');
        }
        throw new Error(error.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      console.error('Failed to process payment');
      throw error;
    }
  };
  
  const updateItemStatus = async (orderId, itemId, status) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(order => 
          order._id === orderId ? updatedOrder : order
        ));
        
        if (socket && connected) {
          socket.emit('update-item-status', { orderId, itemId, status });
        }
        
        return updatedOrder;
      } else {
        const error = await response.json();
        
        if (response.status === 401) {
          console.error('Session expired. Please login again.');
          handleLogout();
        }
        throw new Error(error.error || 'Failed to update item status');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };
  
  const addItemToOrder = async (orderId, item) => {
    try {
      console.log('Adding item to order:', orderId, item);
      
      const currentOrder = orders.find(o => o._id === orderId);
      let existingItem = null;
      
      if (currentOrder) {
        existingItem = currentOrder.items.find(i => i.id === item.id);
      }
      
      let itemData;
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + (item.quantity || 1);
        itemData = {
          id: item.id || item._id,
          name: item.fullName || item.name,
          quantity: newQuantity,
          price: item.price,
          specialInstructions: item.specialInstructions || existingItem.specialInstructions || '',
          status: existingItem.status,
          isModified: true,
          modifiedAt: new Date(),
          oldQuantity: existingItem.quantity,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categorySortOrder: item.categorySortOrder || 999
        };
        
        const response = await fetch(`${API_URL}/orders/${orderId}/items/${existingItem.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ quantity: newQuantity })
        });
        
        if (response.ok) {
          const updatedOrder = await response.json();
          setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
          console.log(`Updated ${item.name} quantity to ${newQuantity}`);
          
          if (socket && connected) {
            socket.emit('order-updated', updatedOrder);
            socket.emit('order-item-quantity-updated', { orderId, itemId: item.id, oldQuantity: existingItem.quantity, newQuantity });
          }
          return updatedOrder;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update item quantity');
        }
      } else {
        itemData = {
          id: item.id || item._id,
          name: item.fullName || item.name,
          quantity: item.quantity || 1,
          price: item.price,
          specialInstructions: item.specialInstructions || '',
          status: 'pending',
          isModified: true,
          modifiedAt: new Date(),
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categorySortOrder: item.categorySortOrder || 999
        };
        
        const response = await fetch(`${API_URL}/orders/${orderId}/items`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ item: itemData })
        });
        
        if (response.ok) {
          const updatedOrder = await response.json();
          setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
          console.log(`Added ${item.name} to order`);
          
          if (socket && connected) {
            socket.emit('order-item-added', { orderId, item });
          }
          
          return updatedOrder;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add item');
        }
      }
    } catch (error) {
      console.error('Error adding item:', error);
      console.error(error.message || 'Failed to add item');
      throw error;
    }
  };
  
  const removeItemFromOrder = async (orderId, itemId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
        console.log('Item removed from order');
        
        if (socket && connected) {
          socket.emit('order-item-removed', { orderId, itemId });
        }
        
        return updatedOrder;
      } else {
        const error = await response.json();
        
        if (response.status === 401) {
          console.error('Session expired. Please login again.');
          handleLogout();
        } else {
          console.error(error.error || 'Failed to remove item');
        }
        throw new Error(error.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      console.error('Failed to remove item');
      throw error;
    }
  };
  
  const updateItemQuantity = async (orderId, itemId, quantity) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity })
      });
      
      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
        return updatedOrder;
      } else {
        const error = await response.json();
        
        if (response.status === 401) {
          console.error('Session expired. Please login again.');
          handleLogout();
        } else {
          console.error(error.error || 'Failed to update quantity');
        }
        throw new Error(error.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      console.error('Failed to update quantity');
      throw error;
    }
  };
  
  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setActiveTab('pos');
    setNotificationPromptShown(false);
    setTimeout(() => {
      fetchMenu();
      fetchCategories();
      fetchOrders();
    }, 100);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setNotificationPromptShown(false);
    if (socket) {
      socket.disconnect();
    }
    socketInitialized.current = false;
    setSocket(null);
    window.socket = null;
    console.log('Logged out');
    navigate('/login');
  };
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  const handleSettingsUpdate = (newSettings) => {
    fetchMenu();
    fetchCategories();
    if (newSettings) {
      console.log('Settings updated:', newSettings);
    }
  };
  
  const renderContent = () => {
    if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
    }
    
    if (error && loading === false && menu.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
          <h3>⚠️ Error Loading Menu</h3>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>{error}</p>
          <button 
            onClick={() => fetchMenu()} 
            style={{ marginTop: '16px', padding: '6px 16px', background: '#4361ee', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    
    switch(activeTab) {
      case 'pos':
        return <POS 
          menu={menu}
          categories={categories}
          onPlaceOrder={placeOrder} 
          loading={loading} 
          existingOrders={orders}
          onCompletePayment={completeOrderPayment}
        />;
      case 'kitchen':
        return <KitchenDisplay 
          orders={orders} 
          onUpdateOrderStatus={updateOrderStatus}
          onUpdateItemStatus={updateItemStatus}
          socket={socket} 
        />;
      case 'orders':
        return <OrderManagement 
          orders={orders}
          menu={menu}
          categories={categories}
          onAddItem={addItemToOrder}
          onRemoveItem={removeItemFromOrder}
          onUpdateQuantity={updateItemQuantity}
          onCompletePayment={completeOrderPayment}
          socket={socket}
        />;
      case 'reports':
        return <Reports 
          orders={orders} 
          menu={menu}
          categories={categories}
        />;
      case 'settings':
        return <Settings 
          menu={menu}
          categories={categories}
          onSettingsUpdate={handleSettingsUpdate}
          user={user}
        />;
      default:
        return <POS 
          menu={menu}
          categories={categories}
          onPlaceOrder={placeOrder} 
          loading={loading}
          existingOrders={orders}
          onCompletePayment={completeOrderPayment}
        />;
    }
  };
  
  return (
    <div className="app-container">
      {/* Toaster component removed - no toast notifications */}
      
      <CancellationNotification 
        socket={socket} 
        user={user} 
        onRequestProcessed={() => {
          fetchOrders();
        }}
      />
      
      {isAuthenticated && (
        <>
          <Sidebar 
            isOpen={sidebarOpen} 
            toggleSidebar={toggleSidebar} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            availableTabs={availableTabs}
            isMobile={isMobile} 
          />
          <div className={`main-content ${!sidebarOpen && !isMobile ? 'expanded' : ''}`}>
            <TopBar 
              toggleSidebar={toggleSidebar} 
              connected={connected} 
              user={user} 
              onLogout={handleLogout}
              pendingSyncCount={syncPendingCount}
              isOnline={offlineService.isConnected}
              onSync={handleSync}
              isSyncing={offlineService.syncInProgress}
            />
            <div className="content-area fade-in">
              {renderContent()}
            </div>
          </div>
          {isMobile && <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} availableTabs={availableTabs} />}
        </>
      )}
      {!isAuthenticated && renderContent()}
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <Routes>
          <Route path="/receipt/:receiptId" element={<ReceiptViewer />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
        <InstallPrompt />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;