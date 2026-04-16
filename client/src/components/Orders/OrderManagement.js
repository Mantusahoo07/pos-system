import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiMinus, FiTrash2, FiEdit2, FiPrinter, FiDollarSign, FiX, 
  FiSearch, FiCheck, FiAlertCircle, FiSave, FiShoppingBag, FiTruck, 
  FiUsers, FiCreditCard, FiSmartphone, FiUserPlus, FiRefreshCw, FiZap, 
  FiCornerDownLeft, FiEdit, FiGrid, FiInfo, FiBookOpen
} from 'react-icons/fi';
import QRCode from 'react-qr-code';
// import toast from 'react-hot-toast'; // REMOVED - Toast notifications disabled
import paymentService from '../../services/paymentService';
import printerService from '../../services/printerService';
import CustomerSelect from './CustomerSelect';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

function OrderManagement({ orders, menu, categories, onAddItem, onRemoveItem, onUpdateQuantity, onCompletePayment, socket }) {
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingToOrderId, setAddingToOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState({});
  const [creditCustomer, setCreditCustomer] = useState({
    customerId: '',
    name: '',
    phone: '',
    email: '',
    dueDate: '',
    amount: 0,
    notes: ''
  });
  const [showTableBillingModal, setShowTableBillingModal] = useState(false);
  const [selectedTableForBilling, setSelectedTableForBilling] = useState(null);
  const [tableOrders, setTableOrders] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [localOrders, setLocalOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tablesList, setTablesList] = useState([]);
  const [showTablesListModal, setShowTablesListModal] = useState(false);
  const [selectedTableForBill, setSelectedTableForBill] = useState(null);
  const [tableBillDetails, setTableBillDetails] = useState(null);
  const [showTableBillDetailModal, setShowTableBillDetailModal] = useState(false);
  
  // Credit Ledger Modal
  const [showCreditLedgerModal, setShowCreditLedgerModal] = useState(false);
  const [creditLedger, setCreditLedger] = useState([]);
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState(null);
  const [creditLedgerLoading, setCreditLedgerLoading] = useState(false);
  
  // Instant Order Modal State
  const [showInstantOrderModal, setShowInstantOrderModal] = useState(false);
  const [instantOrderOrderId, setInstantOrderOrderId] = useState(null);
  const [instantOrderItems, setInstantOrderItems] = useState([]);
  const [instantOrderSearchTerm, setInstantOrderSearchTerm] = useState('');
  const [instantOrderQuantities, setInstantOrderQuantities] = useState({});
  const [instantOrderSubmitting, setInstantOrderSubmitting] = useState(false);
  
  
  // Cash payment state
  const [cashAmount, setCashAmount] = useState('');
  const [cashChange, setCashChange] = useState(0);
  const [showCashInfoModal, setShowCashInfoModal] = useState(false);
  
  // Receipt QR state
  const [showReceiptQRModal, setShowReceiptQRModal] = useState(false);
  const [receiptQRCode, setReceiptQRCode] = useState('');
  
  // Today's orders QR modal
  const [showTodayOrdersQRModal, setShowTodayOrdersQRModal] = useState(false);
  const [todayOrdersQRCode, setTodayOrdersQRCode] = useState('');


const [settings, setSettings] = useState({
  taxRate: 0,
  serviceCharge: 0
});
const [settingsLoading, setSettingsLoading] = useState(true);


  // Get current user role from localStorage
  const getUserRole = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.role;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  // Get order type badge (same as kitchen display)
  const getOrderTypeBadge = (order) => {
    const type = order.orderType || 'dine-in';
    const platform = order.deliveryPlatform;
    
    if (type === 'dine-in') {
      return { letter: `T-${order.tableNumber}`, bgColor: '#02864A', color: 'white' };
    }
    if (type === 'takeaway' || type === 'pickup') {
      return { letter: 'P', bgColor: '#1C1A27', color: 'white' };
    }
    if (type === 'delivery') {
      if (platform === 'zomato') {
        return { letter: 'Z', bgColor: '#E8083E', color: 'white' };
      }
      if (platform === 'swiggy') {
        return { letter: 'S', bgColor: '#FB8D1A', color: 'white' };
      }
      return { letter: 'H', bgColor: '#1C1A27', color: 'white' };
    }
    return { letter: '?', bgColor: '#64748b', color: 'white' };
  };

  // Update local orders when prop changes
  useEffect(() => {
    console.log('📋 OrderManagement - Orders received:', orders.length);
    setLocalOrders(orders);
  }, [orders]);

  // Fetch latest orders
  const fetchLatestOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Fetched latest orders:', data.length);
        setLocalOrders(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
    return null;
  };

  // Fetch credit ledger for a customer
  const fetchCreditLedger = async (customerId, customerName) => {
    try {
      setCreditLedgerLoading(true);
      const response = await fetch(`${API_URL}/orders/credit-ledger/${customerId}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCreditLedger(data);
        setSelectedCreditCustomer({ id: customerId, name: customerName });
        setShowCreditLedgerModal(true);
      } else {
        console.error('Failed to fetch credit ledger');
      }
    } catch (error) {
      console.error('Error fetching credit ledger:', error);
      console.error('Failed to fetch credit ledger');
    } finally {
      setCreditLedgerLoading(false);
    }
  };

  // Fetch tables with active orders - recalculate with current tax rate
const fetchTablesWithOrders = async () => {
  try {
    const response = await fetch(`${API_URL}/tables`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      
      // For each table with running orders, recalculate total with current tax rate
      const tablesWithCorrectTotal = await Promise.all(data.map(async (table) => {
        if (table.status === 'running' && table.runningOrderCount > 0) {
          try {
            // Fetch table details to get actual items
            const detailsResponse = await fetch(`${API_URL}/tables/${table.tableNumber}`, {
              headers: getAuthHeaders()
            });
            if (detailsResponse.ok) {
              const tableDetails = await detailsResponse.json();
              if (tableDetails && tableDetails.runningOrders) {
                // Calculate subtotal WITHOUT tax from items
                let subtotalWithoutTax = 0;
                tableDetails.runningOrders.forEach(order => {
                  if (order.items) {
                    order.items.filter(i => !i.isRemoved).forEach(item => {
                      subtotalWithoutTax += (item.price || 0) * (item.quantity || 1);
                    });
                  }
                });
                
                // Apply current tax rate from settings
                const taxRate = settings.taxRate || 0;
                const serviceChargeRate = settings.serviceCharge || 0;
                const taxAmount = subtotalWithoutTax * (taxRate / 100);
                const serviceChargeAmount = subtotalWithoutTax * (serviceChargeRate / 100);
                const totalWithTax = subtotalWithoutTax + taxAmount + serviceChargeAmount;
                
                return {
                  ...table,
                  totalRunningAmount: totalWithTax,
                  subtotalWithoutTax: subtotalWithoutTax
                };
              }
            }
          } catch (err) {
            console.error('Error fetching table details:', err);
          }
        }
        return table;
      }));
      
      const tablesWithRunningOrders = tablesWithCorrectTotal.filter(table => 
        table.status === 'running' && table.runningOrderCount > 0
      );
      setTablesList(tablesWithRunningOrders);
      return tablesWithRunningOrders;
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
  }
  return [];
};

  // Get table details with orders - with tax-exclusive calculation
const getTableDetails = async (tableNumber) => {
  try {
    const response = await fetch(`${API_URL}/tables/${tableNumber}`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      
      // Recalculate total without tax from items
      let subtotalWithoutTax = 0;
      if (data.runningOrders) {
        data.runningOrders.forEach(order => {
          if (order.items) {
            order.items.filter(i => !i.isRemoved).forEach(item => {
              subtotalWithoutTax += (item.price || 0) * (item.quantity || 1);
            });
          }
        });
      }
      
      // Return modified data with tax-exclusive total
      return {
        ...data,
        totalRunningAmount: subtotalWithoutTax
      };
    }
  } catch (error) {
    console.error('Error fetching table details:', error);
  }
  return null;
};

  // Get display order number
  const getDisplayOrderNumber = (order) => {
    if (order.displayOrderNumber) {
      return order.displayOrderNumber;
    }
    if (order.runningNumber !== undefined && order.runningNumber > 0) {
      return `${order.orderNumber}-${order.runningNumber}`;
    }
    return order.orderNumber;
  };

  // Check if order is a running order (has suffix)
  const isRunningOrder = (order) => {
    return (order.runningNumber || 0) > 0 || order.isRunningOrder === true;
  };

  // Check if Instant Order should be shown (not for running orders)
  const shouldShowInstantOrder = (order) => {
    return !isRunningOrder(order);
  };

  // Separate orders by status - SORT readyForBilling by createdAt OLD TO NEW (ascending)
  const readyForBilling = [...localOrders.filter(o => o.status === 'ready_for_billing')].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const otherOrders = localOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'ready_for_billing');
  
  // Today's completed orders
  const todayCompletedOrders = localOrders.filter(o => {
    if (o.status !== 'completed') return false;
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  // Get credit sales (unpaid orders)
  const creditSalesOrders = localOrders.filter(o => 
    o.payment?.method === 'credit' && 
    o.payment?.status === 'credit_due' &&
    o.status !== 'cancelled'
  );

  const getOrderTypeIcon = (type, platform) => {
    if (type === 'delivery') {
      if (platform === 'zomato') return '🛍️';
      if (platform === 'swiggy') return '📦';
      return '🚚';
    }
    if (type === 'takeaway') return '📦';
    if (type === 'pickup') return '📍';
    return '🍽️';
  };

  const getOrderTypeDisplay = (order) => {
    const type = order.orderType || 'dine-in';
    const platform = order.deliveryPlatform;
    
    if (type === 'delivery') {
      if (platform === 'zomato') return 'Zomato';
      if (platform === 'swiggy') return 'Swiggy';
      return 'Home Delivery';
    }
    if (type === 'pickup' || type === 'takeaway') return 'Takeaway';
    return 'Dine-In';
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount) => `₹${amount?.toFixed(2) || '0.00'}`;

  const calculateOrderTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

// Generate receipt QR code for customer - Using actual order ID
const generateReceiptQR = async (order, paymentDetails) => {
  try {
    console.log('Generating receipt QR for order:', order);
    console.log('Payment details:', paymentDetails);
    console.log('Order total:', order.total);
    
    // Generate a proper receipt ID using actual order ID
    const orderIdentifier = order.displayOrderNumber || order.orderNumber || order.tableNumber || 'TBL';
    const receiptId = `RCP_${orderIdentifier}_${Date.now()}`;
    const isCredit = paymentDetails.method === 'credit';
    const isPaid = paymentDetails.method !== 'pending' && paymentDetails.method !== 'credit';
    
    // Calculate totals - USE THE ORDER'S TOTAL if available, otherwise calculate
    let subtotal = order.subtotal || 0;
    let itemsList = [];
    
    if (order.items && order.items.length > 0) {
      itemsList = order.items.filter(i => !i.isRemoved).map(i => ({
        name: i.name || 'Unknown Item',
        quantity: i.quantity || 1,
        price: i.price || 0,
        total: (i.price || 0) * (i.quantity || 1)
      }));
      subtotal = itemsList.reduce((sum, i) => sum + i.total, 0);
    }
    
    // Use the order's total - this should be the correct amount
    const total = order.total || (subtotal + (order.tax || 0) + (order.serviceCharge || 0));
    
    console.log('Calculated total for receipt:', total);
    
    const receiptData = {
      order: {
        orderNumber: order.orderNumber || orderIdentifier,
        displayOrderNumber: order.displayOrderNumber || orderIdentifier,
        items: itemsList,
        subtotal: subtotal,
        tax: order.tax || 0,
        taxRate: order.taxRate || 0,
        serviceCharge: order.serviceCharge || 0,
        total: total,  // Use the calculated total
        orderType: order.orderType || 'dine-in',
        tableNumber: order.tableNumber,
        customerName: order.customer?.name || 'Walk-In',
        createdAt: order.createdAt || new Date().toISOString(),
        status: isCredit ? 'credit_due' : (isPaid ? 'paid' : 'pending')
      },
      payment: {
        method: paymentDetails.method || 'pending',
        amount: paymentDetails.amount || total,
        transactionId: paymentDetails.transactionId || `TXN_${Date.now()}`,
        paidAt: paymentDetails.paidAt || new Date(),
        change: paymentDetails.change || 0,
        status: isCredit ? 'credit_due' : (isPaid ? 'completed' : 'pending'),
        dueDate: paymentDetails.dueDate || null,
        customerName: paymentDetails.customerName || order.customer?.name,
        customerPhone: paymentDetails.customerPhone || order.customer?.phone,
        notes: paymentDetails.notes || ''
      },
      business: await printerService.fetchBusinessDetails()
    };
    
    console.log('Final receipt data total:', receiptData.order.total);
    
    // Save to backend
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        receiptId,
        orderId: order._id || orderIdentifier,
        orderNumber: order.displayOrderNumber || order.orderNumber || orderIdentifier,
        receiptData
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', response.status, errorText);
      throw new Error(`Server returned ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Receipt saved to backend successfully:', result);
    
    const receiptUrl = `${window.location.origin}/receipt/${receiptId}`;
    setReceiptQRCode(receiptUrl);
    setShowReceiptQRModal(true);
    
    console.log('Receipt ready! Scan QR code to view.');
    return receiptUrl;
    
  } catch (error) {
    console.error('Error generating receipt QR:', error);
    console.error('Failed to generate receipt QR code');
    return null;
  }
};

  const handlePrintBill = async (order) => {
    try {
      const orderTotal = order.total || calculateOrderTotal(order.items);
      const displayNumber = getDisplayOrderNumber(order);
      
      const pendingPaymentDetails = {
        method: 'pending',
        amount: orderTotal,
        status: 'pending',
        paidAt: null,
        transactionId: null,
        gatewayCharges: 0,
        note: 'Bill printed - Payment pending'
      };
      
      await printerService.printReceipt(order, pendingPaymentDetails);
      console.log(`Bill printed for Order ${displayNumber}`);
    } catch (error) {
      console.error('Error printing bill:', error);
      console.error('Failed to print bill');
    }
  };

  const handleAddItem = async (orderId, item) => {
    const itemData = {
      id: item.id || item._id,
      name: item.fullName || item.name,
      quantity: 1,
      price: item.price,
      specialInstructions: '',
      status: 'pending',
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categorySortOrder: item.categorySortOrder || 999
    };
    
    try {
      await onAddItem(orderId, itemData);
      setShowAddItemModal(false);
      setAddingToOrderId(null);
      console.log(`Added ${item.name} to order`);
    } catch (error) {
      console.error('Error adding item:', error);
      console.error(error.message || 'Failed to add item');
    }
  };

  const handleRemoveItem = async (orderId, itemId, itemName) => {
    if (window.confirm(`Remove "${itemName}" from this order?`)) {
      try {
        await onRemoveItem(orderId, itemId);
        if (editingOrder === orderId) {
          setEditItems(prev => {
            const newItems = { ...prev };
            delete newItems[itemId];
            return newItems;
          });
        }
        console.log(`Removed ${itemName} from order`);
        await fetchLatestOrders();
      } catch (error) {
        console.error('Error removing item:', error);
        console.error('Failed to remove item');
      }
    }
  };

  const handleUpdateQuantity = async (orderId, itemId, currentQuantity, delta) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      handleRemoveItem(orderId, itemId, 'item');
      return;
    }
    
    if (editingOrder === orderId) {
      setEditItems(prev => ({
        ...prev,
        [itemId]: newQuantity
      }));
    } else {
      try {
        await onUpdateQuantity(orderId, itemId, newQuantity);
        console.log('Quantity updated');
        await fetchLatestOrders();
      } catch (error) {
        console.error('Error updating quantity:', error);
        console.error('Failed to update quantity');
      }
    }
  };

  const handleModifyOrder = (order) => {
    setSelectedOrder(order);
    setEditingOrder(order._id);
    const initialItems = {};
    order.items.forEach(item => {
      initialItems[item.id] = item.quantity;
    });
    setEditItems(initialItems);
    const displayNumber = getDisplayOrderNumber(order);
    console.log(`Editing Order ${displayNumber}. Click Save when done.`);
  };

  const handleSaveModifications = async () => {
    if (!selectedOrder) return;
    
    let hasChanges = false;
    
    const updates = [];
    for (const [itemId, newQuantity] of Object.entries(editItems)) {
      const originalItem = selectedOrder.items.find(i => i.id === itemId);
      if (originalItem && originalItem.quantity !== newQuantity) {
        updates.push({ itemId, newQuantity, originalItem });
      }
    }
    
    for (const update of updates) {
      try {
        await onUpdateQuantity(selectedOrder._id, update.itemId, update.newQuantity);
        hasChanges = true;
      } catch (error) {
        console.error('Error updating item:', error);
        console.error(`Failed to update ${update.originalItem.name}`);
      }
    }
    
    setEditingOrder(null);
    setEditItems({});
    
    if (hasChanges) {
      console.log('Order modifications saved');
      await fetchLatestOrders();
    } else {
      console.log('No changes were made');
    }
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
    setEditItems({});
    console.log('Edit cancelled');
  };

  const handleBilling = (order) => {
  // Recalculate order total with current settings tax rate
  const orderSubtotal = order.items ? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (order.subtotal || 0);
  const taxRate = settings.taxRate || 0;
  const serviceChargeRate = settings.serviceCharge || 0;
  const taxAmount = orderSubtotal * (taxRate / 100);
  const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
  const recalculatedTotal = orderSubtotal + taxAmount + serviceChargeAmount;
  
  // Create a copy of the order with recalculated total
  const updatedOrder = {
    ...order,
    subtotal: orderSubtotal,
    tax: taxAmount,
    taxRate: taxRate,
    serviceCharge: serviceChargeAmount,
    serviceChargeRate: serviceChargeRate,
    total: recalculatedTotal
  };
  
  setSelectedOrder(updatedOrder);
  setShowBillModal(true);
};

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    
    try {
      const response = await fetch(`${API_URL}/orders/${orderToCancel._id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (response.ok) {
        const displayNumber = getDisplayOrderNumber(orderToCancel);
        console.log(`Order ${displayNumber} has been cancelled`);
        setShowCancelModal(false);
        setOrderToCancel(null);
        setCancelReason('');
        await fetchLatestOrders();
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      console.error('Failed to cancel order');
    }
  };

  // Open table billing modal with list of tables
  const handleTableBillingClick = async () => {
    setShowTablesListModal(true);
    await fetchTablesWithOrders();
  };

  // Handle table selection from list
  const handleTableSelect = async (table) => {
    setSelectedTableForBill(table);
    setShowTablesListModal(false);
    
    const tableDetails = await getTableDetails(table.tableNumber);
    if (tableDetails) {
      setTableBillDetails(tableDetails);
      setShowTableBillDetailModal(true);
    }
  };

  const handlePrintTableBill = async () => {
    if (!tableBillDetails) return;
    
    const combinedOrder = {
      orderNumber: `TABLE-${tableBillDetails.tableNumber}`,
      displayOrderNumber: `T-${tableBillDetails.tableNumber}`,
      items: [],
      total: tableBillDetails.totalRunningAmount,
      customer: { name: `Table ${tableBillDetails.tableNumber}` },
      orderType: 'dine-in',
      tableNumber: tableBillDetails.tableNumber,
      createdAt: new Date()
    };
    
    tableBillDetails.runningOrders.forEach(order => {
      combinedOrder.items.push(...order.items.filter(item => !item.isRemoved));
    });
    
    const pendingPaymentDetails = {
      method: 'pending',
      amount: tableBillDetails.totalRunningAmount,
      status: 'pending',
      paidAt: null,
      transactionId: null,
      gatewayCharges: 0,
      note: 'Table Bill - Payment pending'
    };
    
    await printerService.printReceipt(combinedOrder, pendingPaymentDetails);
    console.log(`Table ${tableBillDetails.tableNumber} bill printed`);
  };

  const processTableBilling = async () => {
    if (!tableBillDetails) return;
    
    const combinedOrder = {
      _id: `TABLE_${tableBillDetails.tableNumber}`,
      orderNumber: `TABLE-${tableBillDetails.tableNumber}`,
      displayOrderNumber: `T-${tableBillDetails.tableNumber}`,
      items: [],
      total: tableBillDetails.totalRunningAmount,
      subtotal: tableBillDetails.totalRunningAmount,
      tax: 0,
      serviceCharge: 0,
      customer: { name: `Table ${tableBillDetails.tableNumber}` },
      orderType: 'dine-in',
      tableNumber: tableBillDetails.tableNumber,
      status: 'ready_for_billing',
      createdAt: new Date(),
      tableSessionId: tableBillDetails.currentSessionId
    };
    
    tableBillDetails.runningOrders.forEach(order => {
      combinedOrder.items.push(...order.items.filter(item => !item.isRemoved));
    });
    
    setSelectedOrder(combinedOrder);
    setSelectedTableForBill(tableBillDetails);
    setShowTableBillDetailModal(false);
    setShowBillModal(true);
  };

  const completeTablePayment = async (orderId, paymentDetails) => {
    if (!selectedTableForBill) return;
    
    setProcessingPayment(true);
    
    try {
      const response = await fetch(`${API_URL}/orders/table/${selectedTableForBill.tableNumber}/complete-billing`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId: selectedTableForBill.currentSessionId })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        console.log(`Billing completed for Table ${selectedTableForBill.tableNumber}. ${result.count} order(s) closed.`);
        
        const combinedOrder = {
          orderNumber: `TABLE-${selectedTableForBill.tableNumber}`,
          displayOrderNumber: `T-${selectedTableForBill.tableNumber}`,
          items: [],
          total: selectedTableForBill.totalRunningAmount,
          customer: { name: `Table ${selectedTableForBill.tableNumber}` },
          orderType: 'dine-in',
          tableNumber: selectedTableForBill.tableNumber,
          createdAt: new Date()
        };
        
        selectedTableForBill.runningOrders.forEach(order => {
          combinedOrder.items.push(...order.items.filter(item => !item.isRemoved));
        });
        
        await printerService.printReceipt(combinedOrder, paymentDetails);
        
        // Generate receipt QR for table billing
        await generateReceiptQR(combinedOrder, paymentDetails);
        
        setShowBillModal(false);
        setSelectedOrder(null);
        setSelectedTableForBill(null);
        setTableBillDetails(null);
        await fetchLatestOrders();
        await fetchTablesWithOrders();
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to complete billing');
      }
    } catch (error) {
      console.error('Error completing table billing:', error);
      console.error('Failed to complete billing');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCardPayment = async () => {
  if (!selectedOrder) return;
  
  // Recalculate total with current settings
  const orderSubtotal = selectedOrder.items ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (selectedOrder.subtotal || 0);
  const taxRate = settings.taxRate || 0;
  const serviceChargeRate = settings.serviceCharge || 0;
  const taxAmount = orderSubtotal * (taxRate / 100);
  const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
  const recalculatedTotal = orderSubtotal + taxAmount + serviceChargeAmount;
  
  // Update selectedOrder with recalculated values
  const updatedOrder = {
    ...selectedOrder,
    subtotal: orderSubtotal,
    tax: taxAmount,
    taxRate: taxRate,
    serviceCharge: serviceChargeAmount,
    serviceChargeRate: serviceChargeRate,
    total: recalculatedTotal
  };
  setSelectedOrder(updatedOrder);
  
  setProcessingPayment(true);
  
  console.log('Opening payment gateway...');
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Please login again to make payment');
      setProcessingPayment(false);
      return;
    }
    
    const gatewayCharges = recalculatedTotal * 0.02;
    const totalWithCharges = recalculatedTotal + gatewayCharges;
    
    const customerName = selectedOrder.customer?.name || 
      (selectedOrder.orderType === 'delivery' ? 'Delivery Customer' : 'Walk-In Customer');
    const customerPhone = selectedOrder.customer?.phone || '';
    const customerEmail = selectedOrder.customer?.email || '';
    
    let restaurantName = 'Restaurant POS';
    try {
      const businessResponse = await fetch(`${API_URL}/business`, {
        headers: getAuthHeaders()
      });
      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        restaurantName = businessData.name || 'Restaurant POS';
      }
    } catch (err) {
      console.error('Error fetching business details:', err);
    }
    
    const result = await paymentService.processCardPayment(totalWithCharges, {
      orderNumber: selectedOrder.displayOrderNumber || selectedOrder.orderNumber,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: customerEmail,
      restaurantName: restaurantName
    });
    
    if (result && result.success) {
      const paymentDetails = {
        method: 'card',
        amount: recalculatedTotal,
        gatewayCharges: gatewayCharges,
        transactionId: result.transactionId,
        paidAt: new Date()
      };
      
      if (selectedOrder._id && String(selectedOrder._id).startsWith('TABLE_')) {
        await completeTablePayment(selectedOrder._id, paymentDetails);
      } else {
        await onCompletePayment(selectedOrder._id, paymentDetails);
        await printerService.printReceipt(updatedOrder, paymentDetails);
        
        setShowBillModal(false);
        setSelectedOrder(null);
        
        await generateReceiptQR(updatedOrder, paymentDetails);
        
        console.log(`Payment successful! Gateway charges: ₹${gatewayCharges.toFixed(2)}`);
        await fetchLatestOrders();
      }
    } else {
      throw new Error('Payment failed');
    }
  } catch (error) {
    console.error('Card payment error:', error);
    
    let errorMessage = error.message || 'Payment failed. Please try again.';
    
    if (errorMessage.includes('login again') || errorMessage.includes('Session expired')) {
      errorMessage = 'Session expired. Please login again.';
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      }, 2000);
    }
    
    console.error(errorMessage);
  } finally {
    setProcessingPayment(false);
  }
};

  const handleUPIPayment = () => {
    setShowBillModal(false);
    setShowUPIModal(true);
  };

  const handleCashPayment = () => {
  // Recalculate total with current settings
  const orderSubtotal = selectedOrder?.items ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (selectedOrder?.subtotal || 0);
  const taxRate = settings.taxRate || 0;
  const serviceChargeRate = settings.serviceCharge || 0;
  const taxAmount = orderSubtotal * (taxRate / 100);
  const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
  const recalculatedTotal = orderSubtotal + taxAmount + serviceChargeAmount;
  
  setShowBillModal(false);
  setCashAmount(recalculatedTotal.toString());
  setCashChange(0);
  setShowCashModal(true);
};

  const processCashPayment = async () => {
    if (!selectedOrder) return;
    
    const amountReceived = parseFloat(cashAmount);
    if (isNaN(amountReceived) || amountReceived < selectedOrder.total) {
      console.error(`Amount received (₹${amountReceived}) is less than total (${formatCurrency(selectedOrder.total)})`);
      return;
    }
    
    const change = amountReceived - selectedOrder.total;
    
    setShowCashInfoModal(true);
    setShowCashModal(false);
    setCashAmount('');
    setCashChange(0);
  };

  const generateTodayOrdersQR = async () => {
  if (todayCompletedOrders.length === 0) {
    console.error('No completed orders today');
    return;
  }
  
  try {
    const ordersId = `TODAY_ORDERS_${Date.now()}`;
    const businessDetails = await printerService.fetchBusinessDetails();
    
    const ordersData = {
      date: new Date().toISOString(),
      totalOrders: todayCompletedOrders.length,
      totalRevenue: todayCompletedOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      business: businessDetails,
      orders: todayCompletedOrders.map(order => ({
        orderId: order._id,
        orderNumber: order.displayOrderNumber || order.orderNumber,
        orderNumberDisplay: order.displayOrderNumber || order.orderNumber,
        items: order.items.filter(i => !i.isRemoved).map(i => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          total: i.price * i.quantity
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        taxRate: order.taxRate || 0,
        serviceCharge: order.serviceCharge || 0,
        total: order.total,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        customerName: order.customer?.name || 'Walk-In',
        createdAt: order.createdAt,
        paymentMethod: order.payment?.method,
        paymentStatus: order.payment?.status,
        transactionId: order.payment?.transactionId,
        paidAt: order.payment?.timestamp
      }))
    };
    
    // Save to localStorage for access
    localStorage.setItem(`receipt_${ordersId}`, JSON.stringify(ordersData));
    
    // Also save to backend for persistent access
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        receiptId: ordersId,
        orderId: `TODAY_ORDERS_${new Date().toISOString().split('T')[0]}`,
        orderNumber: `TODAY_${new Date().toISOString().split('T')[0]}`,
        receiptData: ordersData
      })
    });
    
    const ordersUrl = `${window.location.origin}/receipt/${ordersId}`;
    setTodayOrdersQRCode(ordersUrl);
    setShowTodayOrdersQRModal(true);
    console.log(`QR code generated for ${todayCompletedOrders.length} orders. Scan to view all bills.`);
  } catch (error) {
    console.error('Error generating today orders QR:', error);
    console.error('Failed to generate QR code');
  }
};

  const handleCreditPayment = () => {
  // Recalculate total with current settings
  const orderSubtotal = selectedOrder?.items ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (selectedOrder?.subtotal || 0);
  const taxRate = settings.taxRate || 0;
  const serviceChargeRate = settings.serviceCharge || 0;
  const taxAmount = orderSubtotal * (taxRate / 100);
  const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
  const recalculatedTotal = orderSubtotal + taxAmount + serviceChargeAmount;
  
  setShowBillModal(false);
  setCreditCustomer({
    customerId: '',
    name: '',
    phone: '',
    email: '',
    dueDate: '',
    amount: recalculatedTotal,
    notes: ''
  });
  setShowCreditModal(true);
};

  const processCreditSale = async () => {
  if (!selectedOrder) return;
  if (!creditCustomer.name) {
    console.error('Please select a customer');
    return;
  }
  
  setProcessingPayment(true);
  
  try {
    // Ensure the selectedOrder has the correct total
    const orderSubtotal = selectedOrder.items ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (selectedOrder.subtotal || 0);
    const taxRate = settings.taxRate || 0;
    const serviceChargeRate = settings.serviceCharge || 0;
    const taxAmount = orderSubtotal * (taxRate / 100);
    const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
    const recalculatedTotal = orderSubtotal + taxAmount + serviceChargeAmount;
    
    const updatedOrder = {
      ...selectedOrder,
      subtotal: orderSubtotal,
      tax: taxAmount,
      taxRate: taxRate,
      serviceCharge: serviceChargeAmount,
      serviceChargeRate: serviceChargeRate,
      total: recalculatedTotal
    };
    
    const paymentDetails = {
      method: 'credit',
      amount: recalculatedTotal,
      transactionId: `CREDIT_${Date.now()}`,
      paidAt: new Date(),
      dueDate: creditCustomer.dueDate || null,
      customerName: creditCustomer.name,
      customerPhone: creditCustomer.phone,
      customerEmail: creditCustomer.email,
      notes: creditCustomer.notes,
      status: 'credit_due'
    };
    
    await onCompletePayment(selectedOrder._id, paymentDetails);
    await printerService.printReceipt(updatedOrder, paymentDetails);
    
    setShowCreditModal(false);
    setSelectedOrder(null);
    setCreditCustomer({ customerId: '', name: '', phone: '', email: '', dueDate: '', amount: 0, notes: '' });
    
    // Generate receipt QR with the updated order and correct total
    await generateReceiptQR(updatedOrder, paymentDetails);
    
    console.log(`Credit sale recorded for ${creditCustomer.name}. Amount due: ${formatCurrency(recalculatedTotal)}`);
    await fetchLatestOrders();
  } catch (error) {
    console.error('Credit sale error:', error);
    console.error('Failed to process credit sale');
  } finally {
    setProcessingPayment(false);
  }
};

  const getItemQuantity = (order, itemId) => {
    if (editingOrder === order._id && editItems[itemId] !== undefined) {
      return editItems[itemId];
    }
    const item = order.items.find(i => i.id === itemId);
    return item?.quantity || 0;
  };

  const filteredMenu = menu.filter(item => 
    (item.fullName || item.name)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInstantMenu = menu.filter(item => 
    (item.fullName || item.name)?.toLowerCase().includes(instantOrderSearchTerm.toLowerCase())
  );

  const updateInstantOrderQuantity = (itemId, delta) => {
    setInstantOrderQuantities(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const getInstantOrderQuantity = (itemId) => {
    return instantOrderQuantities[itemId] || 0;
  };

  const calculateInstantOrderTotal = () => {
    let total = 0;
    for (const [itemId, qty] of Object.entries(instantOrderQuantities)) {
      const menuItem = menu.find(m => (m._id || m.id) === itemId);
      if (menuItem && qty > 0) {
        total += menuItem.price * qty;
      }
    }
    return total;
  };

  const openInstantOrderModal = (order) => {
    if (isRunningOrder(order)) {
      console.error('Instant order not available for running orders. Please complete current order first.');
      return;
    }
    setInstantOrderOrderId(order._id);
    setInstantOrderItems([]);
    setInstantOrderQuantities({});
    setInstantOrderSearchTerm('');
    setShowInstantOrderModal(true);
  };

  const submitInstantOrder = async () => {
    const itemsToAdd = [];
    for (const [itemId, qty] of Object.entries(instantOrderQuantities)) {
      if (qty > 0) {
        const menuItem = menu.find(m => (m._id || m.id) === itemId);
        if (menuItem) {
          itemsToAdd.push({
            id: menuItem._id || menuItem.id,
            name: menuItem.fullName || menuItem.name,
            quantity: qty,
            price: menuItem.price,
            categoryId: menuItem.category,
            categoryName: menuItem.categoryName,
            categorySortOrder: menuItem.categorySortOrder || 999,
            specialInstructions: ''
          });
        }
      }
    }

    if (itemsToAdd.length === 0) {
      console.error('Please select at least one item');
      return;
    }

    setInstantOrderSubmitting(true);

    try {
      const currentOrder = localOrders.find(o => o._id === instantOrderOrderId);
      
      if (!currentOrder) {
        console.error('Order not found');
        setInstantOrderSubmitting(false);
        return;
      }
      
      if (isRunningOrder(currentOrder)) {
        console.error('Cannot add instant order to running order');
        setInstantOrderSubmitting(false);
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const item of itemsToAdd) {
        try {
          await onAddItem(instantOrderOrderId, item);
          successCount++;
        } catch (error) {
          console.error('Error adding item:', error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchLatestOrders();
        
        const activeSocket = socket || window.socket;
        if (activeSocket && activeSocket.connected) {
          activeSocket.emit('instant-order-request', {
            orderId: instantOrderOrderId,
            orderNumber: currentOrder.displayOrderNumber || currentOrder.orderNumber,
            items: itemsToAdd,
            timestamp: new Date()
          });
          console.log(`Instant order placed! Added ${successCount} item(s) to Order ${currentOrder.displayOrderNumber}`);
        } else {
          console.log(`Order placed. Added ${successCount} item(s) to Order ${currentOrder.displayOrderNumber}`);
        }
        
        setShowInstantOrderModal(false);
        setInstantOrderQuantities({});
        setInstantOrderOrderId(null);
      }
      
      if (failCount > 0) {
        console.warn(`${failCount} item(s) failed to add`);
      }
      
    } catch (error) {
      console.error('Error submitting instant order:', error);
      console.error('Failed to place instant order');
    } finally {
      setInstantOrderSubmitting(false);
    }
  };

  const instantOrderTotal = calculateInstantOrderTotal();

  // Cash payment change calculation
  useEffect(() => {
    if (selectedOrder && cashAmount) {
      const amount = parseFloat(cashAmount);
      if (!isNaN(amount)) {
        const change = amount - selectedOrder.total;
        setCashChange(change > 0 ? change : 0);
      }
    }
  }, [cashAmount, selectedOrder]);
  
  
  // Fetch settings for tax rate
const fetchSettings = async () => {
  try {
    const response = await fetch(`${API_URL}/settings`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      setSettings(data);
      console.log('Settings loaded:', data);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
  } finally {
    setSettingsLoading(false);
  }
};

useEffect(() => {
  fetchSettings();
}, []);

  // Billing Order Card Component (with tax above total)
  // Billing Order Card Component - Using settings for tax
const BillingOrderCard = ({ order, onBill, onPrintBill, onInstantOrder, onModify, onCancelOrder, isEditing, onSave, onCancelEdit, editQuantities, onUpdateQuantity, onRemoveItem }) => {
  // Calculate subtotal WITHOUT tax (sum of item prices)
const orderSubtotal = order.items ? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (order.subtotal || 0);
// Use settings tax rate from backend
const taxRate = settings.taxRate || 0;
const serviceChargeRate = settings.serviceCharge || 0;
const taxAmount = orderSubtotal * (taxRate / 100);
const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
const orderTotal = orderSubtotal + taxAmount + serviceChargeAmount;
  
  const displayNumber = getDisplayOrderNumber(order);
  const runningNumber = order.runningNumber || 0;
  const isRunning = isRunningOrder(order);
  const activeItems = order.items.filter(item => !item.isRemoved);
  const showInstantOrderBtn = shouldShowInstantOrder(order);
  const typeBadge = getOrderTypeBadge(order);
  const hasTax = taxRate > 0;
  const hasServiceCharge = serviceChargeRate > 0;
  
  return (
    <div style={{
      background: '#1E1C2D',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      border: isRunning ? `2px solid #FB8D1A` : `1px solid #2D2A3F`,
      fontSize: '9px',
      display: 'flex',
      flexDirection: 'column',
      height: 'auto',
      minHeight: '260px',
      maxHeight: '380px'
    }}>
      {showInstantOrderBtn && (
        <button
          onClick={() => onInstantOrder(order)}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#573CFA',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '8px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FiZap size={10} /> Instant Order
        </button>
      )}
      
      <div style={{ padding: '8px 10px', background: '#2D2A3F', borderBottom: `1px solid ${isRunning ? '#FB8D1A' : '#3D3A50'}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
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
            <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#FFFFFF' }}>#{displayNumber}</span>
            {order.tableNumber && !typeBadge.letter.includes('T') && (
              <span style={{ fontSize: '8px', color: '#A0A0B8' }}>T-{order.tableNumber}</span>
            )}
            {isRunning && !showInstantOrderBtn && (
              <span style={{ 
                fontSize: '7px', 
                background: '#E8083E', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '10px',
                fontWeight: 'bold'
              }}>
                PRIORITY
              </span>
            )}
          </div>
          <div style={{ fontSize: '8px', color: '#A0A0B8' }}>{formatTime(order.createdAt)}</div>
        </div>
        <div style={{ fontSize: '8px', fontWeight: '500', color: '#FFFFFF' }}>{order.customer?.name?.split(' ')[0] || 'Walk-In'}</div>
        <div style={{ fontSize: '7px', color: '#A0A0B8', marginTop: '2px' }}>{getOrderTypeDisplay(order)}</div>
        
        {order.hasModifications && !isEditing && (
          <div style={{
            marginTop: '4px',
            padding: '2px 6px',
            background: 'rgba(232, 8, 62, 0.15)',
            color: '#E8083E',
            borderRadius: '4px',
            fontSize: '6px',
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <FiEdit size={6} /> Modified
          </div>
        )}
      </div>
      
      <div style={{ 
        padding: '8px 10px', 
        flex: 1, 
        overflowY: 'auto', 
        minHeight: 0,
        background: isEditing ? 'rgba(87, 60, 250, 0.1)' : 'transparent'
      }}>
        {activeItems.map((item, index) => {
          const currentQty = isEditing ? (editQuantities[item.id] !== undefined ? editQuantities[item.id] : item.quantity) : item.quantity;
          const isPendingCancellation = item.cancellationRequested && !item.cancellationApproved;
          const isModified = isEditing ? (editQuantities[item.id] !== item.quantity) : item.isModified;
          const isNewItem = isModified && !item.oldQuantity;
          const isQuantityChanged = isModified && item.oldQuantity && item.oldQuantity !== item.quantity;
          
          return (
            <div key={item.id}>
              {isPendingCancellation && (
                <div style={{
                  fontSize: '6px',
                  background: 'rgba(251, 141, 26, 0.15)',
                  color: '#FB8D1A',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  display: 'inline-block'
                }}>
                  ⏳ Pending Cancellation
                </div>
              )}
              
              {isEditing ? (
                <div style={{ 
                  padding: '6px 0',
                  borderBottom: index !== activeItems.length - 1 ? '1px solid #3D3A50' : 'none'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: '500', color: '#FFFFFF', flex: 1 }}>{item.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(item.price * currentQty)}</span>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Remove "${item.name}" from this order?`)) {
                            onRemoveItem(order._id, item.id, item.name);
                          }
                        }} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#E8083E', 
                          cursor: 'pointer', 
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remove"
                      >
                        <FiTrash2 size={8} />
                      </button>
                    </div>
                  </div>
                  
                  {(isNewItem || isQuantityChanged) && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ 
                        fontSize: '6px', 
                        background: isNewItem ? '#02864A' : '#FB8D1A', 
                        color: 'white', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {isNewItem ? 'NEW' : 'MODIFIED'}
                      </span>
                    </div>
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginTop: '4px'
                  }}>
                    <span style={{ fontSize: '7px', color: '#A0A0B8' }}>Qty:</span>
                    <button 
                      onClick={() => onUpdateQuantity(order._id, item.id, currentQty, -1)} 
                      style={{ 
                        width: '22px', 
                        height: '22px', 
                        background: '#3D3A50', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                      }}
                    >
                      <FiMinus size={8} />
                    </button>
                    <span style={{ 
                      fontWeight: 'bold', 
                      fontSize: '9px', 
                      minWidth: '20px', 
                      textAlign: 'center',
                      color: '#FFFFFF'
                    }}>
                      {currentQty}
                    </span>
                    <button 
                      onClick={() => onUpdateQuantity(order._id, item.id, currentQty, 1)} 
                      style={{ 
                        width: '22px', 
                        height: '22px', 
                        background: '#3D3A50', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                      }}
                    >
                      <FiPlus size={8} />
                    </button>
                    {isQuantityChanged && (
                      <span style={{ 
                        fontSize: '6px', 
                        background: '#dbeafe', 
                        color: '#3b82f6', 
                        padding: '2px 4px', 
                        borderRadius: '4px',
                        marginLeft: '4px'
                      }}>
                        Was: {item.oldQuantity}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '6px 0', 
                  borderBottom: index !== activeItems.length - 1 ? '1px solid #3D3A50' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <span style={{ fontWeight: 'bold', fontSize: '8px', color: '#FFFFFF', flexShrink: 0 }}>{currentQty}×</span>
                    <span style={{ fontSize: '8px', color: '#FFFFFF', wordBreak: 'break-word' }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(item.price * currentQty)}</span>
                    {isModified && !isEditing && (
                      <span style={{ 
                        fontSize: '6px', 
                        background: isNewItem ? '#02864A' : '#FB8D1A', 
                        color: 'white', 
                        padding: '2px 5px', 
                        borderRadius: '4px'
                      }}>
                        {isNewItem ? 'NEW' : (item.oldQuantity ? `${item.oldQuantity}→${item.quantity}` : 'MOD')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {activeItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '15px', color: '#A0A0B8', fontSize: '8px' }}>
            No items in this order
          </div>
        )}
      </div>
      
      <div style={{ padding: '8px 10px', borderTop: '1px solid #3D3A50', background: '#2D2A3F', flexShrink: 0 }}>
        {/* Tax and Service Charge above total - using settings */}
        {hasTax && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '7px', color: '#A0A0B8' }}>
            <span>Tax ({taxRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        )}
        {hasServiceCharge && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '7px', color: '#A0A0B8' }}>
            <span>Service Charge ({serviceChargeRate}%):</span>
            <span>{formatCurrency(serviceChargeAmount)}</span>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 'bold' }}>
          <span style={{ fontSize: '8px', color: '#FFFFFF' }}>Total</span>
          <span style={{ fontSize: '9px', color: '#02864A', fontWeight: 'bold' }}>{formatCurrency(orderTotal)}</span>
        </div>
        
{isEditing ? (
  <div style={{ display: 'flex', gap: '6px' }}>
    <button 
      onClick={onSave} 
      style={{ 
        flex: 1, 
        padding: '5px 8px', 
        background: '#02864A', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        fontSize: '8px', 
        fontWeight: '500', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '4px'
      }}
    >
      <FiSave size={8} /> Save
    </button>
    <button 
      onClick={() => {
        if (window.confirm(`Are you sure you want to delete Order ${displayNumber}? This action cannot be undone.`)) {
          onCancelOrder(order);
        }
      }} 
      style={{ 
        flex: 1, 
        padding: '5px 8px', 
        background: '#E8083E', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        fontSize: '8px', 
        fontWeight: '500', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '4px'
      }}
    >
      <FiTrash2 size={8} /> Delete
    </button>
    <button 
      onClick={onCancelEdit} 
      style={{ 
        flex: 1, 
        padding: '5px 8px', 
        background: '#94a3b8', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        fontSize: '8px', 
        fontWeight: '500', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '4px'
      }}
    >
      <FiX size={8} /> Cancel
    </button>
  </div>
) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            {isAdmin && (
              <button 
                onClick={() => onModify(order)} 
                style={{ 
                  flex: 1, 
                  padding: '5px 8px', 
                  background: '#2196F3',
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '8px', 
                  fontWeight: '500', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '4px'
                }}
              >
                <FiEdit2 size={8} /> Edit
              </button>
            )}
            <button 
              onClick={() => onPrintBill(order)} 
              style={{ 
                flex: isAdmin ? 1 : 2,
                padding: '5px 8px', 
                background: '#573CFA', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '8px', 
                fontWeight: '500', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '4px'
              }}
            >
              <FiPrinter size={8} /> Print
            </button>
            <button 
              onClick={() => onBill(order)} 
              style={{ 
                flex: isAdmin ? 1 : 2,
                padding: '5px 8px', 
                background: '#FB8D1A', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '8px', 
                fontWeight: '500', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '4px'
              }}
            >
              <FiDollarSign size={8} /> Pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

  // Regular Order Card Component (with tax above total)
  // Regular Order Card Component - Using settings for tax
const RegularOrderCard = ({ order, onModify, onAddItemClick, onRemoveItem, onUpdateQuantity, isEditing, onSave, onCancel, editQuantities, onCancelOrder }) => {
  // Calculate subtotal WITHOUT tax (sum of item prices)
const orderSubtotal = order.items ? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (order.subtotal || 0);
// Use settings tax rate from backend
const taxRate = settings.taxRate || 0;
const serviceChargeRate = settings.serviceCharge || 0;
const taxAmount = orderSubtotal * (taxRate / 100);
const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
const orderTotal = orderSubtotal + taxAmount + serviceChargeAmount;
  
  const displayNumber = getDisplayOrderNumber(order);
  const runningNumber = order.runningNumber || 0;
  const isRunning = isRunningOrder(order);
  const activeItems = order.items.filter(item => !item.isRemoved);
  const showInstantOrderBtn = shouldShowInstantOrder(order);
  const typeBadge = getOrderTypeBadge(order);
  const hasTax = taxRate > 0;
  const hasServiceCharge = serviceChargeRate > 0;
  
  return (
      <div style={{
        background: '#1E1C2D',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        border: isRunning ? `2px solid #FB8D1A` : `1px solid #2D2A3F`,
        fontSize: '9px',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto',
        minHeight: '260px',
        maxHeight: '380px'
      }}>
        {showInstantOrderBtn && (
          <button
            onClick={() => onAddItemClick(order._id)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#573CFA',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '8px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FiZap size={10} /> Add Item
          </button>
        )}
        
        <div style={{ padding: '8px 10px', background: '#2D2A3F', borderBottom: `1px solid ${isRunning ? '#FB8D1A' : '#3D3A50'}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
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
              <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#FFFFFF' }}>#{displayNumber}</span>
              {order.tableNumber && !typeBadge.letter.includes('T') && (
                <span style={{ fontSize: '8px', color: '#A0A0B8' }}>T-{order.tableNumber}</span>
              )}
              {isRunning && !showInstantOrderBtn && (
                <span style={{ 
                  fontSize: '7px', 
                  background: '#E8083E', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  PRIORITY
                </span>
              )}
            </div>
            <div style={{ fontSize: '8px', color: '#A0A0B8' }}>{formatTime(order.createdAt)}</div>
          </div>
          <div style={{ fontSize: '8px', fontWeight: '500', color: '#FFFFFF' }}>{order.customer?.name?.split(' ')[0] || 'Walk-In'}</div>
          <div style={{ fontSize: '7px', color: '#A0A0B8', marginTop: '2px' }}>{getOrderTypeDisplay(order)}</div>
          
          {order.hasModifications && !isEditing && (
            <div style={{
              marginTop: '4px',
              padding: '2px 6px',
              background: 'rgba(232, 8, 62, 0.15)',
              color: '#E8083E',
              borderRadius: '4px',
              fontSize: '6px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <FiEdit size={6} /> Modified
            </div>
          )}
        </div>
        
        <div style={{ 
          padding: '8px 10px', 
          flex: 1, 
          overflowY: 'auto', 
          minHeight: 0,
          background: isEditing ? 'rgba(87, 60, 250, 0.1)' : 'transparent'
        }}>
          {activeItems.map(item => {
            const currentQty = getItemQuantity(order, item.id);
            const isModified = editingOrder === order._id ? (editQuantities[item.id] !== item.quantity) : item.isModified;
            const isNewItem = isModified && !item.oldQuantity;
            const isQuantityChanged = isModified && item.oldQuantity && item.oldQuantity !== item.quantity;
            const isPendingCancellation = item.cancellationRequested && !item.cancellationApproved;
            
            return (
              <div key={item.id}>
                {isPendingCancellation && (
                  <div style={{
                    fontSize: '6px',
                    background: 'rgba(251, 141, 26, 0.15)',
                    color: '#FB8D1A',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'inline-block'
                  }}>
                    ⏳ Pending Cancellation
                  </div>
                )}
                
                {isEditing ? (
                  <div style={{ 
                    padding: '6px 0',
                    borderBottom: '1px solid #3D3A50'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: '500', color: '#FFFFFF', flex: 1 }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(item.price * currentQty)}</span>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Remove "${item.name}" from this order?`)) {
                              onRemoveItem(order._id, item.id, item.name);
                            }
                          }} 
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#E8083E', 
                            cursor: 'pointer', 
                            padding: '3px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Remove"
                        >
                          <FiTrash2 size={8} />
                        </button>
                      </div>
                    </div>
                    
                    {(isNewItem || isQuantityChanged) && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ 
                          fontSize: '6px', 
                          background: isNewItem ? '#02864A' : '#FB8D1A', 
                          color: 'white', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          {isNewItem ? 'NEW' : 'MODIFIED'}
                        </span>
                      </div>
                    )}
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      marginTop: '4px'
                    }}>
                      <span style={{ fontSize: '7px', color: '#A0A0B8' }}>Qty:</span>
                      <button 
                        onClick={() => onUpdateQuantity(order._id, item.id, currentQty, -1)} 
                        style={{ 
                          width: '22px', 
                          height: '22px', 
                          background: '#3D3A50', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF'
                        }}
                      >
                        <FiMinus size={8} />
                      </button>
                      <span style={{ 
                        fontWeight: 'bold', 
                        fontSize: '9px', 
                        minWidth: '20px', 
                        textAlign: 'center',
                        color: '#FFFFFF'
                      }}>
                        {currentQty}
                      </span>
                      <button 
                        onClick={() => onUpdateQuantity(order._id, item.id, currentQty, 1)} 
                        style={{ 
                          width: '22px', 
                          height: '22px', 
                          background: '#3D3A50', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF'
                        }}
                      >
                        <FiPlus size={8} />
                      </button>
                      {isQuantityChanged && (
                        <span style={{ 
                          fontSize: '6px', 
                          background: '#dbeafe', 
                          color: '#3b82f6', 
                          padding: '2px 4px', 
                          borderRadius: '4px',
                          marginLeft: '4px'
                        }}>
                          Was: {item.oldQuantity}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '6px 0', 
                    borderBottom: '1px solid #3D3A50', 
                    background: 'transparent'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '8px', color: '#FFFFFF', minWidth: '20px', flexShrink: 0 }}>{currentQty}×</span>
                        <span style={{ fontSize: '8px', color: '#FFFFFF', flex: 1, wordBreak: 'break-word' }}>{item.name}</span>
                      </div>
                      {isModified && !isEditing && (
                        <div style={{ marginTop: '4px', marginLeft: '20px' }}>
                          <span style={{ 
                            fontSize: '6px', 
                            background: isNewItem ? '#02864A' : '#FB8D1A', 
                            color: 'white', 
                            padding: '2px 5px', 
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {isNewItem ? 'NEW' : (item.oldQuantity ? `${item.oldQuantity}→${item.quantity}` : 'MOD')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(item.price * currentQty)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {activeItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '15px', color: '#A0A0B8', fontSize: '8px' }}>
              No items in this order
            </div>
          )}
        </div>
        
        <div style={{ padding: '8px 10px', borderTop: '1px solid #3D3A50', background: '#2D2A3F', flexShrink: 0 }}>
          {/* Tax and Service Charge above total - using settings */}
          {hasTax && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '7px', color: '#A0A0B8' }}>
              <span>Tax ({taxRate}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          {hasServiceCharge && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '7px', color: '#A0A0B8' }}>
              <span>Service Charge ({serviceChargeRate}%):</span>
              <span>{formatCurrency(serviceChargeAmount)}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 'bold' }}>
            <span style={{ fontSize: '8px', color: '#FFFFFF' }}>Total</span>
            <span style={{ fontSize: '9px', color: '#02864A', fontWeight: 'bold' }}>{formatCurrency(orderTotal)}</span>
          </div>
          
          {isEditing ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={onSave} 
                style={{ 
                  flex: 1, 
                  padding: '5px 8px', 
                  background: '#02864A', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '8px', 
                  fontWeight: '500', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '4px'
                }}
              >
                <FiSave size={8} /> Save
              </button>
              <button 
                onClick={onCancel} 
                style={{ 
                  flex: 1, 
                  padding: '5px 8px', 
                  background: '#E8083E', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '8px', 
                  fontWeight: '500', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '4px'
                }}
              >
                <FiX size={8} /> Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => onModify(order)} 
                style={{ 
                  flex: 1, 
                  padding: '5px 8px', 
                  background: '#2196F3',
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '8px', 
                  fontWeight: '500', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '4px'
                }}
              >
                <FiEdit2 size={8} /> Edit
              </button>
              <button 
                onClick={() => onCancelOrder(order)} 
                style={{ 
                  flex: 1, 
                  padding: '5px 8px', 
                  background: '#E8083E', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '8px', 
                  fontWeight: '500', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '4px'
                }}
              >
                <FiTrash2 size={8} /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

    const OrderColumn = ({ title, icon, orders, type, onModify, onBill, onAddItemClick, onPrintBill, onCancelOrder, onInstantOrder }) => (
  <div style={{ background: '#12111A', borderRadius: '12px', padding: '12px', height: 'fit-content', border: '1px solid #2D2A3F', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 170px)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${type === 'billing' ? '#FB8D1A' : '#573CFA'}`, flexShrink: 0 }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#FFFFFF' }}>{title}</span>
      <span style={{ background: '#2D2A3F', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', marginLeft: 'auto', color: '#FFFFFF' }}>{orders.length}</span>
    </div>
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        {orders.map(order => {
          const isEditingBilling = editingOrder === order._id;
          
          return type === 'billing' ? (
            <BillingOrderCard 
              key={order._id} 
              order={order} 
              onBill={() => onBill(order)} 
              onPrintBill={() => onPrintBill(order)}
              onInstantOrder={() => onInstantOrder(order)}
              onModify={() => onModify(order)}
              onCancelOrder={() => onCancelOrder(order)}
              isEditing={isEditingBilling}
              onSave={handleSaveModifications}
              onCancelEdit={handleCancelEdit}
              editQuantities={editItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          ) : (
            <RegularOrderCard
              key={order._id}
              order={order}
              onModify={() => onModify(order)}
              onAddItemClick={onAddItemClick}
              onRemoveItem={handleRemoveItem}
              onUpdateQuantity={handleUpdateQuantity}
              onCancelOrder={onCancelOrder}
              isEditing={editingOrder === order._id}
              onSave={handleSaveModifications}
              onCancel={handleCancelEdit}
              editQuantities={editItems}
            />
          );
        })}
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#1E1C2D', borderRadius: '8px', color: '#A0A0B8', fontSize: '10px', border: '1px solid #2D2A3F' }}>No orders</div>
        )}
      </div>
    </div>
  </div>
);

 return (
  <div style={{ padding: '12px', height: 'calc(100vh - 56px)', overflow: 'hidden', background: '#12111A', display: 'flex', flexDirection: 'column' }}>
    {/* Header - Fixed at top */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
      <h2 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#FFFFFF' }}>Order Management</h2>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        {creditSalesOrders.length > 0 && (
          <button
            onClick={() => setShowCreditLedgerModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#FB8D1A',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '500'
            }}
          >
            <FiBookOpen size={14} />
            Credit Ledger ({creditSalesOrders.length})
          </button>
        )}
        {todayCompletedOrders.length > 0 && (
          <button
            onClick={generateTodayOrdersQR}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#573CFA',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '500'
            }}
          >
            <FiGrid size={14} />
            Today's Orders QR ({todayCompletedOrders.length})
          </button>
        )}
        <button
          onClick={handleTableBillingClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#02864A',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '500'
          }}
        >
          <FiUsers size={14} />
          Table Billing
        </button>
      </div>
    </div>
    
    {/* Orders Containers - Each with independent scrolling */}
    <div style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingBottom: '8px' }}>
      {localOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#1E1C2D', borderRadius: '12px', color: '#A0A0B8', border: '1px solid #2D2A3F' }}>
          No orders found. Create orders from POS.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          <OrderColumn
  title="Ready for Billing"
  icon="💰"
  orders={readyForBilling}
  type="billing"
  onModify={handleModifyOrder}
  onBill={handleBilling}
  onPrintBill={handlePrintBill}
  onAddItemClick={(orderId) => { setAddingToOrderId(orderId); setShowAddItemModal(true); }}
  onCancelOrder={handleCancelOrder}
  onInstantOrder={openInstantOrderModal}
/>
          <OrderColumn
            title="Active Orders"
            icon="📋"
            orders={otherOrders}
            type="active"
            onModify={handleModifyOrder}
            onBill={handleBilling}
            onPrintBill={handlePrintBill}
            onAddItemClick={(orderId) => { setAddingToOrderId(orderId); setShowAddItemModal(true); }}
            onCancelOrder={handleCancelOrder}
            onInstantOrder={openInstantOrderModal}
          />
        </div>
      )}
    </div>
      
      {/* All remaining modals remain exactly the same as before */}
      {/* Cancel Order Modal */}
      {showCancelModal && orderToCancel && (
        <>
          <div onClick={() => setShowCancelModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '350px',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            padding: '20px',
            border: '1px solid #2D2A3F'
          }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#FFFFFF' }}>Cancel Order {getDisplayOrderNumber(orderToCancel)}?</h3>
            <p style={{ fontSize: '11px', color: '#A0A0B8', marginBottom: '16px' }}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #2D2A3F',
                borderRadius: '6px',
                fontSize: '11px',
                marginBottom: '16px',
                resize: 'vertical',
                background: '#2D2A3F',
                color: '#FFFFFF'
              }}
              rows="2"
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '8px', background: '#2D2A3F', color: '#A0A0B8', border: '1px solid #3D3A50', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>No, Keep Order</button>
              <button onClick={confirmCancelOrder} style={{ flex: 1, padding: '8px', background: '#E8083E', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>Yes, Cancel Order</button>
            </div>
          </div>
        </>
      )}
      
      {/* Tables List Modal */}
      {showTablesListModal && (
        <>
          <div onClick={() => setShowTablesListModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '80vh',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #2D2A3F'
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2D2A3F', background: '#02864A', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUsers size={16} /> Tables with Open Bills
              </h2>
              <button onClick={() => setShowTablesListModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <FiX size={18} />
              </button>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {tablesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#A0A0B8' }}>
                  No tables with open bills
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tablesList.map(table => (
                    <div
                      key={table.tableNumber}
                      onClick={() => handleTableSelect(table)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#2D2A3F',
                        borderRadius: '8px',
                        border: '1px solid #3D3A50',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#3D3A50'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#2D2A3F'}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#FFFFFF' }}>Table {table.tableNumber}</div>
                        <div style={{ fontSize: '10px', color: '#A0A0B8' }}>{table.runningOrderCount} order(s) running</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#02864A' }}>
                          {formatCurrency(table.totalRunningAmount || 0)}
                        </div>
                        <div style={{ fontSize: '9px', color: '#FB8D1A' }}>Click to bill</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ padding: '12px 16px', borderTop: '1px solid #2D2A3F' }}>
              <button
                onClick={() => setShowTablesListModal(false)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2D2A3F',
                  color: '#A0A0B8',
                  border: '1px solid #3D3A50',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

{/* Table Bill Detail Modal */}
{showTableBillDetailModal && tableBillDetails && (
  <>
    <div onClick={() => setShowTableBillDetailModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '500px',
      maxHeight: '80vh',
      background: '#1E1C2D',
      borderRadius: '12px',
      overflow: 'hidden',
      zIndex: 2001,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #2D2A3F'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2D2A3F', background: '#02864A', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUsers size={16} /> Table {tableBillDetails.tableNumber} Billing
        </h2>
        <button onClick={() => setShowTableBillDetailModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <FiX size={18} />
        </button>
      </div>
      
      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        {/* Items List */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', marginBottom: '10px', fontWeight: '600', color: '#FFFFFF' }}>Items:</h4>
          {tableBillDetails.runningOrders && tableBillDetails.runningOrders.map((order, orderIdx) => (
            <div key={order.id || orderIdx} style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '600', 
                color: '#FB8D1A', 
                marginBottom: '6px',
                paddingBottom: '4px',
                borderBottom: '1px solid #3D3A50'
              }}>
                Order #{order.displayOrderNumber || order.orderNumber}
              </div>
              {order.items && order.items.filter(i => !i.isRemoved).map((item, itemIdx) => (
                <div key={itemIdx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '10px', 
                  marginBottom: '6px', 
                  marginLeft: '8px',
                  color: '#A0A0B8'
                }}>
                  <span>{item.quantity}× {item.name}</span>
                  <span style={{ color: '#02864A', fontWeight: '500' }}>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        
{/* Totals Section - Calculate from items directly */}
{(() => {
  // Calculate subtotal WITHOUT tax from all items (price × quantity)
  let subtotalWithoutTax = 0;
  if (tableBillDetails.runningOrders) {
    tableBillDetails.runningOrders.forEach(order => {
      if (order.items) {
        order.items.filter(i => !i.isRemoved).forEach(item => {
          subtotalWithoutTax += (item.price || 0) * (item.quantity || 1);
        });
      }
    });
  }
  
  // Get tax and service charge rates from settings
  const taxRate = settings.taxRate || 0;
  const serviceChargeRate = settings.serviceCharge || 0;
  
  // Calculate tax and service charge ONLY if rates are > 0
  const taxAmount = taxRate > 0 ? subtotalWithoutTax * (taxRate / 100) : 0;
  const serviceChargeAmount = serviceChargeRate > 0 ? subtotalWithoutTax * (serviceChargeRate / 100) : 0;
  
  // Calculate total (subtotal + tax + service charge)
  const totalWithTax = subtotalWithoutTax + taxAmount + serviceChargeAmount;
  
  return (
    <div style={{ 
      marginTop: '16px', 
      paddingTop: '12px', 
      borderTop: '1px solid #3D3A50',
      background: '#2D2A3F',
      borderRadius: '8px',
      padding: '12px'
    }}>
      {/* Subtotal (without tax) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px' }}>
        <span style={{ color: '#A0A0B8' }}>Subtotal:</span>
        <span style={{ color: '#FFFFFF', fontWeight: '500' }}>{formatCurrency(subtotalWithoutTax)}</span>
      </div>
      
      {/* Tax - Only show if taxRate > 0 */}
      {taxRate > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px' }}>
          <span style={{ color: '#A0A0B8' }}>Tax ({taxRate}%):</span>
          <span style={{ color: '#FFFFFF', fontWeight: '500' }}>
            {formatCurrency(taxAmount)}
          </span>
        </div>
      )}
      
      {/* Service Charge - Only show if serviceChargeRate > 0 */}
      {serviceChargeRate > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px' }}>
          <span style={{ color: '#A0A0B8' }}>Service Charge ({serviceChargeRate}%):</span>
          <span style={{ color: '#FFFFFF', fontWeight: '500' }}>
            {formatCurrency(serviceChargeAmount)}
          </span>
        </div>
      )}
      
      {/* Total */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '10px', 
        paddingTop: '10px', 
        borderTop: '1px solid #3D3A50',
        fontSize: '13px',
        fontWeight: 'bold'
      }}>
        <span style={{ color: '#FFFFFF' }}>Total Amount:</span>
        <span style={{ color: '#02864A', fontSize: '15px' }}>
          {formatCurrency(totalWithTax)}
        </span>
      </div>
    </div>
  );
})()}
      </div>
      
      <div style={{ padding: '12px 16px', borderTop: '1px solid #2D2A3F', display: 'flex', gap: '10px' }}>
        <button
          onClick={handlePrintTableBill}
          style={{
            flex: 1,
            padding: '10px',
            background: '#573CFA',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FiPrinter size={14} /> Print Bill
        </button>
        <button
          onClick={processTableBilling}
          style={{
            flex: 2,
            padding: '10px',
            background: '#FB8D1A',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FiDollarSign size={14} /> Pay Now
        </button>
      </div>
    </div>
  </>
)}
      
      {/* Credit Ledger Modal */}
      {showCreditLedgerModal && (
        <>
          <div onClick={() => setShowCreditLedgerModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #2D2A3F'
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2D2A3F', background: '#FB8D1A', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiBookOpen size={16} /> Credit Ledger
              </h2>
              <button onClick={() => setShowCreditLedgerModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <FiX size={18} />
              </button>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {creditSalesOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#A0A0B8' }}>
                  No credit sales found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Group by customer */}
                  {Object.entries(
                    creditSalesOrders.reduce((acc, order) => {
                      const customerName = order.customer?.name || order.payment?.customerName || 'Unknown Customer';
                      const customerId = order.customer?._id || order.payment?.customerId || customerName;
                      if (!acc[customerId]) {
                        acc[customerId] = {
                          customerName,
                          customerId,
                          totalDue: 0,
                          orders: []
                        };
                      }
                      acc[customerId].totalDue += order.total || 0;
                      acc[customerId].orders.push(order);
                      return acc;
                    }, {})
                  ).map(([customerId, customerData]) => (
                    <div key={customerId} style={{
                      border: '1px solid #3D3A50',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '10px 12px',
                        background: '#2D2A3F',
                        borderBottom: '1px solid #3D3A50',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#FFFFFF' }}>{customerData.customerName}</div>
                          <div style={{ fontSize: '9px', color: '#A0A0B8' }}>{customerData.orders.length} order(s)</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(customerData.totalDue)}</div>
                          <div style={{ fontSize: '8px', color: '#FB8D1A' }}>Total Due</div>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        {customerData.orders.map(order => (
                          <div key={order._id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: '1px solid #2D2A3F',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setShowCreditLedgerModal(false);
                            setSelectedOrder(order);
                            setShowBillModal(true);
                          }}>
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#FFFFFF' }}>Order #{order.displayOrderNumber || order.orderNumber}</div>
                              <div style={{ fontSize: '8px', color: '#A0A0B8' }}>{formatTime(order.createdAt)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(order.total)}</div>
                              {order.payment?.dueDate && (
                                <div style={{ fontSize: '7px', color: '#FB8D1A' }}>Due: {new Date(order.payment.dueDate).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ padding: '12px 16px', borderTop: '1px solid #2D2A3F' }}>
              <button
                onClick={() => setShowCreditLedgerModal(false)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2D2A3F',
                  color: '#A0A0B8',
                  border: '1px solid #3D3A50',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Payment Modal */}
      {showBillModal && selectedOrder && (
        <>
          <div onClick={() => setShowBillModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '380px',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            border: '1px solid #2D2A3F'
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2D2A3F', background: '#FB8D1A', color: 'white' }}>
              <h2 style={{ fontSize: '14px', margin: 0 }}>Payment - Order {getDisplayOrderNumber(selectedOrder)}</h2>
              {isRunningOrder(selectedOrder) && (
                <span style={{ fontSize: '9px', background: '#E8083E', color: 'white', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px' }}>
                  Running Order
                </span>
              )}
              {selectedOrder.payment?.method === 'credit' && selectedOrder.payment?.status === 'credit_due' && (
                <span style={{ fontSize: '9px', background: '#FB8D1A', color: 'white', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px' }}>
                  Credit Due
                </span>
              )}
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(selectedOrder.total)}</div>
                <div style={{ fontSize: '11px', color: '#A0A0B8' }}>Total Amount</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
<button 
  onClick={async () => {
    // Recalculate total with current settings for the QR code
    const orderSubtotal = selectedOrder.items ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (selectedOrder.subtotal || 0);
    const taxRate = settings.taxRate || 0;
    const serviceChargeRate = settings.serviceCharge || 0;
    const taxAmount = orderSubtotal * (taxRate / 100);
    const serviceChargeAmount = orderSubtotal * (serviceChargeRate / 100);
    const recalculatedTotal = orderSubtotal + taxAmount + serviceChargeAmount;
    
    const updatedOrderForQR = {
      ...selectedOrder,
      subtotal: orderSubtotal,
      tax: taxAmount,
      taxRate: taxRate,
      serviceCharge: serviceChargeAmount,
      serviceChargeRate: serviceChargeRate,
      total: recalculatedTotal
    };
    
    let paymentMethod = 'pending';
    let paymentStatus = 'pending';
    
    // Check if this is a credit sale
    if (selectedOrder.payment?.method === 'credit' || selectedOrder.payment?.status === 'credit_due') {
      paymentMethod = 'credit';
      paymentStatus = 'credit_due';
    }
    
    const pendingPaymentDetails = {
      method: paymentMethod,
      amount: recalculatedTotal,
      status: paymentStatus,
      paidAt: null,
      transactionId: selectedOrder.payment?.transactionId || null,
      gatewayCharges: 0,
      note: paymentMethod === 'credit' ? 'Credit sale - Payment pending' : 'Bill - Payment pending',
      dueDate: selectedOrder.payment?.dueDate,
      customerName: selectedOrder.payment?.customerName || selectedOrder.customer?.name,
      customerPhone: selectedOrder.payment?.customerPhone || selectedOrder.customer?.phone,
      notes: selectedOrder.payment?.notes
    };
    
    await generateReceiptQR(updatedOrderForQR, pendingPaymentDetails);
    setShowBillModal(false);
  }} 
  style={{ 
    padding: '10px', 
    background: '#573CFA', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '8px' 
  }}
>
  <FiGrid size={16} /> View Bill QR
</button>
                
                <button onClick={handleCashPayment} style={{ padding: '10px', background: '#02864A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FiCornerDownLeft size={16} /> Cash Payment
                </button>
                <button onClick={handleCardPayment} disabled={processingPayment} style={{ padding: '10px', background: '#573CFA', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FiCreditCard size={16} /> Card Payment (2% extra)
                </button>
                <button onClick={handleUPIPayment} style={{ padding: '10px', background: '#573CFA', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FiSmartphone size={16} /> UPI / QR Code
                </button>
                <button onClick={handleCreditPayment} style={{ padding: '10px', background: '#FB8D1A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FiUserPlus size={16} /> Credit Sale
                </button>
                <button onClick={() => setShowBillModal(false)} style={{ padding: '8px', background: '#2D2A3F', color: '#A0A0B8', border: '1px solid #3D3A50', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Cash Payment Modal */}
      {showCashModal && selectedOrder && (
        <>
          <div onClick={() => setShowCashModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '350px',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            padding: '20px',
            border: '1px solid #2D2A3F'
          }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', color: '#FFFFFF' }}>Cash Payment</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px', color: '#A0A0B8' }}>Total Amount</label>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(selectedOrder.total)}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px', color: '#A0A0B8' }}>Amount Received</label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #2D2A3F',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#2D2A3F',
                  color: '#FFFFFF'
                }}
                placeholder="Enter amount received"
                autoFocus
              />
            </div>
            {cashChange > 0 && (
              <div style={{ marginBottom: '16px', padding: '10px', background: 'rgba(2, 134, 74, 0.1)', borderRadius: '8px', border: '1px solid rgba(2, 134, 74, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#FFFFFF' }}>
                  <span>Change to return:</span>
                  <span style={{ fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(cashChange)}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCashModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#2D2A3F',
                  color: '#A0A0B8',
                  border: '1px solid #3D3A50',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={processCashPayment}
                style={{
                  flex: 2,
                  padding: '10px',
                  background: '#FB8D1A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* UPI QR Modal */}
      {showUPIModal && selectedOrder && (
        <>
          <div onClick={() => setShowUPIModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '350px',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            textAlign: 'center',
            padding: '20px',
            border: '1px solid #2D2A3F'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#FFFFFF' }}>Scan to Pay</h3>
            <div style={{ background: '#1E1C2D', padding: '16px', display: 'inline-block', borderRadius: '12px', marginBottom: '16px', border: '1px solid #2D2A3F' }}>
              <QRCode value={`upi://pay?pa=paytm.s1yxcay@pty&pn=Restaurant%20POS&am=${selectedOrder.total}&cu=INR&tn=Order%20${selectedOrder.orderNumber}`} size={200} />
            </div>
            <p style={{ fontSize: '12px', marginBottom: '8px', color: '#A0A0B8' }}>UPI ID: <strong style={{ color: '#FFFFFF' }}>paytm.s1yxcay@pty</strong></p>
            <p style={{ fontSize: '12px', marginBottom: '16px', color: '#A0A0B8' }}>Amount: <strong style={{ color: '#02864A' }}>{formatCurrency(selectedOrder.total)}</strong></p>
            <button onClick={async () => {
              const paymentDetails = { method: 'upi', amount: selectedOrder.total, transactionId: `UPI_${Date.now()}`, paidAt: new Date() };
              
              if (selectedOrder._id && String(selectedOrder._id).startsWith('TABLE_')) {
                await completeTablePayment(selectedOrder._id, paymentDetails);
              } else {
                await onCompletePayment(selectedOrder._id, paymentDetails);
                await printerService.printReceipt(selectedOrder, paymentDetails);
                
                setShowUPIModal(false);
                setSelectedOrder(null);
                
                await generateReceiptQR(selectedOrder, paymentDetails);
                
                console.log('Payment recorded');
                await fetchLatestOrders();
              }
              
              setShowUPIModal(false);
            }} style={{ width: '100%', padding: '10px', background: '#02864A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Confirm Payment</button>
          </div>
        </>
      )}
      
      {/* Credit Sale Modal */}
      {showCreditModal && selectedOrder && (
        <>
          <div onClick={() => setShowCreditModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '450px',
            maxHeight: '80vh',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'auto',
            zIndex: 2001,
            padding: '20px',
            border: '1px solid #2D2A3F'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', margin: 0, color: '#FFFFFF' }}>Credit Sale - Order {getDisplayOrderNumber(selectedOrder)}</h3>
              <button onClick={() => setShowCreditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A0B8' }}><FiX size={18} /></button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: '#A0A0B8' }}>Customer *</label>
              {creditCustomer.name ? (
                <div style={{ padding: '10px', background: 'rgba(2, 134, 74, 0.1)', border: '1px solid #02864A', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#FFFFFF' }}>{creditCustomer.name}</div>
                    <div style={{ fontSize: '10px', color: '#A0A0B8' }}>{creditCustomer.phone}</div>
                    {creditCustomer.email && <div style={{ fontSize: '9px', color: '#A0A0B8' }}>{creditCustomer.email}</div>}
                  </div>
                  <button onClick={() => setCreditCustomer({ customerId: '', name: '', phone: '', email: '', dueDate: '', amount: selectedOrder.total, notes: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8083E' }}><FiX size={16} /></button>
                </div>
              ) : (
                <button onClick={() => setShowCustomerSelect(true)} style={{ width: '100%', padding: '10px', border: '1px dashed #573CFA', borderRadius: '8px', background: 'rgba(87, 60, 250, 0.1)', cursor: 'pointer', fontSize: '11px', color: '#573CFA', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <FiUserPlus size={14} /> Select or Add Customer
                </button>
              )}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: '#A0A0B8' }}>Due Date (Optional)</label>
              <input type="date" value={creditCustomer.dueDate} onChange={(e) => setCreditCustomer({ ...creditCustomer, dueDate: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #2D2A3F', borderRadius: '6px', fontSize: '11px', background: '#2D2A3F', color: '#FFFFFF' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: '#A0A0B8' }}>Notes (Optional)</label>
              <textarea
                placeholder="Add any notes about this credit sale..."
                value={creditCustomer.notes}
                onChange={(e) => setCreditCustomer({ ...creditCustomer, notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #2D2A3F',
                  borderRadius: '6px',
                  fontSize: '11px',
                  resize: 'vertical',
                  background: '#2D2A3F',
                  color: '#FFFFFF'
                }}
                rows="2"
              />
            </div>
            <div style={{ marginBottom: '16px', padding: '12px', background: '#2D2A3F', borderRadius: '8px', border: '1px solid #3D3A50' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#A0A0B8' }}>
                <span>Order Amount:</span>
                <span style={{ fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
            <button onClick={processCreditSale} disabled={processingPayment || !creditCustomer.name} style={{ width: '100%', padding: '10px', background: (processingPayment || !creditCustomer.name) ? '#2D2A3F' : '#FB8D1A', color: 'white', border: 'none', borderRadius: '8px', cursor: (processingPayment || !creditCustomer.name) ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
              {processingPayment ? 'Processing...' : 'Process Credit Sale'}
            </button>
            <button onClick={() => setShowCreditModal(false)} style={{ width: '100%', padding: '8px', background: '#2D2A3F', border: '1px solid #3D3A50', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#A0A0B8' }}>Cancel</button>
          </div>
        </>
      )}
      
      {/* Customer Select Modal */}
      {showCustomerSelect && (
        <>
          <div onClick={() => setShowCustomerSelect(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2100 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '400px', maxHeight: '80vh', background: '#1E1C2D', borderRadius: '12px', overflow: 'hidden', zIndex: 2101, border: '1px solid #2D2A3F' }}>
            <CustomerSelect onSelect={(customer) => {
              setCreditCustomer({
                customerId: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email || '',
                dueDate: creditCustomer.dueDate,
                amount: selectedOrder?.total || 0,
                notes: creditCustomer.notes
              });
              setShowCustomerSelect(false);
            }} onClose={() => setShowCustomerSelect(false)} selectedCustomer={null} />
          </div>
        </>
      )}
      
      {/* Add Item Modal */}
      {showAddItemModal && (
        <>
          <div onClick={() => setShowAddItemModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '70vh',
            background: '#1E1C2D',
            borderRadius: '8px',
            overflow: 'hidden',
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #2D2A3F'
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #2D2A3F', background: '#573CFA', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '12px', margin: 0 }}>Add Item to Order</h2>
              <button onClick={() => setShowAddItemModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={12} /></button>
            </div>
            <div style={{ padding: '8px' }}>
              <div style={{ position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: '#A0A0B8', fontSize: '11px' }} />
                <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '5px 5px 5px 24px', border: '1px solid #2D2A3F', borderRadius: '5px', marginBottom: '8px', fontSize: '10px', background: '#2D2A3F', color: '#FFFFFF' }} />
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {filteredMenu.map(item => {
                  const itemWithId = {
                    ...item,
                    id: item._id || item.id,
                    fullName: item.name,
                    categoryId: item.category,
                    categoryName: item.categoryName,
                    categorySortOrder: item.categorySortOrder || 999
                  };
                  return (
                    <div key={itemWithId.id} onClick={() => handleAddItem(addingToOrderId, itemWithId)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', borderBottom: '1px solid #2D2A3F', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '500', color: '#FFFFFF' }}>{itemWithId.fullName}</div>
                        <div style={{ fontSize: '8px', color: '#A0A0B8' }}>{itemWithId.categoryName || 'Menu Item'}</div>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#02864A' }}>{formatCurrency(itemWithId.price)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: '6px 8px', borderTop: '1px solid #2D2A3F' }}>
              <button onClick={() => setShowAddItemModal(false)} style={{ width: '100%', padding: '5px', background: '#2D2A3F', border: '1px solid #3D3A50', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', color: '#A0A0B8' }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Instant Order Modal */}
      {showInstantOrderModal && (
        <>
          <div onClick={() => setShowInstantOrderModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '450px',
            maxHeight: '80vh',
            background: '#1E1C2D',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #2D2A3F'
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2D2A3F', background: '#573CFA', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiZap size={16} /> Instant Order
              </h2>
              <button onClick={() => setShowInstantOrderModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={18} /></button>
            </div>
            
            <div style={{ padding: '12px', borderBottom: '1px solid #2D2A3F', background: '#2D2A3F' }}>
              <p style={{ fontSize: '10px', color: '#A0A0B8', margin: 0 }}>
                Add items that need immediate preparation. Kitchen will be notified separately.
              </p>
            </div>
            
            <div style={{ padding: '12px' }}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <FiSearch style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#A0A0B8', fontSize: '12px' }} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={instantOrderSearchTerm}
                  onChange={(e) => setInstantOrderSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    border: '1px solid #2D2A3F',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: '#2D2A3F',
                    color: '#FFFFFF'
                  }}
                  autoFocus
                />
              </div>
              
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {filteredInstantMenu.map(item => {
                  const itemId = item._id || item.id;
                  const quantity = getInstantOrderQuantity(itemId);
                  
                  return (
                    <div
                      key={itemId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px',
                        borderBottom: '1px solid #2D2A3F',
                        background: quantity > 0 ? 'rgba(2, 134, 74, 0.1)' : 'transparent'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: '500', color: '#FFFFFF' }}>{item.name}</div>
                        <div style={{ fontSize: '9px', color: '#A0A0B8' }}>{formatCurrency(item.price)}</div>
                      </div>
                      
                      {quantity > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => updateInstantOrderQuantity(itemId, -1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              background: '#E8083E',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FiMinus size={12} />
                          </button>
                          <span style={{ fontWeight: 'bold', fontSize: '13px', minWidth: '30px', textAlign: 'center', color: '#FFFFFF' }}>{quantity}</span>
                          <button
                            onClick={() => updateInstantOrderQuantity(itemId, 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              background: '#02864A',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FiPlus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateInstantOrderQuantity(itemId, 1)}
                          style={{
                            padding: '6px 12px',
                            background: '#573CFA',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
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
                
                {filteredInstantMenu.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#A0A0B8', fontSize: '11px' }}>
                    No items found
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ padding: '12px 16px', borderTop: '1px solid #2D2A3F', background: '#2D2A3F' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 'bold' }}>
                <span style={{ fontSize: '12px', color: '#FFFFFF' }}>Total to Add:</span>
                <span style={{ fontSize: '14px', color: '#02864A', fontWeight: 'bold' }}>{formatCurrency(instantOrderTotal)}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowInstantOrderModal(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#2D2A3F',
                    color: '#A0A0B8',
                    border: '1px solid #3D3A50',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitInstantOrder}
                  disabled={instantOrderSubmitting || instantOrderTotal === 0}
                  style={{
                    flex: 2,
                    padding: '8px',
                    background: (instantOrderSubmitting || instantOrderTotal === 0) ? '#2D2A3F' : '#573CFA',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (instantOrderSubmitting || instantOrderTotal === 0) ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <FiZap size={12} />
                  {instantOrderSubmitting ? 'Placing...' : 'Place Instant Order'}
                </button>
              </div>
            </div>
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
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1C1A27;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #2D2A3F;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #3D3A50;
        }
      `}</style>
      
      {/* Receipt QR Code Modal */}
      {showReceiptQRModal && (
        <>
          <div onClick={() => setShowReceiptQRModal(false)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 3000
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '380px',
            background: '#1E1C2D',
            borderRadius: '16px',
            overflow: 'hidden',
            zIndex: 3001,
            textAlign: 'center',
            padding: '24px',
            border: '1px solid #2D2A3F'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#FFFFFF' }}>Receipt QR Code</h3>
            
            <div style={{ 
              background: '#1E1C2D', 
              padding: '16px', 
              display: 'inline-block', 
              borderRadius: '12px', 
              marginBottom: '16px',
              border: '1px solid #2D2A3F'
            }}>
              <QRCode value={receiptQRCode} size={180} />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#A0A0B8' }}>Amount Due: </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#FB8D1A' }}>
                {formatCurrency(selectedOrder?.total || 0)}
              </span>
            </div>
            
            <p style={{ fontSize: '10px', color: '#A0A0B8', marginBottom: '16px' }}>
              Scan this QR code to view receipt details
            </p>
            
            <button
              onClick={() => setShowReceiptQRModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#573CFA',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
      
      {/* Today's Orders QR Modal */}
      {showTodayOrdersQRModal && (
        <>
          <div onClick={() => setShowTodayOrdersQRModal(false)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 3000
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '380px',
            background: '#1E1C2D',
            borderRadius: '16px',
            overflow: 'hidden',
            zIndex: 3001,
            textAlign: 'center',
            padding: '24px',
            border: '1px solid #2D2A3F'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#FFFFFF' }}>Today's Completed Orders</h3>
            <div style={{ background: '#1E1C2D', padding: '16px', display: 'inline-block', borderRadius: '12px', marginBottom: '16px', border: '1px solid #2D2A3F' }}>
              <QRCode value={todayOrdersQRCode} size={200} />
            </div>
            <p style={{ fontSize: '11px', color: '#A0A0B8', marginBottom: '8px' }}>
              Total Orders: {todayCompletedOrders.length}
            </p>
            <p style={{ fontSize: '11px', color: '#A0A0B8', marginBottom: '8px' }}>
              Total Revenue: {formatCurrency(todayCompletedOrders.reduce((sum, o) => sum + (o.total || 0), 0))}
            </p>
            <p style={{ fontSize: '11px', color: '#A0A0B8', marginBottom: '16px', wordBreak: 'break-all' }}>
              Scan to view all today's completed orders
            </p>
            <button
              onClick={() => setShowTodayOrdersQRModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#573CFA',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
      
      {/* Cash Info Modal */}
{/* Cash Info Modal */}
{showCashInfoModal && selectedOrder && (
  <>
    <div onClick={() => setShowCashInfoModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '350px',
      background: '#1E1C2D',
      borderRadius: '12px',
      overflow: 'hidden',
      zIndex: 2001,
      padding: '24px',
      textAlign: 'center',
      border: '1px solid #2D2A3F'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        background: 'rgba(251, 141, 26, 0.15)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px'
      }}>
        <FiInfo size={30} color="#FB8D1A" />
      </div>
      <h3 style={{ fontSize: '16px', marginBottom: '8px', color: '#FFFFFF' }}>Cash Payment</h3>
      <p style={{ fontSize: '12px', color: '#A0A0B8', marginBottom: '16px' }}>
        Amount to collect: <strong style={{ color: '#02864A' }}>{formatCurrency(selectedOrder.total)}</strong>
      </p>
      <div style={{
        background: 'rgba(2, 134, 74, 0.1)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid rgba(2, 134, 74, 0.2)'
      }}>
        <p style={{ fontSize: '11px', color: '#02864A', margin: 0 }}>
          ✓ Confirm after receiving cash at the counter
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setShowCashInfoModal(false)}
          style={{
            flex: 1,
            padding: '10px',
            background: '#2D2A3F',
            color: '#A0A0B8',
            border: '1px solid #3D3A50',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            // Complete the cash payment
            const paymentDetails = {
              method: 'cash',
              amount: selectedOrder.total,
              transactionId: `CASH_${Date.now()}`,
              paidAt: new Date(),
              change: cashChange || 0
            };
            
            setProcessingPayment(true);
            
            try {
              if (selectedOrder._id && String(selectedOrder._id).startsWith('TABLE_')) {
                await completeTablePayment(selectedOrder._id, paymentDetails);
              } else {
                await onCompletePayment(selectedOrder._id, paymentDetails);
                await printerService.printReceipt(selectedOrder, paymentDetails);
                await generateReceiptQR(selectedOrder, paymentDetails);
              }
              
              setShowCashInfoModal(false);
              setShowBillModal(false);
              setSelectedOrder(null);
              setCashAmount('');
              setCashChange(0);
              console.log(`Payment of ${formatCurrency(selectedOrder.total)} received in cash!`);
              await fetchLatestOrders();
            } catch (error) {
              console.error('Error completing cash payment:', error);
              console.error('Failed to complete payment');
            } finally {
              setProcessingPayment(false);
            }
          }}
          disabled={processingPayment}
          style={{
            flex: 2,
            padding: '10px',
            background: '#02864A',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: processingPayment ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          {processingPayment ? 'Processing...' : '✓ Mark as Paid'}
        </button>
      </div>
    </div>
  </>
)}
    </div>
  );
}

export default OrderManagement;