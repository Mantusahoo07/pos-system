import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FiPlus, FiMinus, FiTrash2, FiShoppingCart, FiX, FiGrid, FiList, FiUser, FiMapPin, FiTruck, FiPackage, FiShoppingBag, FiUsers, FiLayers, FiClock, FiArrowUp } from 'react-icons/fi';
// import toast from 'react-hot-toast';  // REMOVED - toast notifications disabled for POS
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://server-uvyi.onrender.com';

// Color Scheme
const COLORS = {
  primary: '#573CFA',
  secondary: '#FB8D1A',
  danger: '#E8083E',
  success: '#02864A',
  neutral: '#1C1A27',
  neutralLight: '#2D2A3F',
  neutralDark: '#12111A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  border: '#2D2A3F',
  bgCard: '#1E1C2D',
  bgHover: '#2D2A3F'
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

function POS({ menu, categories: propCategories, onPlaceOrder, loading, existingOrders = [] }) {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [specialInstructions, setSpecialInstructions] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(true);
  const [batchItems, setBatchItems] = useState([]);
  const [batchSortMode, setBatchSortMode] = useState('sequence');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [kitchenCategories, setKitchenCategories] = useState([]);
  
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);
  const menuContainerRef = useRef(null);
  const categorySortOrderMap = useRef(new Map());
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const fetchIntervalRef = useRef(null);
  const isManuallyReconnectingRef = useRef(false);
  
  const [settings, setSettings] = useState({
    taxRate: 0,
    serviceCharge: 0
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedDeliveryPlatform, setSelectedDeliveryPlatform] = useState(null);

  // Fetch kitchen categories for sorting
  const fetchKitchenCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/categories?showInKitchen=true`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setKitchenCategories(data);
        const map = new Map();
        data.forEach(cat => {
          map.set(cat._id, cat.sortOrder !== undefined ? cat.sortOrder : 999);
        });
        map.set('uncategorized', 999);
        categorySortOrderMap.current = map;
      }
    } catch (error) {
      console.error('Error fetching kitchen categories:', error);
    }
  }, []);

  // Sort items by category
  const sortItemsByCategory = useCallback((items) => {
    return [...items].sort((a, b) => {
      let sortA = a.categorySortOrder !== undefined && a.categorySortOrder !== null ? a.categorySortOrder : 999;
      let sortB = b.categorySortOrder !== undefined && b.categorySortOrder !== null ? b.categorySortOrder : 999;
      
      if (a.categoryId && categorySortOrderMap.current.has(a.categoryId)) {
        sortA = categorySortOrderMap.current.get(a.categoryId);
      }
      if (b.categoryId && categorySortOrderMap.current.has(b.categoryId)) {
        sortB = categorySortOrderMap.current.get(b.categoryId);
      }
      
      if (sortA !== sortB) {
        return sortA - sortB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, []);

  // Sort items by time
  const sortItemsByTime = useCallback((items) => {
    return [...items].sort((a, b) => {
      const timeA = a.maxWaitTime || 0;
      const timeB = b.maxWaitTime || 0;
      return timeB - timeA;
    });
  }, []);

  // Fetch batch items
  const fetchBatchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const orders = await response.json();
        const activeOrders = orders.filter(o => 
          o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing'
        );
        
        const itemMap = new Map();
        
        activeOrders.forEach(order => {
          const elapsedSeconds = Math.floor((Date.now() - new Date(order.createdAt)) / 1000);
          
          order.items.forEach(item => {
            if (item.status !== 'completed' && !item.isRemoved && item.status !== 'cancelled' && item.status !== 'cancellation_requested') {
              const key = `${item.id || item.name}`;
              
              if (!itemMap.has(key)) {
                const menuItem = menu.find(m => (m._id === item.id || m.id === item.id));
                itemMap.set(key, {
                  id: item.id,
                  name: item.name?.replace(/[^\w\s]/g, '').trim() || item.name,
                  quantity: 0,
                  orders: [],
                  categoryId: item.categoryId,
                  categoryName: item.categoryName?.replace(/[^\w\s]/g, '').trim() || '',
                  categorySortOrder: item.categorySortOrder,
                  price: menuItem?.price || item.price || 0,
                  prepTime: menuItem?.prepTime || 10,
                  available: true,
                  maxWaitTime: 0
                });
              }
              
              const batchItem = itemMap.get(key);
              batchItem.quantity += item.quantity;
              batchItem.maxWaitTime = Math.max(batchItem.maxWaitTime, elapsedSeconds);
              
              if (!batchItem.orders.find(o => o.orderId === order._id)) {
                batchItem.orders.push({
                  orderId: order._id,
                  orderNumber: order.displayOrderNumber || order.orderNumber,
                  quantity: item.quantity,
                  waitTime: elapsedSeconds
                });
              }
            }
          });
        });
        
        const batchItemsArray = Array.from(itemMap.values());
        
        let sortedBatchItems;
        if (batchSortMode === 'time') {
          sortedBatchItems = sortItemsByTime(batchItemsArray);
        } else {
          sortedBatchItems = sortItemsByCategory(batchItemsArray);
        }
        
        setBatchItems(sortedBatchItems);
      }
    } catch (error) {
      console.error('Error fetching batch items:', error);
    }
  }, [menu, sortItemsByCategory, sortItemsByTime, batchSortMode]);

  // Setup persistent socket connection with aggressive reconnection
  const setupSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting socket:', e);
      }
      socketRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    console.log('Setting up persistent socket connection...');

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      randomizationFactor: 0.3,
      timeout: 10000,
      pingTimeout: 30000,
      pingInterval: 10000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true
    });

    newSocket.on('connect', () => {
      console.log('✅ POS Socket connected successfully');
      setIsConnected(true);
      isManuallyReconnectingRef.current = false;
      newSocket.emit('join-room', 'pos');
      newSocket.emit('sync-request', { timestamp: Date.now() });
      fetchBatchItems();
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setIsConnected(false);
      if (error.message.includes('xhr poll error')) {
        console.log('Polling error, will retry...');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected, reason:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          if (newSocket && !newSocket.connected) {
            console.log('Manual reconnect after server disconnect');
            newSocket.connect();
          }
        }, 100);
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      isManuallyReconnectingRef.current = false;
      fetchBatchItems();
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
      setIsConnected(false);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed, scheduling manual retry');
      if (!isManuallyReconnectingRef.current) {
        isManuallyReconnectingRef.current = true;
        reconnectTimerRef.current = setTimeout(() => {
          console.log('Manual reconnection attempt...');
          if (newSocket && !newSocket.connected) {
            newSocket.connect();
          }
          isManuallyReconnectingRef.current = false;
        }, 2000);
      }
    });

    newSocket.on('pong', (data) => {});

    const refreshBatch = () => {
      fetchBatchItems();
    };

    newSocket.on('new-order-received', refreshBatch);
    newSocket.on('order-updated', refreshBatch);
    newSocket.on('item-status-updated', refreshBatch);
    newSocket.on('order-accepted', refreshBatch);
    newSocket.on('order-completed', refreshBatch);
    newSocket.on('cancellation-approved', refreshBatch);
    newSocket.on('order-item-added', refreshBatch);
    newSocket.on('order-item-removed', refreshBatch);
    newSocket.on('order-item-quantity-updated', refreshBatch);
    newSocket.on('table-status-changed', refreshBatch);

    heartbeatIntervalRef.current = setInterval(() => {
      if (newSocket && newSocket.connected) {
        newSocket.emit('ping', { timestamp: Date.now() });
      }
    }, 15000);

    socketRef.current = newSocket;
    setSocket(newSocket);

    return newSocket;
  }, [fetchBatchItems]);

  useEffect(() => {
    setupSocket();
    
    fetchIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        fetchBatchItems();
      }
    }, 10000);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      if (socketRef.current) {
        try {
          socketRef.current.emit('leave-room', 'pos');
          socketRef.current.disconnect();
        } catch (e) {
          console.error('Error disconnecting socket:', e);
        }
        socketRef.current = null;
      }
    };
  }, [setupSocket, fetchBatchItems, isConnected]);

  const loadCart = useCallback(async () => {
    try {
      setCartLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, using empty cart');
        setCart([]);
        setSpecialInstructions({});
        setCartLoading(false);
        return;
      }
      
      console.log('Loading cart for user...');
      const response = await fetch(`${API_URL}/cart`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const savedCart = await response.json();
        console.log('Cart loaded:', savedCart);
        if (savedCart && savedCart.items) {
          setCart(savedCart.items);
          setSpecialInstructions(savedCart.specialInstructions || {});
        } else {
          setCart([]);
          setSpecialInstructions({});
        }
      } else if (response.status === 401) {
        console.log('Not authenticated, using empty cart');
        setCart([]);
        setSpecialInstructions({});
      } else {
        console.error('Failed to load cart:', response.status);
        setCart([]);
        setSpecialInstructions({});
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setCart([]);
      setSpecialInstructions({});
    } finally {
      setCartLoading(false);
    }
  }, []);

  const saveCartToBackend = useCallback(async () => {
    if (cartLoading) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const cartData = {
      items: cart,
      specialInstructions
    };
    
    try {
      await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cartData)
      });
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, [cart, specialInstructions, cartLoading]);

  const addToCart = async (item) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Please login to add items to cart');
      return;
    }
    
    const itemData = {
      id: item.id,
      name: item.name,
      fullName: item.fullName || item.name,
      price: item.price,
      quantity: 1,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categorySortOrder: item.categorySortOrder || 0,
      prepTime: item.prepTime || 10
    };
    
    console.log('Adding item to cart:', itemData);
    
    try {
      const response = await fetch(`${API_URL}/cart/items`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ item: itemData })
      });
      
      if (response.ok) {
        const updatedCart = await response.json();
        console.log('Cart updated:', updatedCart);
        setCart(updatedCart.items);
        setSpecialInstructions(updatedCart.specialInstructions || {});
        console.log(`Added ${item.name}`);
      } else {
        const errorText = await response.text();
        console.error('Failed to add item:', response.status, errorText);
        console.error('Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      console.error('Failed to add item');
    }
  };

  const updateCartQuantity = async (id, delta) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const item = cart.find(item => item.id === id);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        await removeItem(id);
      } else {
        try {
          const response = await fetch(`${API_URL}/cart/items/${id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity: newQuantity })
          });
          
          if (response.ok) {
            const updatedCart = await response.json();
            setCart(updatedCart.items);
          } else {
            throw new Error('Failed to update quantity');
          }
        } catch (error) {
          console.error('Error updating quantity:', error);
          console.error('Failed to update quantity');
        }
      }
    } else {
      const menuItem = menuItems.find(m => m.id === id);
      if (menuItem) {
        await addToCart(menuItem);
      }
    }
  };

  const removeItem = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/cart/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.ok) {
        const updatedCart = await response.json();
        setCart(updatedCart.items);
        console.log('Removed from cart');
      } else {
        throw new Error('Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      console.error('Failed to remove item');
    }
  };

  const clearCartAfterOrder = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      await fetch(`${API_URL}/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      setCart([]);
      setSpecialInstructions({});
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const updateInstructions = (id, instructions) => {
    setSpecialInstructions(prev => ({ ...prev, [id]: instructions }));
  };

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    if (!cartLoading && localStorage.getItem('token')) {
      const timer = setTimeout(() => {
        saveCartToBackend();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cart, specialInstructions, cartLoading, saveCartToBackend]);

  useEffect(() => {
    fetchCategories();
    fetchTables();
    fetchSettings();
    fetchKitchenCategories();
    fetchBatchItems();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch(`${API_URL}/categories?showInMenu=true`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const cleanedData = data.map(cat => ({
          ...cat,
          name: cat.name.replace(/[^\w\s]/g, '').trim(),
          icon: ''
        }));
        setCategories(cleanedData);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      setTablesLoading(true);
      const response = await fetch(`${API_URL}/tables`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setTables(data);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setTablesLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch(`${API_URL}/settings`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const menuItems = useMemo(() => {
    if (!Array.isArray(menu) || menu.length === 0) return [];

    const items = menu.map(item => {
      const categoryInfo = categories.find(c => c._id === item.category);
      
      return {
        id: item._id || item.id,
        name: item.name?.replace(/[^\w\s]/g, '').trim() || item.name,
        fullName: item.name?.replace(/[^\w\s]/g, '').trim() || item.name,
        price: item.price,
        categoryId: item.category,
        categoryName: categoryInfo?.name?.replace(/[^\w\s]/g, '').trim() || 'Uncategorized',
        categoryIcon: '',
        categoryBgColor: categoryInfo?.bgColor || '#95a5a6',
        categorySortOrder: categoryInfo?.sortOrder || 999,
        available: item.available !== false,
        prepTime: item.prepTime || 10
      };
    });
    
    return sortItemsByCategory(items);
  }, [menu, categories, sortItemsByCategory]);

  const categoriesWithCounts = useMemo(() => {
    const batchItemsCount = batchItems.length;
    const categoriesList = [
      { 
        id: 'batch', 
        name: 'Batch Items', 
        icon: '', 
        count: batchItemsCount, 
        bgColor: COLORS.primary, 
        sortOrder: -2,
        isBatch: true 
      },
      { 
        id: 'all', 
        name: 'All Items', 
        icon: '', 
        count: menuItems.length, 
        bgColor: COLORS.primary, 
        sortOrder: -1,
        isBatch: false 
      }
    ];
    
    const categoryMap = new Map();
    
    categories.forEach(cat => {
      if (cat.showInMenu !== false) {
        const cleanName = cat.name.replace(/[^\w\s]/g, '').trim();
        categoryMap.set(cat._id, {
          id: cat._id,
          name: cleanName,
          icon: '',
          bgColor: cat.bgColor || '#95a5a6',
          sortOrder: cat.sortOrder || 0,
          count: 0,
          isBatch: false
        });
      }
    });
    
    menuItems.forEach(item => {
      if (item.categoryId && categoryMap.has(item.categoryId)) {
        categoryMap.get(item.categoryId).count++;
      }
    });
    
    const sortedCategories = Array.from(categoryMap.values())
      .filter(cat => cat.count > 0)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    return [...categoriesList, ...sortedCategories];
  }, [categories, menuItems, batchItems]);

  const filteredItems = useMemo(() => {
    let items;
    if (selectedCategory === 'batch') {
      items = batchItems;
    } else if (selectedCategory === 'all') {
      items = menuItems;
    } else {
      items = menuItems.filter(item => item.categoryId === selectedCategory);
    }
    
    if (selectedCategory !== 'batch' && searchTerm) {
      items = items.filter(item => 
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return items;
  }, [menuItems, selectedCategory, searchTerm, batchItems]);

  const getCartQuantity = (itemId) => {
    const cartItem = cart.find(c => c.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateTax = () => calculateSubtotal() * (settings.taxRate / 100);
  const calculateServiceCharge = () => calculateSubtotal() * (settings.serviceCharge / 100);
  const calculateTotal = () => calculateSubtotal() + calculateTax() + calculateServiceCharge();

  // Cart display subtotal (without tax) - used for cart item prices
  const getCartItemTotal = (item) => item.price * item.quantity;

  const handlePlaceOrderClick = () => {
    if (cart.length === 0) {
      console.error('Cart is empty');
      return;
    }
    setShowOrderTypeModal(true);
  };

  const handleOrderTypeSelect = (type) => {
    setShowOrderTypeModal(false);
    
    if (type === 'dine-in') {
      setShowTableModal(true);
    } else if (type === 'takeaway') {
      submitOrder('takeaway', null);
    } else if (type === 'delivery') {
      setSelectedDeliveryPlatform(null);
      setShowDeliveryModal(true);
    }
  };

  const handleTableSelect = async (table) => {
    setShowTableModal(false);
    await submitOrder('dine-in', table);
  };

  const handleDeliverySelect = (platform) => {
    setShowDeliveryModal(false);
    submitOrder('delivery', null, platform);
  };

  const submitOrder = async (type, table = null, deliveryPlatformParam = null) => {
    const now = Date.now();
    if (isSubmittingRef.current) {
      console.log('⚠️ Order already in progress, ignoring duplicate call');
      return;
    }
    
    if (now - lastSubmitTimeRef.current < 3000) {
      console.log('⚠️ Too soon after last order, ignoring');
      return;
    }
    
    if (cart.length === 0) {
      console.error('Cart is empty');
      return;
    }
    
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    
    const currentCart = [...cart];
    const currentInstructions = { ...specialInstructions };
    
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const serviceCharge = calculateServiceCharge();
    const total = calculateTotal();
    
    let orderType = type;
    let tableNumber = null;
    let deliveryPlatformVal = null;
    let isAdditionalOrder = false;
    let tableSessionId = null;
    
    if (type === 'dine-in' && table) {
      tableNumber = table.tableNumber;
      
      try {
        const tableResponse = await fetch(`${API_URL}/tables/${table.tableNumber}`, {
          headers: getAuthHeaders()
        });
        if (tableResponse.ok) {
          const freshTable = await tableResponse.json();
          if (freshTable.runningOrderCount > 0 && freshTable.currentSessionId) {
            isAdditionalOrder = true;
            tableSessionId = freshTable.currentSessionId;
          }
        }
      } catch (err) {
        console.error('Error checking table status:', err);
      }
    } else if (type === 'delivery') {
      deliveryPlatformVal = deliveryPlatformParam || selectedDeliveryPlatform;
      
      if (!deliveryPlatformVal) {
        console.error('Please select a delivery option');
        isSubmittingRef.current = false;
        return;
      }
    }
    
    const orderData = {
      items: currentCart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categorySortOrder: item.categorySortOrder || 999,
        specialInstructions: currentInstructions[item.id] || '',
        status: 'pending'
      })),
      subtotal,
      tax,
      serviceCharge,
      total,
      orderType,
      tableNumber,
      deliveryPlatform: deliveryPlatformVal,
      isAdditionalOrder,
      tableSessionId,
      taxRate: settings.taxRate,
      serviceChargeRate: settings.serviceCharge,
      customer: {
        name: 'Walk-In'
      }
    };
    
    try {
      const savedOrder = await onPlaceOrder(orderData);
      
      if (savedOrder) {
        console.log(`Order #${savedOrder.displayOrderNumber || savedOrder.orderNumber} placed!`);
        
        await clearCartAfterOrder();
        
        setSelectedDeliveryPlatform(null);
        setIsCartOpen(false);
        
        fetchTables();
        fetchBatchItems();
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      console.error('Failed to place order. Please try again.');
    } finally {
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const allTables = tables;

  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      const cleanedCategories = propCategories.map(cat => ({
        ...cat,
        name: cat.name?.replace(/[^\w\s]/g, '').trim() || cat.name,
        icon: ''
      }));
      setCategories(cleanedCategories);
      setCategoriesLoading(false);
    }
  }, [propCategories]);

  useEffect(() => {
    if (batchItems.length > 0) {
      let sortedItems;
      if (batchSortMode === 'time') {
        sortedItems = sortItemsByTime(batchItems);
      } else {
        sortedItems = sortItemsByCategory(batchItems);
      }
      setBatchItems(sortedItems);
    }
  }, [batchSortMode, sortItemsByTime, sortItemsByCategory]);

  if (loading || categoriesLoading || tablesLoading || settingsLoading || cartLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: COLORS.textSecondary }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      gap: 0, 
      maxWidth: '100%', 
      overflow: 'hidden', 
      alignItems: 'flex-start', 
      position: 'relative', 
      height: 'calc(100vh - 56px)',
      margin: 0,
      padding: 0,
      background: COLORS.neutralDark
    }}>
      
      {/* Sticky Categories Sidebar */}
      <div style={{
        width: '130px',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${COLORS.neutral} 0%, ${COLORS.neutral} 100%)`,
        borderRadius: 0,
        padding: '10px 8px',
        boxShadow: 'none',
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0
        }}>
          <h3 style={{ fontSize: '10px', fontWeight: '600', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            Categories
          </h3>
          {isConnected ? (
            <span style={{ fontSize: '8px', color: COLORS.success, background: 'rgba(2,134,74,0.2)', padding: '2px 6px', borderRadius: '10px' }}>● Live</span>
          ) : (
            <span style={{ fontSize: '8px', color: COLORS.secondary, background: 'rgba(251,141,26,0.2)', padding: '2px 6px', borderRadius: '10px' }}>○ Sync</span>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {categoriesWithCounts.length > 0 ? (
            categoriesWithCounts.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 8px',
                  marginBottom: '6px',
                  background: selectedCategory === cat.id ? cat.bgColor || COLORS.primary : 'rgba(255,255,255,0.05)',
                  color: selectedCategory === cat.id ? COLORS.textPrimary : 'rgba(255,255,255,0.8)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: selectedCategory === cat.id ? '600' : '400',
                  transition: 'all 0.2s ease',
                  minHeight: '40px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  {cat.isBatch && <FiLayers size={11} style={{ flexShrink: 0 }} />}
                  <span style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65px' }}>
                    {cat.name}
                  </span>
                </span>
                <span style={{
                  background: selectedCategory === cat.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  padding: '2px 5px',
                  borderRadius: '10px',
                  fontSize: '9px',
                  minWidth: '22px',
                  textAlign: 'center'
                }}>
                  {cat.count}
                </span>
              </button>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
              No categories
            </div>
          )}
        </div>
      </div>
      
      {/* Items Area */}
      <div style={{
        flex: 1,
        minWidth: 0,
        background: COLORS.bgCard,
        borderRadius: 0,
        padding: '12px',
        boxShadow: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Search and Controls */}
        {selectedCategory !== 'batch' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'center',
            flexShrink: 0,
            paddingBottom: '8px',
            borderBottom: `1px solid ${COLORS.border}`
          }}>
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '8px 12px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                fontSize: '12px',
                outline: 'none',
                minHeight: '38px',
                background: COLORS.neutralLight,
                color: COLORS.textPrimary
              }}
            />
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: COLORS.neutralLight, borderRadius: '8px', padding: '3px' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '6px 10px',
                    background: viewMode === 'grid' ? COLORS.primary : 'transparent',
                    color: viewMode === 'grid' ? COLORS.textPrimary : COLORS.textSecondary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    minWidth: '34px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FiGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '6px 10px',
                    background: viewMode === 'list' ? COLORS.primary : 'transparent',
                    color: viewMode === 'list' ? COLORS.textPrimary : COLORS.textSecondary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    minWidth: '34px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FiList size={14} />
                </button>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                style={{
                  background: COLORS.primary,
                  color: COLORS.textPrimary,
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '38px'
                }}
              >
                <FiShoppingCart size={14} />
                Cart {cartItemCount > 0 && <span style={{ background: COLORS.textPrimary, color: COLORS.primary, padding: '2px 7px', borderRadius: '20px', marginLeft: '4px', fontSize: '10px' }}>{cartItemCount}</span>}
              </button>
            </div>
          </div>
        )}

        {selectedCategory === 'batch' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            alignItems: 'center',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: '8px',
            paddingBottom: '8px',
            borderBottom: `1px solid ${COLORS.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.textPrimary }}>
                Batch Items - Currently being prepared
              </span>
              {isConnected ? (
                <span style={{ fontSize: '8px', color: COLORS.success, background: '#dcfce7', padding: '2px 8px', borderRadius: '20px' }}>● Live</span>
              ) : (
                <span style={{ fontSize: '8px', color: COLORS.secondary, background: '#fef3c7', padding: '2px 8px', borderRadius: '20px' }}>○ Polling</span>
              )}
              
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: COLORS.neutralLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    color: COLORS.textSecondary
                  }}
                >
                  <FiArrowUp size={10} />
                  Sort: {batchSortMode === 'time' ? 'Time' : 'Sequence'}
                </button>
                {showSortMenu && (
                  <>
                    <div onClick={() => setShowSortMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1999 }} />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      background: COLORS.bgCard,
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      zIndex: 2000,
                      minWidth: '140px',
                      overflow: 'hidden',
                      border: `1px solid ${COLORS.border}`
                    }}>
                      <button
                        onClick={() => {
                          setBatchSortMode('time');
                          setShowSortMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: batchSortMode === 'time' ? COLORS.primary : 'transparent',
                          color: batchSortMode === 'time' ? COLORS.textPrimary : COLORS.textSecondary,
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FiClock size={10} /> Time (High to Low)
                      </button>
                      <button
                        onClick={() => {
                          setBatchSortMode('sequence');
                          setShowSortMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: batchSortMode === 'sequence' ? COLORS.primary : 'transparent',
                          color: batchSortMode === 'sequence' ? COLORS.textPrimary : COLORS.textSecondary,
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FiLayers size={10} /> Sequence (by Category)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              style={{
                background: COLORS.primary,
                color: COLORS.textPrimary,
                border: 'none',
                padding: '6px 12px',
                borderRadius: '30px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                minHeight: '34px'
              }}
            >
              <FiShoppingCart size={12} />
              Cart {cartItemCount > 0 && `(${cartItemCount})`}
            </button>
          </div>
        )}
        
        {/* Category Title */}
        <div style={{ marginBottom: '8px', paddingTop: '0', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.textPrimary, background: COLORS.neutralLight, padding: '3px 10px', borderRadius: '16px' }}>
            {selectedCategory === 'all' ? 'All Items' : 
             selectedCategory === 'batch' ? 'Batch Items' : 
             categoriesWithCounts.find(c => c.id === selectedCategory)?.name || 'Items'}
            <span style={{ fontSize: '10px', color: COLORS.textMuted, marginLeft: '6px' }}>({filteredItems.length})</span>
          </span>
        </div>
        
        {/* Items Grid/List */}
        <div 
          ref={menuContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '4px',
            minHeight: 0
          }}
        >
          {selectedCategory === 'batch' && filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted, fontSize: '11px' }}>
              <FiLayers size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
              No items currently in batch.
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '10px'
            }}>
              {filteredItems.map(item => {
                const cartQuantity = getCartQuantity(item.id);
                const isInCart = cartQuantity > 0;
                
                return (
                  <div 
                    key={item.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: selectedCategory === 'batch' ? `1.5px solid ${COLORS.primary}` : `1px solid ${isInCart ? COLORS.primary : COLORS.border}`,
                      borderRadius: '10px',
                      padding: '8px',
                      background: isInCart ? COLORS.primary + '10' : (selectedCategory === 'batch' ? COLORS.primary + '10' : COLORS.bgCard),
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                      <h3 style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        marginBottom: '2px',
                        color: COLORS.textPrimary,
                        lineHeight: '1.3',
                        minHeight: '26px',
                        overflow: 'hidden'
                      }}>
                        {item.name}
                      </h3>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: COLORS.success
                      }}>
                        ₹{item.price}
                      </p>
                    </div>
                    
                    {isInCart ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '3px',
                        marginTop: '4px'
                      }}>
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            background: COLORS.danger,
                            color: COLORS.textPrimary,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '9px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '28px'
                          }}
                        >
                          <FiMinus size={10} />
                        </button>
                        <span style={{
                          minWidth: '25px',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: COLORS.textPrimary
                        }}>
                          {cartQuantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            background: COLORS.success,
                            color: COLORS.textPrimary,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '9px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '28px'
                          }}
                        >
                          <FiPlus size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.available}
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: item.available ? COLORS.primary : COLORS.textMuted,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: item.available ? 'pointer' : 'not-allowed',
                          fontSize: '9px',
                          fontWeight: '500',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          minHeight: '30px'
                        }}
                      >
                        <FiPlus size={10} /> Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {filteredItems.map(item => {
                const cartQuantity = getCartQuantity(item.id);
                const isInCart = cartQuantity > 0;
                
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      border: selectedCategory === 'batch' ? `1.5px solid ${COLORS.primary}` : `1px solid ${isInCart ? COLORS.primary : COLORS.border}`,
                      borderRadius: '8px',
                      background: isInCart ? COLORS.primary + '10' : (selectedCategory === 'batch' ? COLORS.primary + '10' : COLORS.bgCard),
                      gap: '8px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textPrimary }}>{item.name}</div>
                    </div>
                    <div style={{ marginRight: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.success }}>₹{item.price}</span>
                    </div>
                    
                    {isInCart ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0
                      }}>
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            background: COLORS.danger,
                            color: COLORS.textPrimary,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FiMinus size={10} />
                        </button>
                        <span style={{
                          minWidth: '22px',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: COLORS.textPrimary
                        }}>
                          {cartQuantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            background: COLORS.success,
                            color: COLORS.textPrimary,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FiPlus size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.available}
                        style={{
                          padding: '5px 12px',
                          background: item.available ? COLORS.primary : COLORS.textMuted,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: item.available ? 'pointer' : 'not-allowed',
                          fontSize: '9px',
                          fontWeight: '500',
                          flexShrink: 0,
                          minHeight: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FiPlus size={10} /> Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {filteredItems.length === 0 && selectedCategory !== 'batch' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted, fontSize: '11px' }}>
              <FiPackage size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
              No items found
            </div>
          )}
        </div>
      </div>

{/* Cart Drawer */}
{isCartOpen && (
  <>
    <div
      onClick={() => setIsCartOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000
      }}
    />
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 'min(380px, 85%)',
      background: COLORS.bgCard,
      zIndex: 1001,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-2px 0 12px rgba(0,0,0,0.3)',
      borderLeft: `1px solid ${COLORS.border}`
    }}>
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: COLORS.neutral
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiShoppingCart size={18} color={COLORS.primary} />
          <h2 style={{ fontSize: '15px', margin: 0, color: COLORS.textPrimary }}>Cart</h2>
          {cartItemCount > 0 && (
            <span style={{
              background: COLORS.primary,
              color: COLORS.textPrimary,
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '10px'
            }}>
              {cartItemCount} items
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCartOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '6px', color: COLORS.textSecondary }}
        >
          <FiX />
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: COLORS.textMuted }}>
            <FiShoppingCart size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
            <p style={{ fontSize: '12px' }}>Cart is empty</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong style={{ fontSize: '12px', color: COLORS.textPrimary }}>{item.name}</strong>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.success }}>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
                <button
                  onClick={() => updateCartQuantity(item.id, -1)}
                  style={{ width: '28px', height: '28px', background: COLORS.neutralLight, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textPrimary }}
                >-</button>
                <span style={{ minWidth: '25px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: COLORS.textPrimary }}>{item.quantity}</span>
                <button
                  onClick={() => updateCartQuantity(item.id, 1)}
                  style={{ width: '28px', height: '28px', background: COLORS.neutralLight, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textPrimary }}
                >+</button>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer', fontSize: '10px', padding: '6px' }}
                >
                  Remove
                </button>
              </div>
              <textarea
                placeholder="Special instructions..."
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '6px',
                  fontSize: '10px',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '6px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  background: COLORS.neutralLight,
                  color: COLORS.textPrimary
                }}
                value={specialInstructions[item.id] || ''}
                onChange={(e) => updateInstructions(item.id, e.target.value)}
                rows="2"
              />
            </div>
          ))
        )}
      </div>
      
      {cart.length > 0 && (
        <div style={{ padding: '16px', borderTop: `1px solid ${COLORS.border}`, background: COLORS.neutral }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: COLORS.textPrimary }}>
              <span>Total</span>
              <span style={{ color: COLORS.success }}>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handlePlaceOrderClick}
            style={{
              width: '100%',
              padding: '10px',
              background: COLORS.secondary,
              color: COLORS.textPrimary,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              minHeight: '44px'
            }}
          >
            Place Order
          </button>
        </div>
      )}
    </div>
  </>
)}

      {/* Order Type Modal */}
      {showOrderTypeModal && (
        <>
          <div
            onClick={() => setShowOrderTypeModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1100
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '380px',
            background: COLORS.bgCard,
            borderRadius: '16px',
            padding: '20px',
            zIndex: 1101,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: `1px solid ${COLORS.border}`
          }}>
            <h2 style={{ fontSize: '16px', marginBottom: '16px', textAlign: 'center', fontWeight: '600', color: COLORS.textPrimary }}>Select Order Type</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleOrderTypeSelect('dine-in')}
                style={{
                  padding: '12px',
                  background: COLORS.primary,
                  color: COLORS.textPrimary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '48px',
                  fontWeight: '500'
                }}
              >
                <FiUsers size={18} /> Dine-In
              </button>
              <button
                onClick={() => handleOrderTypeSelect('takeaway')}
                style={{
                  padding: '12px',
                  background: COLORS.success,
                  color: COLORS.textPrimary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '48px',
                  fontWeight: '500'
                }}
              >
                <FiMapPin size={18} /> Takeaway
              </button>
              <button
                onClick={() => handleOrderTypeSelect('delivery')}
                style={{
                  padding: '12px',
                  background: COLORS.secondary,
                  color: COLORS.textPrimary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '48px',
                  fontWeight: '500'
                }}
              >
                <FiTruck size={18} /> Delivery
              </button>
            </div>
            
            <button
              onClick={() => setShowOrderTypeModal(false)}
              style={{
                width: '100%',
                marginTop: '14px',
                padding: '8px',
                background: COLORS.neutralLight,
                color: COLORS.textSecondary,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Table Selection Modal */}
      {showTableModal && (
        <>
          <div
            onClick={() => setShowTableModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1100
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '500px',
            background: COLORS.bgCard,
            borderRadius: '16px',
            padding: '20px',
            zIndex: 1101,
            maxHeight: '70vh',
            overflowY: 'auto',
            border: `1px solid ${COLORS.border}`
          }}>
            <h2 style={{ fontSize: '16px', marginBottom: '16px', textAlign: 'center', fontWeight: '600', color: COLORS.textPrimary }}>Select Table</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '10px' }}>
              {allTables.map(table => {
                const runningCount = table.runningOrderCount || 0;
                const hasRunningOrders = runningCount > 0;
                
                return (
                  <button
                    key={table.tableNumber}
                    onClick={() => handleTableSelect(table)}
                    style={{
                      padding: '10px 6px',
                      background: hasRunningOrders ? COLORS.secondary : COLORS.success,
                      color: COLORS.textPrimary,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      minHeight: '48px',
                      position: 'relative'
                    }}
                  >
                    T-{table.tableNumber}
                    {hasRunningOrders && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: COLORS.danger,
                        color: COLORS.textPrimary,
                        borderRadius: '12px',
                        padding: '1px 5px',
                        fontSize: '8px',
                        fontWeight: 'bold'
                      }}>
                        {runningCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div style={{ marginTop: '16px', padding: '8px', background: '#fef3c7', borderRadius: '8px' }}>
              <p style={{ fontSize: '9px', color: '#d97706', margin: 0 }}>
                <strong>ℹ️ Note:</strong> Tables with a number badge have running orders. Selecting them will add your order as a new round.
              </p>
            </div>
            
            <button
              onClick={() => setShowTableModal(false)}
              style={{
                width: '100%',
                marginTop: '14px',
                padding: '8px',
                background: COLORS.neutralLight,
                color: COLORS.textSecondary,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Delivery Options Modal */}
      {showDeliveryModal && (
        <>
          <div
            onClick={() => setShowDeliveryModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1100
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '380px',
            background: COLORS.bgCard,
            borderRadius: '16px',
            padding: '20px',
            zIndex: 1101,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: `1px solid ${COLORS.border}`
          }}>
            <h2 style={{ fontSize: '16px', marginBottom: '16px', textAlign: 'center', fontWeight: '600', color: COLORS.textPrimary }}>Select Delivery Option</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleDeliverySelect('home')}
                style={{
                  padding: '12px',
                  background: COLORS.neutral,
                  color: COLORS.textPrimary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '48px',
                  fontWeight: '500'
                }}
              >
                <FiTruck size={18} /> Home Delivery
              </button>
              <button
                onClick={() => handleDeliverySelect('zomato')}
                style={{
                  padding: '12px',
                  background: COLORS.danger,
                  color: COLORS.textPrimary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '48px',
                  fontWeight: '500'
                }}
              >
                <FiShoppingBag size={18} /> Zomato
              </button>
              <button
                onClick={() => handleDeliverySelect('swiggy')}
                style={{
                  padding: '12px',
                  background: COLORS.secondary,
                  color: COLORS.textPrimary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '48px',
                  fontWeight: '500'
                }}
              >
                <FiPackage size={18} /> Swiggy
              </button>
            </div>
            
            <button
              onClick={() => setShowDeliveryModal(false)}
              style={{
                width: '100%',
                marginTop: '14px',
                padding: '8px',
                background: COLORS.neutralLight,
                color: COLORS.textSecondary,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${COLORS.neutralLight};
          border-radius: 2px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${COLORS.primary};
          border-radius: 2px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.secondary};
        }
        
        @media (max-width: 768px) {
          button, 
          .category-btn,
          .cart-btn {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}

export default POS;