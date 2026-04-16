// src/components/Kitchen/KitchenDisplay.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiCheckCircle, FiCircle, FiTruck, FiMapPin, FiUser, FiClock, FiAlertTriangle, 
  FiCheck, FiCornerDownLeft, FiPackage, FiShoppingBag, FiUsers, FiLayers, FiX, 
  FiEdit, FiTrash2, FiMinusCircle, FiArrowUp, FiArrowDown, FiGrid, FiChevronDown, FiChevronRight, FiZap,
  FiCheckSquare, FiSquare, FiRefreshCw, FiBell, FiBellOff
} from 'react-icons/fi';
import notificationService from '../../services/notificationService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Theme Colors - Dark Theme
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

function KitchenDisplay({ orders, onUpdateOrderStatus, onUpdateItemStatus, socket, onCancelOrder }) {
  const [activeTab, setActiveTab] = useState('open');
  const [showBatchPopup, setShowBatchPopup] = useState(false);
  const [processingItems, setProcessingItems] = useState({});
  const [localOrders, setLocalOrders] = useState([]);
  const [timers, setTimers] = useState({});
  const [completedTimers, setCompletedTimers] = useState({});
  const [blinkingOrders, setBlinkingOrders] = useState(new Set());
  const [kitchenCategories, setKitchenCategories] = useState([]);
  const [kitchenCategoriesLoading, setKitchenCategoriesLoading] = useState(true);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showItemCancelModal, setShowItemCancelModal] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState(null);
  const [selectedItemForCancel, setSelectedItemForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [tableRunningOrderCounts, setTableRunningOrderCounts] = useState({});
  const [tableBaseNumbers, setTableBaseNumbers] = useState({});
  const [expandedBatchItems, setExpandedBatchItems] = useState(new Set());
  const [instantOrderRequests, setInstantOrderRequests] = useState([]);
  const [showInstantOrderNotification, setShowInstantOrderNotification] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationCheckDone, setNotificationCheckDone] = useState(false);
  
  // Refs for deduplication
  const processedEventIds = useRef(new Set());
  
  const refreshInterval = useRef(null);
  const categorySortOrderMap = useRef(new Map());

  // Define isEventProcessed BEFORE using it in useEffects
  const isEventProcessed = useCallback((eventId, cooldownMs = 5000) => {
    if (processedEventIds.current.has(eventId)) {
      console.log(`Event ${eventId} already processed, skipping`);
      return true;
    }
    processedEventIds.current.add(eventId);
    setTimeout(() => {
      processedEventIds.current.delete(eventId);
    }, cooldownMs);
    return false;
  }, []);

  // Check notification status on mount (no popups)
  useEffect(() => {
    const checkNotifications = async () => {
      if (notificationCheckDone) return;
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Only for kitchen users
      if (user.role === 'kitchen') {
        try {
          await notificationService.init();
          const isSubscribed = await notificationService.checkSubscription();
          setNotificationsEnabled(isSubscribed);
          
          // If not subscribed, just show the status bar, no popup
          if (!isSubscribed) {
            console.log('📢 Notifications not enabled - showing status bar');
            setShowNotificationPrompt(true);
          }
        } catch (error) {
          console.error('Error checking notification status:', error);
        }
      }
      setNotificationCheckDone(true);
    };
    
    checkNotifications();
  }, [notificationCheckDone]);

  // Handle enabling notifications (silent, no popups)
  const handleEnableNotifications = async () => {
    try {
      const success = await notificationService.ensureSubscription();
      if (success) {
        setNotificationsEnabled(true);
        setShowNotificationPrompt(false);
        console.log('✅ Push notifications enabled successfully');
      } else {
        console.log('❌ Failed to enable push notifications');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  };

  const handleDeclineNotifications = () => {
    setShowNotificationPrompt(false);
    console.log('❌ User declined notifications');
  };

  // Manual retry button handler
  const handleRetrySubscription = async () => {
    const success = await notificationService.ensureSubscription();
    if (success) {
      setNotificationsEnabled(true);
      setShowNotificationPrompt(false);
      console.log('✅ Notifications enabled successfully!');
    } else {
      console.log('❌ Failed to enable notifications');
    }
  };

  useEffect(() => {
    const map = new Map();
    kitchenCategories.forEach(cat => {
      map.set(cat._id, cat.sortOrder !== undefined ? cat.sortOrder : 999);
    });
    map.set('uncategorized', 999);
    categorySortOrderMap.current = map;
  }, [kitchenCategories]);

  useEffect(() => {
    setLocalOrders(orders);
    
    const counts = {};
    const baseNumbers = {};
    orders.forEach(order => {
      if (order.tableNumber && order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'ready_for_billing') {
        counts[order.tableNumber] = (counts[order.tableNumber] || 0) + 1;
        if (order.baseOrderNumber) {
          baseNumbers[order.tableNumber] = order.baseOrderNumber;
        }
      }
    });
    setTableRunningOrderCounts(counts);
    setTableBaseNumbers(baseNumbers);
  }, [orders]);

  useEffect(() => {
    refreshInterval.current = setInterval(() => {
      fetchLatestOrders();
    }, 10000);
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchKitchenCategories();
  }, []);

  const fetchKitchenCategories = async () => {
    try {
      setKitchenCategoriesLoading(true);
      const response = await fetch(`${API_URL}/categories?showInKitchen=true&_=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-cache'
      });
      if (response.ok) {
        const data = await response.json();
        setKitchenCategories(data);
      } else {
        setKitchenCategories([]);
      }
    } catch (error) {
      console.error('Error fetching kitchen categories:', error);
      setKitchenCategories([]);
    } finally {
      setKitchenCategoriesLoading(false);
      setCategoriesLoaded(true);
    }
  };

  useEffect(() => {
    const newBlinkingOrders = new Set();
    localOrders.forEach(order => {
      if (order.hasModifications && order.status !== 'completed' && order.status !== 'hold' && order.status !== 'cancelled' && order.status !== 'ready_for_billing') {
        newBlinkingOrders.add(order._id);
      }
    });
    setBlinkingOrders(newBlinkingOrders);
  }, [localOrders]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const newTimers = {};
        localOrders.forEach(order => {
          if (order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'hold' && order.status !== 'ready_for_billing') {
            const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 1000);
            newTimers[order._id] = elapsed;
          }
        });
        return newTimers;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [localOrders]);

  useEffect(() => {
    localOrders.forEach(order => {
      if (order.status === 'completed' && order.completedAt && !completedTimers[order._id]) {
        const elapsed = Math.floor((new Date(order.completedAt) - new Date(order.createdAt)) / 1000);
        setCompletedTimers(prev => ({
          ...prev,
          [order._id]: elapsed
        }));
      }
    });
  }, [localOrders, completedTimers]);

  const getItemSortOrder = (item) => {
    if (item.categorySortOrder !== undefined && item.categorySortOrder !== null && item.categorySortOrder !== 999) {
      return item.categorySortOrder;
    }
    if (item.categoryId && categorySortOrderMap.current.has(item.categoryId)) {
      return categorySortOrderMap.current.get(item.categoryId);
    }
    return 999;
  };

  const sortItemsByCategory = (items) => {
    return [...items].sort((a, b) => {
      const sortA = getItemSortOrder(a);
      const sortB = getItemSortOrder(b);
      return sortA - sortB;
    });
  };

  const shouldShowInKitchen = (item) => {
    if (!categoriesLoaded || kitchenCategoriesLoading) {
      return true;
    }
    
    if (kitchenCategories.length === 0) {
      return true;
    }
    
    if (item.categoryId) {
      const category = kitchenCategories.find(c => c._id === item.categoryId);
      return !!category;
    }
    
    return true;
  };

  const getOrderTypeBadge = (order) => {
    const type = order.orderType || 'dine-in';
    const platform = order.deliveryPlatform;
    
    if (type === 'dine-in') {
      return { letter: `T-${order.tableNumber}`, bgColor: COLORS.success, color: COLORS.textPrimary };
    }
    if (type === 'takeaway' || type === 'pickup') {
      return { letter: 'P', bgColor: COLORS.neutral, color: COLORS.textPrimary };
    }
    if (type === 'delivery') {
      if (platform === 'zomato') {
        return { letter: 'Z', bgColor: COLORS.danger, color: COLORS.textPrimary };
      }
      if (platform === 'swiggy') {
        return { letter: 'S', bgColor: COLORS.secondary, color: COLORS.textPrimary };
      }
      return { letter: 'H', bgColor: COLORS.neutral, color: COLORS.textPrimary };
    }
    return { letter: '?', bgColor: COLORS.textMuted, color: COLORS.textPrimary };
  };

  const getFilteredOrders = () => {
    let baseOrders;
    switch(activeTab) {
      case 'open':
        baseOrders = localOrders.filter(o => 
          o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing'
        );
        break;
      case 'hold':
        baseOrders = localOrders.filter(o => o.status === 'hold');
        break;
      case 'cancelled':
        baseOrders = localOrders.filter(o => o.status === 'cancelled');
        break;
      default:
        baseOrders = [];
    }
    
    const processedOrders = baseOrders.map(order => {
      let kitchenItems;
      if (activeTab === 'cancelled') {
        kitchenItems = order.items;
      } else {
        kitchenItems = order.items.filter(item => shouldShowInKitchen(item) && !item.isRemoved);
      }
      
      const displayOrderNumber = order.displayOrderNumber || `${order.baseOrderNumber || order.orderNumber}-${order.runningNumber || 1}`;
      const allKitchenItemsCompleted = kitchenItems.length > 0 && kitchenItems.every(item => item.status === 'completed');
      
      return {
        ...order,
        items: sortItemsByCategory(kitchenItems),
        allItems: order.items,
        runningOrderCount: tableRunningOrderCounts[order.tableNumber] || 0,
        displayOrderNumber: displayOrderNumber,
        baseOrderNumber: order.baseOrderNumber || order.orderNumber,
        runningNumber: order.runningNumber || 0,
        typeBadge: getOrderTypeBadge(order),
        allKitchenItemsCompleted: allKitchenItemsCompleted
      };
    });
    
    if (activeTab === 'cancelled') {
      return processedOrders;
    }
    return processedOrders;
  };

  const filteredOrders = getFilteredOrders();
  
  const getOpenCountWithKitchenItems = () => {
    const openOrders = localOrders.filter(o => 
      o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing'
    );
    return openOrders.length;
  };
  
  const getHoldCountWithKitchenItems = () => {
    const holdOrders = localOrders.filter(o => o.status === 'hold');
    return holdOrders.length;
  };
  
  const getCancelledCount = () => {
    return localOrders.filter(o => o.status === 'cancelled').length;
  };

  const openCount = getOpenCountWithKitchenItems();
  const holdCount = getHoldCountWithKitchenItems();
  const cancelledCount = getCancelledCount();

  const sortOrdersByPriorityAndAge = (ordersList) => {
    return [...ordersList].sort((a, b) => {
      const aIsRunning = (a.runningNumber || 0) > 0;
      const bIsRunning = (b.runningNumber || 0) > 0;
      if (aIsRunning !== bIsRunning) {
        return aIsRunning ? -1 : 1;
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  };

  const sortedDisplayOrders = sortOrdersByPriorityAndAge(filteredOrders);

  const toggleBatchItem = (itemKey) => {
    setExpandedBatchItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (elapsedSeconds) => {
    if (elapsedSeconds < 300) return COLORS.success;
    if (elapsedSeconds < 600) return COLORS.secondary;
    return COLORS.danger;
  };

  const getBatchItems = () => {
    const itemMap = new Map();
    
    localOrders.forEach(order => {
      if (order.status !== 'completed' && order.status !== 'hold' && order.status !== 'ready_for_billing' && order.status !== 'cancelled') {
        order.items.forEach(item => {
          if (!shouldShowInKitchen(item) || item.isRemoved) {
            return;
          }
          
          if (item.status === 'completed') {
            return;
          }
          
          const key = item.name;
          
          if (!itemMap.has(key)) {
            const sortOrder = getItemSortOrder(item);
            
            itemMap.set(key, {
              key: key,
              name: item.name,
              quantity: 0,
              orders: [],
              totalOrders: 0,
              maxPriority: 0,
              categoryId: item.categoryId,
              categoryName: item.categoryName,
              categorySortOrder: sortOrder,
              itemId: item.id,
              itemIds: new Set()
            });
          }
          const batchItem = itemMap.get(key);
          
          batchItem.quantity += item.quantity;
          
          const typeBadge = getOrderTypeBadge(order);
          
          const existingOrderIndex = batchItem.orders.findIndex(o => o.orderId === order._id);
          
          if (existingOrderIndex !== -1) {
            batchItem.orders[existingOrderIndex].quantity += item.quantity;
            batchItem.orders[existingOrderIndex].itemIds.add(item.id);
          } else {
            batchItem.orders.push({
              orderId: order._id,
              orderNumber: order.orderNumber,
              displayOrderNumber: order.displayOrderNumber || `${order.baseOrderNumber}-${order.runningNumber}`,
              baseOrderNumber: order.baseOrderNumber,
              runningNumber: order.runningNumber,
              itemId: item.id,
              itemIds: new Set([item.id]),
              tableNumber: order.tableNumber,
              orderType: order.orderType,
              deliveryPlatform: order.deliveryPlatform,
              elapsedTime: timers[order._id] || 0,
              isModified: item.isModified,
              oldQuantity: item.oldQuantity,
              newQuantity: item.quantity,
              runningOrderCount: tableRunningOrderCounts[order.tableNumber] || 0,
              isRunningOrder: (order.runningNumber || 0) > 0,
              typeBadge: typeBadge,
              status: item.status
            });
          }
          
          batchItem.totalOrders = batchItem.orders.length;
          batchItem.maxPriority = Math.max(batchItem.maxPriority, timers[order._id] || 0);
        });
      }
    });
    
    let batchItemsArray = Array.from(itemMap.values());
    batchItemsArray.sort((a, b) => b.maxPriority - a.maxPriority);
    
    return batchItemsArray;
  };

  const markBatchItemReady = async (batchItem) => {
    if (processingItems[batchItem.name]) return;
    
    setProcessingItems(prev => ({ ...prev, [batchItem.name]: true }));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const orderInfo of batchItem.orders) {
      try {
        const order = localOrders.find(o => o._id === orderInfo.orderId);
        if (order) {
          const itemInOrder = order.items.find(i => i.id === orderInfo.itemId);
          if (itemInOrder && itemInOrder.status !== 'completed') {
            await onUpdateItemStatus(orderInfo.orderId, orderInfo.itemId, 'completed');
            successCount++;
          }
        }
      } catch (error) {
        console.error('Error marking item ready:', error);
        failCount++;
      }
    }
    
    if (successCount > 0) {
      console.log(`${successCount} item(s) marked ready for "${batchItem.name}"`);
    }
    
    await fetchLatestOrders();
    
    setProcessingItems(prev => ({ ...prev, [batchItem.name]: false }));
  };

  const batchItems = getBatchItems();
  const hasBatchItems = batchItems.length > 0;

  const fetchLatestOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        cache: 'no-cache'
      });
      if (response.ok) {
        const data = await response.json();
        setLocalOrders(data);
        
        const counts = {};
        const baseNums = {};
        data.forEach(order => {
          if (order.tableNumber && order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'ready_for_billing') {
            counts[order.tableNumber] = (counts[order.tableNumber] || 0) + 1;
            if (order.baseOrderNumber) {
              baseNums[order.tableNumber] = order.baseOrderNumber;
            }
          }
        });
        setTableRunningOrderCounts(counts);
        setTableBaseNumbers(baseNums);
        
        return data;
      }
    } catch (error) {
      console.error('Error fetching latest orders:', error);
    }
    return null;
  };

  const retrieveOrderToActive = async (order) => {
    if (!order || order.status !== 'ready_for_billing') return;
    
    const eventId = `retrieve_${order._id}`;
    if (isEventProcessed(eventId, 3000)) return;
    
    try {
      await onUpdateOrderStatus(order._id, 'accepted');
      await fetchLatestOrders();
    } catch (error) {
      console.error('Error retrieving order:', error);
    }
  };

  const handleCancelItem = (order, item) => {
    setSelectedOrderForCancel(order);
    setSelectedItemForCancel(item);
    setCancelReason('');
    setShowItemCancelModal(true);
  };

  const confirmCancelItem = async () => {
    if (!selectedOrderForCancel || !selectedItemForCancel) return;
    
    const eventId = `cancel_item_${selectedOrderForCancel._id}_${selectedItemForCancel.id}`;
    if (isEventProcessed(eventId, 5000)) return;
    
    try {
      const response = await fetch(`${API_URL}/orders/${selectedOrderForCancel._id}/items/${selectedItemForCancel.id}/request-cancellation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: cancelReason || 'No reason provided' })
      });
      
      if (response.ok) {
        setShowItemCancelModal(false);
        setSelectedItemForCancel(null);
        setSelectedOrderForCancel(null);
        setCancelReason('');
        await fetchLatestOrders();
      } else {
        const error = await response.json();
        console.error('Error requesting cancellation:', error);
      }
    } catch (error) {
      console.error('Error requesting cancellation:', error);
    }
  };

  const handleInstantOrderAction = async (request, action) => {
    const eventId = `instant_action_${request.orderId}_${action}`;
    if (isEventProcessed(eventId, 5000)) return;
    
    if (action === 'accept') {
      setInstantOrderRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'accepted' } : r
      ));
      
      setTimeout(() => {
        setInstantOrderRequests(prev => prev.filter(r => r.id !== request.id));
        if (instantOrderRequests.length <= 1) {
          setShowInstantOrderNotification(false);
        }
      }, 5000);
    } else if (action === 'reject') {
      if (socket) {
        socket.emit('instant-order-rejection', {
          orderId: request.orderId,
          orderNumber: request.orderNumber,
          items: request.items,
          reason: 'Rejected by kitchen'
        });
      }
      setInstantOrderRequests(prev => prev.filter(r => r.id !== request.id));
      if (instantOrderRequests.length <= 1) {
        setShowInstantOrderNotification(false);
      }
    }
  };

  useEffect(() => {
    fetchLatestOrders();
  }, []);

  useEffect(() => {
    // Handle new order from socket
    const handleNewOrder = async (order) => {
      console.log('📦 New order received in kitchen:', order);
      const eventId = `new_order_${order._id}`;
      if (isEventProcessed(eventId, 5000)) return;
      await fetchLatestOrders();
    };

    const handleOrderModified = async ({ orderId }) => {
      const eventId = `order_modified_${orderId}`;
      if (isEventProcessed(eventId, 3000)) return;
      await fetchLatestOrders();
    };

    const handleOrderCancelled = async ({ orderId }) => {
      const eventId = `order_cancelled_${orderId}`;
      if (isEventProcessed(eventId, 3000)) return;
      await fetchLatestOrders();
    };

    const handleOrderAccepted = async (orderId) => {
      const eventId = `order_accepted_${orderId}`;
      if (isEventProcessed(eventId, 2000)) return;
      await fetchLatestOrders();
    };

    const handleOrderReadyForBilling = async (orderId) => {
      const eventId = `order_ready_${orderId}`;
      if (isEventProcessed(eventId, 3000)) return;
      await fetchLatestOrders();
    };

    const handleInstantOrderRequest = (data) => {
      const eventId = `instant_order_${data.orderId}`;
      if (isEventProcessed(eventId, 5000)) return;
      
      console.log('⚡ Instant order request received:', data);
      setInstantOrderRequests(prev => [...prev, { ...data, id: Date.now(), status: 'pending' }]);
      setShowInstantOrderNotification(true);
    };

    const handleCancellationRequested = (request) => {
      const eventId = `cancel_req_${request.orderId}_${request.itemId}`;
      if (isEventProcessed(eventId, 3000)) return;
    };

    if (socket) {
      socket.off('new-order-received');
      socket.off('order-modified');
      socket.off('order-cancelled');
      socket.off('order-accepted');
      socket.off('order-ready-for-billing');
      socket.off('instant-order-request');
      socket.off('cancellation-requested');
      
      socket.on('new-order-received', handleNewOrder);
      socket.on('order-modified', handleOrderModified);
      socket.on('order-cancelled', handleOrderCancelled);
      socket.on('order-accepted', handleOrderAccepted);
      socket.on('order-ready-for-billing', handleOrderReadyForBilling);
      socket.on('instant-order-request', handleInstantOrderRequest);
      socket.on('cancellation-requested', handleCancellationRequested);
    }

    return () => {
      if (socket) {
        socket.off('new-order-received', handleNewOrder);
        socket.off('order-modified', handleOrderModified);
        socket.off('order-cancelled', handleOrderCancelled);
        socket.off('order-accepted', handleOrderAccepted);
        socket.off('order-ready-for-billing', handleOrderReadyForBilling);
        socket.off('instant-order-request', handleInstantOrderRequest);
        socket.off('cancellation-requested', handleCancellationRequested);
      }
      processedEventIds.current.clear();
    };
  }, [socket, fetchLatestOrders, localOrders, isEventProcessed]);

  const toggleItemComplete = async (orderId, itemId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const eventId = `toggle_item_${orderId}_${itemId}`;
    if (isEventProcessed(eventId, 1000)) return;
    
    setLocalOrders(prev => prev.map(order => {
      if (order._id === orderId) {
        const updatedItems = order.items.map(item => {
          if (item.id === itemId) {
            return { ...item, status: newStatus };
          }
          return item;
        });
        return { ...order, items: updatedItems };
      }
      return order;
    }));
    
    setProcessingItems(prev => ({ ...prev, [`${orderId}-${itemId}`]: true }));
    
    try {
      await onUpdateItemStatus(orderId, itemId, newStatus);
      await fetchLatestOrders();
    } catch (error) {
      console.error('Error updating item:', error);
      setLocalOrders(prev => prev.map(order => {
        if (order._id === orderId) {
          const revertedItems = order.items.map(item => {
            if (item.id === itemId) {
              return { ...item, status: currentStatus };
            }
            return item;
          });
          return { ...order, items: revertedItems };
        }
        return order;
      }));
    } finally {
      setProcessingItems(prev => ({ ...prev, [`${orderId}-${itemId}`]: false }));
    }
  };

  const handleCancelOrder = (order) => {
    setSelectedOrderForCancel(order);
    setSelectedItemForCancel(null);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrderForCancel) return;
    
    const eventId = `cancel_order_${selectedOrderForCancel._id}`;
    if (isEventProcessed(eventId, 5000)) return;
    
    try {
      await onUpdateOrderStatus(selectedOrderForCancel._id, 'cancelled');
      setShowCancelModal(false);
      setSelectedOrderForCancel(null);
      setCancelReason('');
      await fetchLatestOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const holdOrder = (orderId) => {
    const eventId = `hold_order_${orderId}`;
    if (isEventProcessed(eventId, 1500)) return;
    onUpdateOrderStatus(orderId, 'hold');
  };

  const resumeOrder = (orderId) => {
    const eventId = `resume_order_${orderId}`;
    if (isEventProcessed(eventId, 1500)) return;
    onUpdateOrderStatus(orderId, 'accepted');
  };

  const markReadyForBilling = async (orderId) => {
    const eventId = `mark_ready_${orderId}`;
    if (isEventProcessed(eventId, 5000)) return;
    
    const order = localOrders.find(o => o._id === orderId);
    if (order) {
      setProcessingItems(prev => ({ ...prev, [orderId]: true }));
      
      try {
        const pendingItems = order.items.filter(item => !item.isRemoved && item.status !== 'completed');
        
        if (pendingItems.length > 0) {
          for (const item of pendingItems) {
            try {
              await onUpdateItemStatus(orderId, item.id, 'completed');
            } catch (error) {
              console.error(`Error marking item ${item.name} as completed:`, error);
            }
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await onUpdateOrderStatus(orderId, 'ready_for_billing');
        await fetchLatestOrders();
        
      } catch (error) {
        console.error('Error marking order ready for billing:', error);
      } finally {
        setProcessingItems(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const getTimerMessage = (elapsedSeconds) => {
    if (elapsedSeconds >= 600) return '⚠️ DELAYED';
    if (elapsedSeconds >= 300) return '⏰ WARNING';
    return '✓ ON TIME';
  };

  const getOrderTypeIcon = (orderType, platform) => {
    if (orderType === 'delivery') {
      if (platform === 'zomato') return <FiShoppingBag size={9} />;
      if (platform === 'swiggy') return <FiPackage size={9} />;
      return <FiTruck size={9} />;
    }
    if (orderType === 'pickup' || orderType === 'takeaway') return <FiMapPin size={9} />;
    return <FiUser size={9} />;
  };

  const getOrderTypeDisplay = (order) => {
    const type = order.orderType || 'dine-in';
    const platform = order.deliveryPlatform;
    
    if (type === 'delivery') {
      if (platform === 'zomato') return 'ZOMATO';
      if (platform === 'swiggy') return 'SWIGGY';
      return 'HOME DEL';
    }
    if (type === 'pickup' || type === 'takeaway') return 'TAKEAWAY';
    return 'DINE-IN';
  };

  const getHeaderBackground = (order) => {
    if (order.status === 'cancelled') return `${COLORS.danger}20`;
    
    const type = order.orderType || 'dine-in';
    const platform = order.deliveryPlatform;
    const isRunningOrder = (order.runningNumber || 0) > 0;
    
    if (isRunningOrder) {
      return `${COLORS.success}20`;
    }
    
    if (type === 'delivery') {
      if (platform === 'zomato') return `${COLORS.danger}20`;
      if (platform === 'swiggy') return `${COLORS.secondary}20`;
      return COLORS.neutralLight;
    }
    
    if (type === 'pickup' || type === 'takeaway') {
      return `${COLORS.secondary}20`;
    }
    
    return `${COLORS.success}20`;
  };

  const getHeaderBorderColor = (order) => {
    if (order.status === 'cancelled') return COLORS.danger;
    
    const type = order.orderType || 'dine-in';
    const platform = order.deliveryPlatform;
    const isRunningOrder = (order.runningNumber || 0) > 0;
    
    if (isRunningOrder) {
      return COLORS.success;
    }
    
    if (type === 'delivery') {
      if (platform === 'zomato') return COLORS.danger;
      if (platform === 'swiggy') return COLORS.secondary;
      return COLORS.neutral;
    }
    
    if (type === 'pickup' || type === 'takeaway') {
      return COLORS.secondary;
    }
    
    return COLORS.success;
  };

  const formatTimeDisplay = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getItemBadgeInfo = (item) => {
    if (item.isModified) {
      if (item.oldQuantity !== undefined && item.oldQuantity !== item.quantity) {
        return {
          show: true,
          text: `${item.oldQuantity}→${item.quantity}`,
          type: 'quantity-change',
          bgColor: COLORS.primary,
          color: COLORS.textPrimary
        };
      }
      if (!item.oldQuantity && item.isModified && item.modifiedAt) {
        return {
          show: true,
          text: 'NEW',
          type: 'new',
          bgColor: COLORS.success,
          color: COLORS.textPrimary
        };
      }
      return {
        show: true,
        text: 'MOD',
        type: 'modified',
        bgColor: COLORS.secondary,
        color: COLORS.textPrimary
      };
    }
    return { show: false };
  };

  if ((!localOrders || localOrders.length === 0) && !categoriesLoaded && kitchenCategoriesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', background: COLORS.neutralDark, color: COLORS.textPrimary }}>
        Loading kitchen display...
      </div>
    );
  }

  return (
    <div style={{
      padding: '8px',
      background: COLORS.neutralDark,
      height: 'calc(100vh - 56px)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Notification Status Bar - Only visible when notifications are disabled */}
      {!notificationsEnabled && (
        <div style={{
          background: COLORS.secondary,
          borderBottom: `1px solid ${COLORS.secondary}`,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          flexShrink: 0,
          borderRadius: '6px',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
            <FiBellOff size={14} />
            <span>Notifications are disabled</span>
          </div>
          <button
            onClick={handleRetrySubscription}
            style={{
              background: COLORS.textPrimary,
              color: COLORS.secondary,
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '500'
            }}
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Instant Order Notification Bar */}
      {showInstantOrderNotification && instantOrderRequests.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: '250px',
          right: '20px',
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          color: COLORS.textPrimary,
          padding: '10px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiZap size={18} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                ⚡ Instant Order Required
              </div>
              <div style={{ fontSize: '9px', opacity: 0.9 }}>
                {instantOrderRequests.length} order(s) need immediate attention
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowInstantOrderNotification(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              color: COLORS.textPrimary,
              cursor: 'pointer',
              fontSize: '9px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Instant Order Details Modal */}
      {showInstantOrderNotification && instantOrderRequests.length > 0 && (
        <>
          <div onClick={() => setShowInstantOrderNotification(false)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '70vh',
            background: COLORS.bgCard,
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${COLORS.border}`
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.primary,
              color: COLORS.textPrimary,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiZap size={16} /> Instant Order Requests
              </h3>
              <button onClick={() => setShowInstantOrderNotification(false)} style={{ background: 'none', border: 'none', color: COLORS.textPrimary, cursor: 'pointer' }}>
                <FiX size={16} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {instantOrderRequests.map(request => (
                <div key={request.id} style={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                  background: request.status === 'accepted' ? `${COLORS.success}20` : COLORS.bgCard
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', color: COLORS.textPrimary }}>Order #{request.orderNumber}</span>
                    <span style={{ fontSize: '9px', color: COLORS.textSecondary }}>
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    {request.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '10px', padding: '2px 0', color: COLORS.textSecondary }}>
                        {item.quantity}× {item.name}
                      </div>
                    ))}
                  </div>
                  
                  {request.status === 'accepted' ? (
                    <div style={{
                      padding: '6px',
                      background: `${COLORS.success}20`,
                      color: COLORS.success,
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      ✓ Accepted - Processing
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleInstantOrderAction(request, 'accept')}
                        style={{
                          flex: 1,
                          padding: '6px',
                          background: COLORS.success,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <FiCheck size={10} /> Accept
                      </button>
                      <button
                        onClick={() => handleInstantOrderAction(request, 'reject')}
                        style={{
                          flex: 1,
                          padding: '6px',
                          background: COLORS.danger,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <FiX size={10} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ padding: '12px', borderTop: `1px solid ${COLORS.border}` }}>
              <button
                onClick={() => setShowInstantOrderNotification(false)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: COLORS.neutralLight,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  color: COLORS.textSecondary
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '10px',
        background: COLORS.bgCard,
        borderRadius: '8px',
        padding: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        flexShrink: 0,
        border: `1px solid ${COLORS.border}`
      }}>
        <button
          onClick={() => setActiveTab('open')}
          style={{
            flex: 1,
            padding: '6px 4px',
            background: activeTab === 'open' ? COLORS.primary : 'transparent',
            color: activeTab === 'open' ? COLORS.textPrimary : COLORS.textSecondary,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <FiClock size={10} />
          Open ({openCount})
        </button>
        <button
          onClick={() => setActiveTab('hold')}
          style={{
            flex: 1,
            padding: '6px 4px',
            background: activeTab === 'hold' ? COLORS.secondary : 'transparent',
            color: activeTab === 'hold' ? COLORS.textPrimary : COLORS.textSecondary,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <FiAlertTriangle size={10} />
          Hold ({holdCount})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          style={{
            flex: 1,
            padding: '6px 4px',
            background: activeTab === 'cancelled' ? COLORS.danger : 'transparent',
            color: activeTab === 'cancelled' ? COLORS.textPrimary : COLORS.textSecondary,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <FiTrash2 size={10} />
          Cancelled ({cancelledCount})
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        flex: 1,
        overflow: 'auto',
        paddingBottom: '8px',
        alignItems: 'start'
      }}>
        {sortedDisplayOrders.length > 0 ? (
          sortedDisplayOrders.map(order => {
            const elapsedSeconds = timers[order._id] || 0;
            const timerColor = getTimerColor(elapsedSeconds);
            const timerMessage = getTimerMessage(elapsedSeconds);
            const allKitchenItemsCompleted = order.allKitchenItemsCompleted;
            const isBlinking = blinkingOrders.has(order._id) && activeTab === 'open';
            const headerBg = getHeaderBackground(order);
            const headerBorderColor = getHeaderBorderColor(order);
            const isCancelled = order.status === 'cancelled';
            const displayOrderNumber = order.displayOrderNumber;
            const runningNumber = order.runningNumber || 0;
            const isRunningOrder = runningNumber > 0;
            const typeBadge = order.typeBadge || getOrderTypeBadge(order);
            const isReadyForBilling = order.status === 'ready_for_billing';
            
            return (
              <div
                key={order._id}
                style={{
                  background: isBlinking ? `${COLORS.danger}20` : (isCancelled ? `${COLORS.danger}10` : COLORS.bgCard),
                  borderRadius: '6px',
                  overflow: 'hidden',
                  boxShadow: isRunningOrder ? `0 1px 4px ${COLORS.secondary}40` : '0 1px 2px rgba(0,0,0,0.05)',
                  border: isRunningOrder ? `1.5px solid ${timerColor}` : (order.hasModifications && activeTab === 'open' ? `1px solid ${timerColor}` : `1px solid ${COLORS.border}`),
                  animation: isBlinking ? 'blink 1s ease-in-out infinite' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'auto',
                  minHeight: '260px',
                  maxHeight: '380px',
                  opacity: isCancelled ? 0.7 : 1
                }}
              >
                {/* Header section */}
                <div style={{
                  padding: '6px 8px',
                  background: headerBg,
                  borderBottom: `1px solid ${headerBorderColor}`,
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: typeBadge.bgColor,
                        color: typeBadge.color,
                        fontSize: '9px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {typeBadge.letter}
                      </div>
                      <span style={{ fontWeight: 'bold', fontSize: '10px', color: COLORS.textPrimary }}>#{displayOrderNumber}</span>
                      {isReadyForBilling && activeTab !== 'cancelled' && (
                        <span style={{ background: COLORS.success, color: COLORS.textPrimary, padding: '1px 3px', borderRadius: '8px', fontSize: '7px' }}>
                          READY
                        </span>
                      )}
                      {isCancelled && (
                        <span style={{ background: COLORS.danger, color: COLORS.textPrimary, padding: '1px 3px', borderRadius: '8px', fontSize: '7px' }}>
                          CANCELLED
                        </span>
                      )}
                    </div>
                    
                    {!isCancelled && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace', color: timerColor }}>{formatTime(elapsedSeconds)}</div>
                        <div style={{ fontSize: '6px', color: timerColor, fontWeight: '500' }}>{timerMessage}</div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '8px', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span>{order.customer?.name?.split(' ')[0] || 'Walk-In'}</span>
                    <span>• {formatTimeDisplay(order.createdAt)}</span>
                  </div>
                  
                  {(order.orderType === 'dine-in' || isRunningOrder) && (
                    <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      {isRunningOrder && !isCancelled && (
                        <div style={{
                          background: COLORS.danger,
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '7px',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: COLORS.textPrimary
                        }}>
                          Running Order #{runningNumber}
                        </div>
                      )}
                      
                      {isRunningOrder && !isCancelled && (
                        <div style={{
                          background: COLORS.danger,
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '7px',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: COLORS.textPrimary,
                          animation: 'pulse 1s ease-in-out infinite'
                        }}>
                          <FiAlertTriangle size={7} /> PRIORITY
                        </div>
                      )}
                    </div>
                  )}
                  
                  {order.hasModifications && activeTab === 'open' && !isCancelled && (
                    <div style={{
                      marginTop: '3px',
                      padding: '1px 4px',
                      background: `${COLORS.danger}20`,
                      color: COLORS.danger,
                      borderRadius: '6px',
                      fontSize: '6px',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <FiEdit size={6} />
                      Modified
                    </div>
                  )}
                </div>

                {/* Items section */}
                <div style={{ 
                  padding: '6px 8px',
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0
                }}>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => {
                      const isCompleted = item.status === 'completed';
                      const badgeInfo = getItemBadgeInfo(item);
                      const isPendingCancellation = item.cancellationRequested && !item.cancellationApproved;
                      const showQuantityBadge = item.oldQuantity && item.oldQuantity !== item.quantity;
                      
                      return (
                        <div
                          key={item.id || index}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '4px',
                            padding: '4px 0',
                            borderBottom: index !== order.items.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                            cursor: activeTab === 'open' && order.status !== 'ready_for_billing' && !isCancelled ? 'pointer' : 'default',
                            opacity: isCompleted ? 0.6 : 1,
                            background: badgeInfo.show && !isCompleted && !isCancelled ? `${badgeInfo.bgColor}20` : 'transparent',
                            position: 'relative'
                          }}
                          onClick={() => {
                            if (activeTab === 'open' && order.status !== 'ready_for_billing' && !isCancelled && !isPendingCancellation) {
                              toggleItemComplete(order._id, item.id, item.status);
                            }
                          }}
                        >
                          <div style={{ flexShrink: 0, marginTop: '2px' }}>
                            {isCompleted ? (
                              <FiCheckCircle size={8} color={COLORS.success} />
                            ) : (
                              <FiCircle size={8} color={COLORS.textMuted} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '8px',
                              fontWeight: isCompleted ? 'normal' : '500',
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              color: isCompleted ? COLORS.textMuted : COLORS.textPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexWrap: 'wrap',
                              lineHeight: '1.3'
                            }}>
                              <span style={{ fontWeight: 'bold', flexShrink: 0 }}>{item.quantity}×</span>
                              <span style={{ flex: 1, wordBreak: 'break-word' }}>{item.name}</span>
                              
                              {showQuantityBadge && !isCompleted && !isCancelled && (
                                <span style={{
                                  fontSize: '6px',
                                  background: COLORS.primary,
                                  color: COLORS.textPrimary,
                                  padding: '1px 3px',
                                  borderRadius: '6px',
                                  flexShrink: 0,
                                  fontWeight: 'bold'
                                }}>
                                  {item.oldQuantity}→{item.quantity}
                                </span>
                              )}
                              
                              {badgeInfo.show && badgeInfo.type === 'new' && !isCompleted && !isCancelled && !showQuantityBadge && (
                                <span style={{
                                  fontSize: '6px',
                                  background: badgeInfo.bgColor,
                                  color: badgeInfo.color,
                                  padding: '1px 3px',
                                  borderRadius: '6px',
                                  flexShrink: 0,
                                  fontWeight: 'bold'
                                }}>
                                  {badgeInfo.text}
                                </span>
                              )}
                              
                              {badgeInfo.show && badgeInfo.type === 'modified' && !isCompleted && !isCancelled && !showQuantityBadge && (
                                <span style={{
                                  fontSize: '6px',
                                  background: badgeInfo.bgColor,
                                  color: badgeInfo.color,
                                  padding: '1px 3px',
                                  borderRadius: '6px',
                                  flexShrink: 0,
                                  fontWeight: 'bold'
                                }}>
                                  {badgeInfo.text}
                                </span>
                              )}
                              
                              {isPendingCancellation && (
                                <span style={{
                                  fontSize: '6px',
                                  background: `${COLORS.secondary}20`,
                                  color: COLORS.secondary,
                                  padding: '1px 3px',
                                  borderRadius: '6px',
                                  flexShrink: 0,
                                  fontWeight: 'bold'
                                }}>
                                  ⏳ Pending
                                </span>
                              )}
                            </div>
                            {item.specialInstructions && !isCompleted && !isCancelled && (
                              <div style={{ 
                                fontSize: '7px', 
                                color: COLORS.secondary, 
                                marginTop: '3px', 
                                marginLeft: '16px',
                                wordBreak: 'break-word',
                                lineHeight: '1.2'
                              }}>
                                📝 {item.specialInstructions}
                              </div>
                            )}
                          </div>
                          {activeTab === 'open' && !isCompleted && !isCancelled && order.status !== 'ready_for_billing' && !isPendingCancellation && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelItem(order, item);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: COLORS.danger,
                                cursor: 'pointer',
                                padding: '2px',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontSize: '7px',
                                minHeight: 'auto',
                                minWidth: 'auto',
                                height: 'auto'
                              }}
                              title="Request cancellation"
                            >
                              <FiMinusCircle size={8} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '15px', color: COLORS.textMuted, fontSize: '8px' }}>
                      No kitchen items in this order
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div style={{ 
                  padding: '6px 8px', 
                  borderTop: `1px solid ${COLORS.border}`, 
                  display: 'flex', 
                  gap: '4px',
                  background: COLORS.neutral,
                  flexShrink: 0
                }}>
                  {activeTab === 'open' && !isCancelled && order.status !== 'ready_for_billing' && (
                    <>
                      <button
                        onClick={() => holdOrder(order._id)}
                        style={{
                          flex: 1,
                          padding: '3px 4px',
                          background: COLORS.secondary,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '7px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          minHeight: 'auto',
                          minWidth: 'auto',
                          height: 'auto',
                          lineHeight: 'normal',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <FiAlertTriangle size={6} /> Hold
                      </button>
                      {(() => {
                        const allItemsCompleted = order.items.every(item => {
                          if (!item.isRemoved) {
                            return item.status === 'completed';
                          }
                          return true;
                        });
                        const pendingCount = order.items.filter(item => !item.isRemoved && item.status !== 'completed').length;
                        const isProcessing = processingItems[order._id];
                        
                        if (isProcessing) {
                          return (
                            <button
                              disabled={true}
                              style={{
                                flex: 2,
                                padding: '3px 4px',
                                background: COLORS.primary,
                                color: COLORS.textPrimary,
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'wait',
                                fontSize: '7px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                                minHeight: 'auto',
                                minWidth: 'auto',
                                height: 'auto',
                                lineHeight: 'normal',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <FiCheck size={6} /> Processing...
                            </button>
                          );
                        }
                        
                        return (
                          <button
                            onClick={() => markReadyForBilling(order._id)}
                            style={{
                              flex: 2,
                              padding: '3px 4px',
                              background: allItemsCompleted ? COLORS.success : COLORS.secondary,
                              color: COLORS.textPrimary,
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '7px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              minHeight: 'auto',
                              minWidth: 'auto',
                              height: 'auto',
                              lineHeight: 'normal',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <FiCheck size={6} /> {allItemsCompleted ? 'Done' : `Ready All (${pendingCount})`}
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => handleCancelOrder(order)}
                        style={{
                          flex: 1,
                          padding: '3px 4px',
                          background: COLORS.danger,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '7px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          minHeight: 'auto',
                          minWidth: 'auto',
                          height: 'auto',
                          lineHeight: 'normal',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <FiTrash2 size={6} /> Cancel
                      </button>
                    </>
                  )}

                  {order.status === 'ready_for_billing' && activeTab !== 'cancelled' && (
                    <>
                      <button
                        onClick={() => retrieveOrderToActive(order)}
                        style={{
                          flex: 1,
                          padding: '3px 4px',
                          background: COLORS.primary,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '7px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          minHeight: 'auto',
                          minWidth: 'auto',
                          height: 'auto',
                          lineHeight: 'normal',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <FiRefreshCw size={6} /> Retrieve
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order)}
                        style={{
                          flex: 1,
                          padding: '3px 4px',
                          background: COLORS.danger,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '7px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          minHeight: 'auto',
                          minWidth: 'auto',
                          height: 'auto',
                          lineHeight: 'normal',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <FiTrash2 size={6} /> Cancel
                      </button>
                    </>
                  )}

                  {activeTab === 'hold' && !isCancelled && (
                    <>
                      <button
                        onClick={() => resumeOrder(order._id)}
                        style={{
                          flex: 1,
                          padding: '3px 4px',
                          background: COLORS.primary,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '7px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          minHeight: 'auto',
                          minWidth: 'auto',
                          height: 'auto',
                          lineHeight: 'normal',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <FiCornerDownLeft size={6} /> Resume
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order)}
                        style={{
                          flex: 1,
                          padding: '3px 4px',
                          background: COLORS.danger,
                          color: COLORS.textPrimary,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '7px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          minHeight: 'auto',
                          minWidth: 'auto',
                          height: 'auto',
                          lineHeight: 'normal',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <FiTrash2 size={6} /> Cancel
                      </button>
                    </>
                  )}

                  {activeTab === 'cancelled' && (
                    <div style={{
                      width: '100%',
                      padding: '3px',
                      background: `${COLORS.danger}20`,
                      color: COLORS.danger,
                      borderRadius: '3px',
                      fontSize: '6px',
                      textAlign: 'center',
                      fontWeight: '500'
                    }}>
                      Order Cancelled
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '30px',
            background: COLORS.bgCard,
            borderRadius: '6px',
            color: COLORS.textMuted,
            fontSize: '10px',
            border: `1px solid ${COLORS.border}`
          }}>
            {activeTab === 'open' && '📭 No open orders'}
            {activeTab === 'hold' && '⏸️ No held orders'}
            {activeTab === 'cancelled' && '❌ No cancelled orders'}
          </div>
        )}
      </div>

      {showCancelModal && selectedOrderForCancel && !selectedItemForCancel && (
        <>
          <div onClick={() => setShowCancelModal(false)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '350px',
            background: COLORS.bgCard,
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            padding: '20px',
            border: `1px solid ${COLORS.border}`
          }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: COLORS.textPrimary }}>Cancel Order {selectedOrderForCancel.displayOrderNumber}?</h3>
            <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '16px' }}>Are you sure you want to cancel this order? This action cannot be undone.</p>
            <textarea placeholder="Reason for cancellation (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ width: '100%', padding: '8px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', marginBottom: '16px', resize: 'vertical', background: COLORS.neutralLight, color: COLORS.textPrimary }} rows="2" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '8px', background: COLORS.textMuted, color: COLORS.textPrimary, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>No, Keep Order</button>
              <button onClick={confirmCancelOrder} style={{ flex: 1, padding: '8px', background: COLORS.danger, color: COLORS.textPrimary, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>Yes, Cancel Order</button>
            </div>
          </div>
        </>
      )}

      {showItemCancelModal && selectedOrderForCancel && selectedItemForCancel && (
        <>
          <div onClick={() => setShowItemCancelModal(false)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '350px',
            background: COLORS.bgCard,
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            padding: '20px',
            border: `1px solid ${COLORS.border}`
          }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: COLORS.textPrimary }}>Request Cancellation for {selectedItemForCancel.name}?</h3>
            <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '16px' }}>This will send a cancellation request to the POS/Admin for approval.</p>
            <textarea placeholder="Reason for cancellation (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ width: '100%', padding: '8px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', marginBottom: '16px', resize: 'vertical', background: COLORS.neutralLight, color: COLORS.textPrimary }} rows="2" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowItemCancelModal(false)} style={{ flex: 1, padding: '8px', background: COLORS.textMuted, color: COLORS.textPrimary, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
              <button onClick={confirmCancelItem} style={{ flex: 1, padding: '8px', background: COLORS.danger, color: COLORS.textPrimary, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>Request Cancellation</button>
            </div>
          </div>
        </>
      )}

      {hasBatchItems && activeTab === 'open' && (
        <button
          onClick={() => setShowBatchPopup(true)}
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            background: COLORS.primary,
            color: COLORS.textPrimary,
            border: 'none',
            borderRadius: '40px',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}
        >
          <FiLayers size={12} />
          Batch ({batchItems.length})
        </button>
      )}

      {showBatchPopup && (
        <>
          <div onClick={() => setShowBatchPopup(false)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000
          }} />
          <div style={{
            position: 'fixed',
            bottom: '130px',
            right: '20px',
            width: '420px',
            maxHeight: '65vh',
            background: COLORS.bgCard,
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${COLORS.border}`
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: COLORS.primary,
              color: COLORS.textPrimary
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiLayers size={16} />
                <h2 style={{ fontSize: '14px', margin: 0 }}>Batch Prep</h2>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px' }}>{batchItems.length}</span>
              </div>
              <button onClick={() => setShowBatchPopup(false)} style={{ background: 'none', border: 'none', color: COLORS.textPrimary, cursor: 'pointer', fontSize: '16px' }}><FiX size={14} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {batchItems.map((item, idx) => {
                const timerColor = getTimerColor(item.maxPriority);
                const ordersList = item.orders;
                const isExpanded = expandedBatchItems.has(item.key);
                const highestTime = formatTime(item.maxPriority);
                
                return (
                  <div key={item.key} style={{ 
                    marginBottom: '12px', 
                    border: `1px solid ${timerColor}30`, 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}>
                    <div 
                      onClick={() => toggleBatchItem(item.key)}
                      style={{
                        padding: '8px 10px',
                        background: `${timerColor}08`,
                        borderLeft: `3px solid ${timerColor}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${timerColor}15`}
                      onMouseLeave={(e) => e.currentTarget.style.background = `${timerColor}08`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isExpanded ? (
                          <FiChevronDown size={12} color={timerColor} />
                        ) : (
                          <FiChevronRight size={12} color={timerColor} />
                        )}
                        <div>
                          <strong style={{ fontSize: '11px', color: COLORS.textPrimary }}>{item.name}</strong>
                          <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>
                            {item.categoryName && <span>{item.categoryName} • </span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textPrimary }}>
                          Qty: {item.quantity}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', color: timerColor, minWidth: '45px', textAlign: 'right' }}>
                          {highestTime}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markBatchItemReady(item);
                          }}
                          disabled={processingItems[item.name]}
                          style={{
                            padding: '2px 8px',
                            background: processingItems[item.name] ? COLORS.textMuted : COLORS.success,
                            color: COLORS.textPrimary,
                            border: 'none',
                            borderRadius: '4px',
                            cursor: processingItems[item.name] ? 'not-allowed' : 'pointer',
                            fontSize: '8px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            minHeight: 'auto',
                            minWidth: 'auto',
                            height: 'auto'
                          }}
                        >
                          <FiCheck size={8} />
                          {processingItems[item.name] ? '...' : 'Ready'}
                        </button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '8px 10px', borderTop: `1px solid ${timerColor}20` }}>
                        {ordersList.map((order, orderIdx) => {
                          const isNewOrModified = order.isModified && (order.oldQuantity !== undefined || order.newQuantity !== undefined);
                          return (
                            <div key={orderIdx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '6px',
                              padding: '6px 0',
                              borderBottom: orderIdx !== ordersList.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                              fontSize: '9px'
                            }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: order.typeBadge.bgColor,
                                color: order.typeBadge.color,
                                fontSize: '10px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                {order.typeBadge.letter}
                              </div>
                              <span style={{ fontWeight: 'bold', fontSize: '10px', color: COLORS.textPrimary, flexShrink: 0 }}>#{order.displayOrderNumber}</span>
                              {order.isRunningOrder && <span style={{ fontSize: '7px', background: COLORS.danger, color: COLORS.textPrimary, padding: '2px 5px', borderRadius: '6px', fontWeight: 'bold' }}>PRIORITY</span>}
                              <span style={{ marginLeft: 'auto', color: getTimerColor(order.elapsedTime), fontSize: '9px', fontFamily: 'monospace', flexShrink: 0 }}>{formatTime(order.elapsedTime)}</span>
                              {isNewOrModified && <span style={{ fontSize: '7px', background: order.oldQuantity !== undefined && order.oldQuantity !== order.newQuantity ? COLORS.primary : COLORS.success, color: COLORS.textPrimary, padding: '2px 5px', borderRadius: '6px', fontWeight: 'bold', flexShrink: 0 }}>{order.oldQuantity !== undefined && order.oldQuantity !== order.newQuantity ? `${order.oldQuantity}→${order.newQuantity}` : 'NEW'}</span>}
                              <span style={{ fontWeight: 'bold', fontSize: '10px', color: COLORS.success, flexShrink: 0 }}>Qty: {order.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {batchItems.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: COLORS.textMuted, fontSize: '11px' }}>No pending items in batch</div>}
            </div>
            
            <div style={{ padding: '10px 12px', borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setShowBatchPopup(false)} style={{ width: '100%', padding: '8px', background: COLORS.primary, color: COLORS.textPrimary, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '500' }}>Close</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes blink { 
          0%, 100% { border-color: ${COLORS.danger}; background-color: ${COLORS.danger}20; } 
          50% { border-color: ${COLORS.danger}; background-color: ${COLORS.danger}10; } 
        }
        @keyframes pulse { 
          0%, 100% { opacity: 1; } 
          50% { opacity: 0.7; } 
        }
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default KitchenDisplay;