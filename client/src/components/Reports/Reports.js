import React, { useState, useEffect, useRef } from 'react';
import { 
  FiCalendar, FiTrendingUp, FiDollarSign, FiShoppingBag, FiUsers, 
  FiTruck, FiPackage, FiPieChart, FiBarChart2, FiDownload, FiPrinter, 
  FiSearch, FiChevronLeft, FiChevronRight, FiX, FiClock, FiStar,
  FiAward, FiTrendingDown, FiRefreshCw, FiEye, FiBookOpen, FiUser,
  FiPhone, FiMail, FiMapPin, FiCreditCard, FiActivity, FiTarget,
  FiZap, FiTrendingUp as FiTrend, FiPercent, FiDollarSign as FiMoney,
  FiGrid
} from 'react-icons/fi';
import QRCode from 'react-qr-code';
// import toast from 'react-hot-toast'; // REMOVED - Toast notifications disabled

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

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

function Reports({ orders, menu, categories }) {
  const [activeReport, setActiveReport] = useState('orders');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [selectedOrderForQR, setSelectedOrderForQR] = useState(null);
  const printRef = useRef();

  // Build category map from categories data
  const categoryMap = new Map();
  categories.forEach(cat => {
    categoryMap.set(cat._id, cat.name);
  });

  // Generate QR code for order receipt
  const generateOrderQR = async (order) => {
    try {
      const orderIdentifier = order.displayOrderNumber || order.orderNumber;
      const receiptId = `RCP_${orderIdentifier}_${Date.now()}`;
      
      // Calculate totals
      let subtotal = 0;
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
      
      const taxRate = order.taxRate || 0;
      const tax = order.tax || (subtotal * taxRate / 100);
      const serviceCharge = order.serviceCharge || 0;
      const total = order.total || (subtotal + tax + serviceCharge);
      
      // Fetch business details
      const businessResponse = await fetch(`${API_URL}/business`, {
        headers: getAuthHeaders()
      });
      const businessDetails = businessResponse.ok ? await businessResponse.json() : {
        name: 'Restaurant',
        currencySymbol: '₹',
        taxLabel: 'GST'
      };
      
      const receiptData = {
        order: {
          orderNumber: order.orderNumber,
          displayOrderNumber: order.displayOrderNumber || order.orderNumber,
          items: itemsList,
          subtotal: subtotal,
          tax: tax,
          taxRate: taxRate,
          serviceCharge: serviceCharge,
          total: total,
          orderType: order.orderType || 'dine-in',
          tableNumber: order.tableNumber,
          customerName: order.customer?.name || 'Walk-In',
          createdAt: order.createdAt,
          status: 'paid'
        },
        payment: {
          method: order.payment?.method || 'cash',
          amount: total,
          transactionId: order.payment?.transactionId || `TXN_${order.orderNumber}`,
          paidAt: order.payment?.timestamp || order.completedAt || new Date(),
          change: 0,
          status: 'completed'
        },
        business: businessDetails
      };
      
      // Save to backend
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          receiptId,
          orderId: order._id,
          orderNumber: order.displayOrderNumber || order.orderNumber,
          receiptData
        })
      });
      
      const receiptUrl = `${window.location.origin}/receipt/${receiptId}`;
      setQrCodeValue(receiptUrl);
      setSelectedOrderForQR(order);
      setShowQRModal(true);
      console.log('QR code generated! Scan to view receipt.');
    } catch (error) {
      console.error('Error generating QR code:', error);
      console.error('Failed to generate QR code');
    }
  };

  // Get date range based on filter
  const getDateRange = (range) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    
    switch(range) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 86400000) };
      case 'week':
        start.setDate(today.getDate() - 7);
        return { start, end: new Date(today.getTime() + 86400000) };
      case 'month':
        start.setMonth(today.getMonth() - 1);
        return { start, end: new Date(today.getTime() + 86400000) };
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        return { start, end: new Date(today.getTime() + 86400000) };
      default:
        return { start: null, end: null };
    }
  };

  // Filter orders by date range
  const filterOrdersByDate = (ordersList) => {
    let filtered = [...ordersList];
    
    if (dateRange !== 'custom' && dateRange !== 'all') {
      const { start, end } = getDateRange(dateRange);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
    } else if (dateRange === 'custom' && startDate && endDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
      });
    }
    
    return filtered;
  };

  // Get filtered orders for current report
  const getFilteredOrders = () => {
    return filterOrdersByDate(orders);
  };

  const filteredOrdersAll = getFilteredOrders();
  const completedOrders = filteredOrdersAll.filter(o => o.status === 'completed');
  
  // Search orders for order history
  const searchOrders = (ordersList) => {
    if (!searchTerm) return ordersList;
    return ordersList.filter(order => 
      order.orderNumber.toString().includes(searchTerm) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const searchedOrders = searchOrders(filteredOrdersAll);
  
  // Filter by payment status
  const filteredByPayment = paymentFilter === 'all' ? searchedOrders : 
    paymentFilter === 'credit' ? searchedOrders.filter(o => o.payment?.status === 'credit_due') :
    paymentFilter === 'paid' ? searchedOrders.filter(o => o.payment?.status === 'completed') :
    searchedOrders.filter(o => o.payment?.status === 'pending');
  
  const totalPages = Math.ceil(filteredByPayment.length / itemsPerPage);
  const paginatedOrders = filteredByPayment.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Calculate statistics for current date range
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  
  // Top items
  const itemSales = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      if (!item.isRemoved) {
        itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
      }
    });
  });
  const topItems = Object.entries(itemSales)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Orders by type
  const ordersByType = {
    'dine-in': filteredOrdersAll.filter(o => o.orderType === 'dine-in').length,
    'takeaway': filteredOrdersAll.filter(o => o.orderType === 'takeaway' || o.orderType === 'pickup').length,
    'delivery': filteredOrdersAll.filter(o => o.orderType === 'delivery').length
  };

  // Revenue by order type
  const revenueByType = {
    'dine-in': completedOrders.filter(o => o.orderType === 'dine-in').reduce((sum, o) => sum + (o.total || 0), 0),
    'takeaway': completedOrders.filter(o => o.orderType === 'takeaway' || o.orderType === 'pickup').reduce((sum, o) => sum + (o.total || 0), 0),
    'delivery': completedOrders.filter(o => o.orderType === 'delivery').reduce((sum, o) => sum + (o.total || 0), 0)
  };

  // Category Performance
  const getCategoryPerformance = () => {
    const categoryRevenue = new Map();
    
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        let categoryName = 'Uncategorized';
        if (item.categoryId && categoryMap.has(item.categoryId)) {
          categoryName = categoryMap.get(item.categoryId);
        } else if (item.categoryName) {
          categoryName = item.categoryName;
        } else if (item.category) {
          if (typeof item.category === 'string' && categoryMap.has(item.category)) {
            categoryName = categoryMap.get(item.category);
          } else if (typeof item.category === 'object' && item.category.name) {
            categoryName = item.category.name;
          }
        }
        
        const revenue = item.price * item.quantity;
        categoryRevenue.set(categoryName, (categoryRevenue.get(categoryName) || 0) + revenue);
      });
    });
    
    return Array.from(categoryRevenue.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Hourly sales distribution
  const getHourlySales = () => {
    const hourly = Array(24).fill(0);
    completedOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourly[hour] += order.total || 0;
    });
    return hourly;
  };

  // Daily sales for last 7 days
  const getLast7DaysSales = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
      const dayOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' });
        return orderDate === dateStr;
      });
      const total = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      days.push({ date: dateStr, sales: total, count: dayOrders.length });
    }
    return days;
  };

  // Weekly sales for last 4 weeks
  const getLast4WeeksSales = () => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= weekStart && orderDate <= weekEnd;
      });
      const total = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      weeks.push({ 
        week: `Week ${4 - i}`, 
        start: weekStart.toLocaleDateString([], { day: '2-digit', month: 'short' }),
        end: weekEnd.toLocaleDateString([], { day: '2-digit', month: 'short' }),
        sales: total, 
        count: weekOrders.length 
      });
    }
    return weeks;
  };

  // Peak hours
  const getPeakHours = () => {
    const hourly = Array(24).fill(0);
    completedOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourly[hour] += order.items.length;
    });
    return hourly.map((count, hour) => ({ hour, count })).sort((a, b) => b.count - a.count).slice(0, 3);
  };

  // Get sales by payment method
  const getSalesByPaymentMethod = () => {
    const methods = {
      cash: 0,
      card: 0,
      upi: 0,
      credit: 0
    };
    completedOrders.forEach(order => {
      const method = order.payment?.method || 'cash';
      if (methods[method] !== undefined) {
        methods[method] += order.total || 0;
      } else {
        methods.cash += order.total || 0;
      }
    });
    return methods;
  };

  // Get top customers by spending
  const getTopCustomers = () => {
    const customerSpending = new Map();
    completedOrders.forEach(order => {
      const customerName = order.customer?.name || order.payment?.customerName || 'Walk-In';
      const currentTotal = customerSpending.get(customerName) || 0;
      customerSpending.set(customerName, currentTotal + (order.total || 0));
    });
    return Array.from(customerSpending.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  // Get growth percentage
  const getGrowthPercentage = () => {
    const last7Days = getLast7DaysSales();
    const currentWeek = last7Days.slice(0, 7).reduce((sum, d) => sum + d.sales, 0);
    const previousWeek = last7Days.slice(7, 14).reduce((sum, d) => sum + d.sales, 0);
    if (previousWeek === 0) return 100;
    return ((currentWeek - previousWeek) / previousWeek) * 100;
  };

  const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDateTime = (date) => new Date(date).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Print/PDF function
  const handlePrint = () => {
    const printContent = printRef.current;
    const originalTitle = document.title;
    document.title = `${activeReport.toUpperCase()} Report - ${dateRange}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${activeReport.toUpperCase()} Report - ${dateRange}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
            }
            .report-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .report-header h1 {
              margin: 0;
              font-size: 24px;
            }
            .report-header p {
              margin: 5px 0;
              color: #666;
              font-size: 12px;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .card h3 {
              margin: 0 0 5px 0;
              font-size: 12px;
              color: #666;
            }
            .card .value {
              font-size: 24px;
              font-weight: bold;
              color: #02864A;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 11px;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .chart {
              margin: 20px 0;
            }
            .bar-container {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 8px;
            }
            .bar-label {
              width: 100px;
              font-size: 11px;
            }
            .bar {
              flex: 1;
              height: 20px;
              background-color: #573CFA;
              border-radius: 4px;
            }
            .bar-value {
              width: 60px;
              text-align: right;
              font-size: 11px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #999;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>${activeReport.toUpperCase()} Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Period: ${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRange.toUpperCase()}</p>
            <p>Total Orders: ${filteredOrdersAll.length} | Completed Orders: ${completedOrders.length}</p>
          </div>
          ${printContent.innerHTML}
          <div class="footer">
            <p>POS System Report - Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    document.title = originalTitle;
  };

  const toggleCustomerExpand = (customerName) => {
    const newSet = new Set(expandedCustomers);
    if (newSet.has(customerName)) {
      newSet.delete(customerName);
    } else {
      newSet.add(customerName);
    }
    setExpandedCustomers(newSet);
  };

  const reports = [
    { id: 'orders', label: 'Orders', icon: FiShoppingBag },
    { id: 'sales', label: 'Sales', icon: FiDollarSign },
    { id: 'credit', label: 'Credit Sales', icon: FiBookOpen },
    { id: 'items', label: 'Top Items', icon: FiTrendingUp },
    { id: 'types', label: 'Order Types', icon: FiUsers },
    { id: 'categories', label: 'Categories', icon: FiPieChart },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 }
  ];

  // Sales Report Component
  const SalesReport = () => {
    const last7Days = getLast7DaysSales();
    const last4Weeks = getLast4WeeksSales();
    const maxSale = Math.max(...last7Days.map(d => d.sales), 1);
    const maxWeekly = Math.max(...last4Weeks.map(w => w.sales), 1);
    const peakHours = getPeakHours();
    const salesByPayment = getSalesByPaymentMethod();
    const topCustomers = getTopCustomers();
    const growthPercent = getGrowthPercentage();
    const totalOrdersCount = completedOrders.length;
    const totalItemsSold = completedOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

    return (
      <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.success }}>{formatCurrency(totalRevenue)}</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Revenue</div>
            <div style={{ fontSize: '8px', color: growthPercent >= 0 ? COLORS.success : COLORS.danger, marginTop: '4px' }}>
              {growthPercent >= 0 ? '↑' : '↓'} {Math.abs(growthPercent).toFixed(1)}% vs last week
            </div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.primary }}>{totalOrdersCount}</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Orders</div>
            <div style={{ fontSize: '8px', color: COLORS.textMuted, marginTop: '4px' }}>Avg {formatCurrency(avgOrderValue)}/order</div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.secondary }}>{totalItemsSold}</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Items Sold</div>
            <div style={{ fontSize: '8px', color: COLORS.textMuted, marginTop: '4px' }}>{(totalItemsSold / totalOrdersCount || 0).toFixed(1)} items/order</div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: COLORS.primary }}>{peakHours[0]?.hour || 0}:00 - {(peakHours[0]?.hour || 0) + 1}:00</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Peak Hour</div>
            <div style={{ fontSize: '8px', color: COLORS.textMuted, marginTop: '4px' }}>{peakHours[0]?.count || 0} orders</div>
          </div>
        </div>

        <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Daily Sales (Last 7 Days)</h3>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '100px' }}>
            {last7Days.map((day, idx) => (
              <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: `${(day.sales / maxSale) * 80}px`, background: COLORS.primary, borderRadius: '3px', marginBottom: '4px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '8px', color: COLORS.success, whiteSpace: 'nowrap' }}>
                    {formatCurrency(day.sales)}
                  </div>
                </div>
                <div style={{ fontSize: '7px', color: COLORS.textSecondary }}>{day.date}</div>
                <div style={{ fontSize: '6px', color: COLORS.textMuted }}>{day.count} orders</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Weekly Trend (Last 4 Weeks)</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            {last4Weeks.map((week, idx) => (
              <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: `${(week.sales / maxWeekly) * 80}px`, background: COLORS.secondary, borderRadius: '3px', marginBottom: '4px' }} />
                <div style={{ fontSize: '8px', color: COLORS.textSecondary }}>{week.week}</div>
                <div style={{ fontSize: '7px', color: COLORS.success }}>{formatCurrency(week.sales)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '10px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Payment Methods</h3>
            {Object.entries(salesByPayment).map(([method, amount]) => (
              amount > 0 && (
                <div key={method} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '8px', color: COLORS.textSecondary, textTransform: 'uppercase' }}>{method}</span>
                    <span style={{ fontSize: '8px', color: COLORS.success }}>{formatCurrency(amount)}</span>
                  </div>
                  <div style={{ height: '4px', background: COLORS.neutralLight, borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${(amount / totalRevenue) * 100}%`, height: '100%', background: COLORS.primary, borderRadius: '2px' }} />
                  </div>
                </div>
              )
            ))}
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '10px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Top Customers</h3>
            {topCustomers.map((customer, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '8px' }}>
                <span style={{ color: COLORS.textSecondary }}>{idx + 1}. {customer.name}</span>
                <span style={{ color: COLORS.success, fontWeight: 'bold' }}>{formatCurrency(customer.amount)}</span>
              </div>
            ))}
            {topCustomers.length === 0 && <div style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: '8px', padding: '10px' }}>No customer data</div>}
          </div>
        </div>

        <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Peak Hours Analysis</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {peakHours.map(peak => (
              <div key={peak.hour} style={{ flex: 1, textAlign: 'center', padding: '8px', background: COLORS.neutralLight, borderRadius: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: COLORS.secondary }}>{peak.hour}:00</div>
                <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>{peak.count} orders</div>
                <div style={{ fontSize: '7px', color: COLORS.textMuted }}>Peak time</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Credit Sales Report Component with Collapsible View
  const CreditSalesReport = () => {
    const creditOrders = orders.filter(o => 
      o.payment?.method === 'credit' && 
      o.payment?.status === 'credit_due' &&
      o.status !== 'cancelled'
    );
    
    const totalCreditDue = creditOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const groupedByCustomer = creditOrders.reduce((acc, order) => {
      const customerName = order.payment?.customerName || order.customer?.name || 'Unknown Customer';
      const customerPhone = order.payment?.customerPhone || order.customer?.phone || '';
      if (!acc[customerName]) {
        acc[customerName] = {
          customerName,
          customerPhone,
          totalDue: 0,
          orders: []
        };
      }
      acc[customerName].totalDue += order.total || 0;
      acc[customerName].orders.push(order);
      return acc;
    }, {});
    
    const customersList = Object.values(groupedByCustomer);
    const creditPages = Math.ceil(customersList.length / itemsPerPage);
    const paginatedCustomers = customersList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', flexShrink: 0 }}>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.secondary }}>{creditOrders.length}</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Credit Customers</div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.secondary }}>{formatCurrency(totalCreditDue)}</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Total Credit Due</div>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {paginatedCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>No credit sales found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paginatedCustomers.map(customer => {
                const isExpanded = expandedCustomers.has(customer.customerName);
                return (
                  <div key={customer.customerName} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                    <div 
                      onClick={() => toggleCustomerExpand(customer.customerName)}
                      style={{ 
                        padding: '12px', 
                        background: COLORS.neutralLight, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = COLORS.neutralLight}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '12px', color: COLORS.textPrimary }}>{customer.customerName}</strong>
                          {customer.customerPhone && (
                            <span style={{ fontSize: '8px', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <FiPhone size={8} /> {customer.customerPhone}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '4px' }}>{customer.orders.length} order(s)</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: COLORS.secondary }}>{formatCurrency(customer.totalDue)}</div>
                        <div style={{ fontSize: '7px', color: COLORS.textMuted }}>Total Due</div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '12px', borderTop: `1px solid ${COLORS.border}` }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                              <th style={{ textAlign: 'left', fontSize: '9px', padding: '6px', color: COLORS.textSecondary }}>Order #</th>
                              <th style={{ textAlign: 'left', fontSize: '9px', padding: '6px', color: COLORS.textSecondary }}>Date</th>
                              <th style={{ textAlign: 'right', fontSize: '9px', padding: '6px', color: COLORS.textSecondary }}>Amount</th>
                              <th style={{ textAlign: 'right', fontSize: '9px', padding: '6px', color: COLORS.textSecondary }}>Due Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customer.orders.map(order => (
                              <tr 
                                key={order._id} 
                                style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer' }}
                                onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
                                onMouseEnter={(e) => e.currentTarget.style.background = COLORS.neutralLight}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ fontSize: '9px', padding: '6px', color: COLORS.textPrimary }}>#{order.displayOrderNumber || order.orderNumber}</td>
                                <td style={{ fontSize: '9px', padding: '6px', color: COLORS.textSecondary }}>{formatDate(order.createdAt)}</td>
                                <td style={{ fontSize: '9px', padding: '6px', textAlign: 'right', fontWeight: 'bold', color: COLORS.success }}>{formatCurrency(order.total)}</td>
                                <td style={{ fontSize: '9px', padding: '6px', textAlign: 'right', color: order.payment?.dueDate ? COLORS.secondary : COLORS.textMuted }}>
                                  {order.payment?.dueDate ? formatDate(order.payment.dueDate) : 'Not set'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {creditPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderTop: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              style={{ padding: '4px 8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: COLORS.textPrimary }}
            >
              Previous
            </button>
            <span style={{ fontSize: '10px', color: COLORS.textSecondary }}>Page {currentPage} of {creditPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(creditPages, p + 1))} 
              disabled={currentPage === creditPages} 
              style={{ padding: '4px 8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', cursor: currentPage === creditPages ? 'not-allowed' : 'pointer', opacity: currentPage === creditPages ? 0.5 : 1, color: COLORS.textPrimary }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  // Top Items Report
  // Top Items Report
const ItemsReport = () => {
  return (
    <div ref={printRef} style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
      <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: COLORS.textPrimary }}>Top Selling Items</h3>
      {topItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: COLORS.textMuted }}>No sales data in selected period</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '10px', color: COLORS.textSecondary }}>Rank</th>
              <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '10px', color: COLORS.textSecondary }}>Item Name</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '10px', color: COLORS.textSecondary }}>Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            {topItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '6px 0', fontSize: '9px', color: COLORS.textSecondary }}>
                  {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </td>
                <td style={{ padding: '6px 0', fontSize: '9px', color: COLORS.textPrimary }}>{item.name}</td>
                <td style={{ textAlign: 'right', padding: '6px 0', fontSize: '9px', fontWeight: 'bold', color: COLORS.success }}>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

  // Order Types Report
  const TypesReport = () => {
    const maxCount = Math.max(...Object.values(ordersByType), 1);
    const maxRevenue = Math.max(...Object.values(revenueByType), 1);

    return (
      <div ref={printRef} style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
        <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: COLORS.textPrimary }}>Orders by Type</h3>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '500', marginBottom: '8px', color: COLORS.textSecondary }}>Order Count</div>
          {Object.entries(ordersByType).map(([type, count]) => (
            <div key={type} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '9px', color: COLORS.textSecondary }}>{type === 'dine-in' ? '🍽️ Dine-In' : type === 'takeaway' ? '📦 Takeaway' : '🚚 Delivery'}</span>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: COLORS.textPrimary }}>{count}</span>
              </div>
              <div style={{ height: '6px', background: COLORS.neutralLight, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: type === 'dine-in' ? COLORS.success : type === 'takeaway' ? COLORS.secondary : COLORS.danger, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: '500', marginBottom: '8px', color: COLORS.textSecondary }}>Revenue by Type</div>
          {Object.entries(revenueByType).map(([type, revenue]) => (
            <div key={type} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '9px', color: COLORS.textSecondary }}>{type === 'dine-in' ? '🍽️ Dine-In' : type === 'takeaway' ? '📦 Takeaway' : '🚚 Delivery'}</span>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: COLORS.success }}>{formatCurrency(revenue)}</span>
              </div>
              <div style={{ height: '6px', background: COLORS.neutralLight, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(revenue / maxRevenue) * 100}%`, height: '100%', background: type === 'dine-in' ? COLORS.success : type === 'takeaway' ? COLORS.secondary : COLORS.danger, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Category Performance Report
  const CategoryReport = () => {
    const categoryPerformance = getCategoryPerformance();
    const maxRevenue = Math.max(...categoryPerformance.map(c => c.revenue), 1);

    return (
      <div ref={printRef} style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
        <h3 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: COLORS.textPrimary }}>Category Performance</h3>
        {categoryPerformance.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: COLORS.textMuted }}>No category data in selected period</div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {categoryPerformance.map((cat, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '500', color: COLORS.textSecondary }}>{cat.name}</span>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.success }}>{formatCurrency(cat.revenue)}</span>
                </div>
                <div style={{ height: '6px', background: COLORS.neutralLight, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(cat.revenue / maxRevenue) * 100}%`, height: '100%', background: COLORS.primary, borderRadius: '3px' }} />
                </div>
                <div style={{ fontSize: '7px', color: COLORS.textMuted, marginTop: '2px' }}>{((cat.revenue / totalRevenue) * 100).toFixed(1)}% of total</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Analytics Report
  const AnalyticsReport = () => {
    const avgPrepTime = completedOrders.reduce((sum, o) => {
      if (o.completedAt && o.createdAt) {
        return sum + (new Date(o.completedAt) - new Date(o.createdAt)) / 60000;
      }
      return sum;
    }, 0) / (completedOrders.length || 1);
    
    const totalItemsSold = completedOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const avgItemsPerOrder = completedOrders.length > 0 ? totalItemsSold / completedOrders.length : 0;
    const peakHours = getPeakHours();
    const last7Days = getLast7DaysSales();
    const bestDay = last7Days.reduce((best, day) => day.sales > best.sales ? day : best, last7Days[0]);
    const salesByPayment = getSalesByPaymentMethod();
    const topCustomers = getTopCustomers();
    const growthPercent = getGrowthPercentage();

    return (
      <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.primary }}>{Math.round(avgPrepTime)} min</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Avg Prep Time</div>
            <div style={{ fontSize: '7px', color: COLORS.textMuted, marginTop: '4px' }}>From order to completion</div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.primary }}>{totalItemsSold}</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Items Sold</div>
            <div style={{ fontSize: '7px', color: COLORS.textMuted, marginTop: '4px' }}>{avgItemsPerOrder.toFixed(1)} items per order</div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: COLORS.success }}>{peakHours[0]?.hour || 0}:00</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Peak Hour</div>
            <div style={{ fontSize: '7px', color: COLORS.textMuted, marginTop: '4px' }}>{peakHours[0]?.count || 0} orders at this time</div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: growthPercent >= 0 ? COLORS.success : COLORS.danger }}>{growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%</div>
            <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Growth vs Last Week</div>
            <div style={{ fontSize: '7px', color: COLORS.textMuted, marginTop: '4px' }}>Weekly comparison</div>
          </div>
        </div>

        <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Best Performing Day</h3>
          <div style={{ textAlign: 'center', padding: '12px', background: COLORS.neutralLight, borderRadius: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.secondary }}>{bestDay?.date || 'N/A'}</div>
            <div style={{ fontSize: '11px', color: COLORS.textSecondary }}>Revenue: {bestDay ? formatCurrency(bestDay.sales) : 'No data'}</div>
            <div style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '4px' }}>{bestDay?.count || 0} orders completed</div>
          </div>
        </div>

        <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '10px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Payment Method Distribution</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.entries(salesByPayment).map(([method, amount]) => (
              amount > 0 && (
                <div key={method} style={{ flex: 1, minWidth: '60px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.success }}>{formatCurrency(amount)}</div>
                  <div style={{ fontSize: '7px', color: COLORS.textSecondary, textTransform: 'uppercase' }}>{method}</div>
                  <div style={{ fontSize: '6px', color: COLORS.textMuted }}>{((amount / totalRevenue) * 100).toFixed(1)}%</div>
                </div>
              )
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '10px', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '10px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Top Customers by Spending</h3>
          {topCustomers.slice(0, 3).map((customer, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '6px', background: COLORS.neutralLight, borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', background: idx === 0 ? COLORS.secondary : COLORS.neutral, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: COLORS.textPrimary }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: '9px', color: COLORS.textPrimary }}>{customer.name}</span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: COLORS.success }}>{formatCurrency(customer.amount)}</span>
            </div>
          ))}
          {topCustomers.length === 0 && <div style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: '8px', padding: '10px' }}>No customer data available</div>}
        </div>
      </div>
    );
  };

  // Orders List Component
  const OrdersList = () => (
    <div ref={printRef} style={{ background: COLORS.bgCard, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '6px 6px 6px 28px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                fontSize: '9px',
                background: COLORS.neutralLight,
                color: COLORS.textPrimary
              }}
            />
          </div>
          
          <select 
            value={paymentFilter} 
            onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
            style={{ 
              padding: '6px 8px', 
              fontSize: '9px', 
              borderRadius: '6px',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.neutralLight,
              color: COLORS.textPrimary,
              cursor: 'pointer'
            }}
          >
            <option value="all">All Payments</option>
            <option value="credit">Credit Due</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>

          <select 
            value={itemsPerPage} 
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            style={{ 
              padding: '6px 8px', 
              fontSize: '9px', 
              borderRadius: '6px',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.neutralLight,
              color: COLORS.textPrimary,
              cursor: 'pointer'
            }}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {paginatedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted, fontSize: '9px' }}>No orders found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: COLORS.bgCard, zIndex: 1 }}>
              <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '9px', color: COLORS.textSecondary }}>Order #</th>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '9px', color: COLORS.textSecondary }}>Customer</th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '9px', color: COLORS.textSecondary }}>Total</th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '9px', color: COLORS.textSecondary }}>Status</th>
                <th style={{ textAlign: 'center', padding: '8px', fontSize: '9px', color: COLORS.textSecondary }}>QR</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map(order => (
                <tr
                  key={order._id}
                  style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = COLORS.neutralLight}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td 
                    style={{ padding: '8px', fontSize: '9px', fontWeight: 'bold', color: COLORS.textPrimary }}
                    onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
                  >
                    #{order.orderNumber}
                  </td>
                  <td 
                    style={{ padding: '8px', fontSize: '8px', color: COLORS.textSecondary }}
                    onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
                  >
                    {order.customer?.name || 'Walk-In'}
                  </td>
                  <td 
                    style={{ padding: '8px', fontSize: '9px', fontWeight: 'bold', color: COLORS.success, textAlign: 'right' }}
                    onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
                  >
                    {formatCurrency(order.total || 0)}
                  </td>
                  <td 
                    style={{ padding: '8px', fontSize: '8px', textAlign: 'right' }}
                    onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
                  >
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: order.status === 'completed' ? `${COLORS.success}20` : order.payment?.status === 'credit_due' ? `${COLORS.secondary}20` : `${COLORS.secondary}20`,
                      color: order.status === 'completed' ? COLORS.success : COLORS.secondary
                    }}>
                      {order.payment?.status === 'credit_due' ? 'Credit Due' : order.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {order.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateOrderQR(order);
                        }}
                        style={{
                          background: COLORS.primary,
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '8px',
                          color: COLORS.textPrimary
                        }}
                        title="Generate QR Code for Receipt"
                      >
                        <FiGrid size={10} /> QR
                      </button>
                    )}
                    {order.status !== 'completed' && (
                      <span style={{ fontSize: '7px', color: COLORS.textMuted }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderTop: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1} 
            style={{ padding: '4px 8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: COLORS.textPrimary }}
          >
            Previous
          </button>
          <span style={{ fontSize: '9px', color: COLORS.textSecondary }}>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages} 
            style={{ padding: '4px 8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: COLORS.textPrimary }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      padding: '8px',
      height: 'calc(100vh - 56px)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.neutralDark
    }}>
      {/* Header with Print Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
        flexWrap: 'wrap',
        gap: '6px',
        flexShrink: 0
      }}>
        <h1 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: COLORS.textPrimary }}>Reports & Analytics</h1>
        
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {['today', 'week', 'month', 'year', 'all'].map(range => (
              <button
                key={range}
                onClick={() => { setDateRange(range); setCurrentPage(1); }}
                style={{
                  padding: '3px 6px',
                  background: dateRange === range ? COLORS.primary : COLORS.neutralLight,
                  color: dateRange === range ? COLORS.textPrimary : COLORS.textSecondary,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '8px'
                }}
              >
                {range === 'all' ? 'All' : range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
            <button
              onClick={() => setDateRange('custom')}
              style={{
                padding: '3px 6px',
                background: dateRange === 'custom' ? COLORS.primary : COLORS.neutralLight,
                color: dateRange === 'custom' ? COLORS.textPrimary : COLORS.textSecondary,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '8px'
              }}
            >
              Custom
            </button>
          </div>
          
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              background: COLORS.success,
              color: COLORS.textPrimary,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '8px',
              fontWeight: '500'
            }}
          >
            <FiPrinter size={10} /> Print / PDF
          </button>
        </div>
      </div>
      
      {/* Custom Date Picker */}
      {dateRange === 'custom' && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '3px 5px', border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '8px', background: COLORS.neutralLight, color: COLORS.textPrimary }} />
          <span style={{ fontSize: '8px', color: COLORS.textSecondary }}>to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '3px 5px', border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '8px', background: COLORS.neutralLight, color: COLORS.textPrimary }} />
        </div>
      )}
      
      {/* Report Tabs */}
      <div style={{
        display: 'flex',
        gap: '3px',
        marginBottom: '8px',
        background: COLORS.neutral,
        borderRadius: '6px',
        padding: '3px',
        flexShrink: 0,
        overflowX: 'auto'
      }}>
        {reports.map(report => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px',
                background: activeReport === report.id ? COLORS.primary : 'transparent',
                color: activeReport === report.id ? COLORS.textPrimary : COLORS.textSecondary,
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={9} />
              {report.label}
            </button>
          );
        })}
      </div>
      
      {/* Report Content */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeReport === 'orders' && <OrdersList />}
        {activeReport === 'sales' && <SalesReport />}
        {activeReport === 'credit' && <CreditSalesReport />}
        {activeReport === 'items' && <ItemsReport />}
        {activeReport === 'types' && <TypesReport />}
        {activeReport === 'categories' && <CategoryReport />}
        {activeReport === 'analytics' && <AnalyticsReport />}
      </div>
      
      {/* QR Code Modal */}
      {showQRModal && selectedOrderForQR && (
        <>
          <div onClick={() => setShowQRModal(false)} style={{
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
            background: COLORS.bgCard,
            borderRadius: '16px',
            overflow: 'hidden',
            zIndex: 3001,
            textAlign: 'center',
            padding: '24px',
            border: `1px solid ${COLORS.border}`
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px', color: COLORS.textPrimary }}>Receipt QR Code</h3>
            <p style={{ fontSize: '10px', color: COLORS.textSecondary, marginBottom: '16px' }}>
              Order #{selectedOrderForQR.displayOrderNumber || selectedOrderForQR.orderNumber}
            </p>
            
            <div style={{ 
              background: COLORS.neutral, 
              padding: '16px', 
              display: 'inline-block', 
              borderRadius: '12px', 
              marginBottom: '16px',
              border: `1px solid ${COLORS.border}`
            }}>
              <QRCode value={qrCodeValue} size={180} />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: COLORS.textSecondary }}>Amount Paid: </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.success }}>
                {formatCurrency(selectedOrderForQR.total || 0)}
              </span>
            </div>
            
            <p style={{ fontSize: '9px', color: COLORS.textMuted, marginBottom: '16px' }}>
              Scan this QR code to view/download receipt
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  window.open(qrCodeValue, '_blank');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: COLORS.primary,
                  color: COLORS.textPrimary,
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
                <FiPrinter size={14} /> View Receipt
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: COLORS.neutralLight,
                  color: COLORS.textSecondary,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <>
          <div onClick={() => setShowOrderDetail(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '350px',
            maxHeight: '80vh',
            background: COLORS.bgCard,
            borderRadius: '8px',
            overflow: 'hidden',
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${COLORS.border}`
          }}>
            <div style={{ padding: '8px 10px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.primary, color: COLORS.textPrimary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '11px', margin: 0 }}>Order #{selectedOrder.orderNumber}</h2>
              <button onClick={() => setShowOrderDetail(false)} style={{ background: 'none', border: 'none', color: COLORS.textPrimary, cursor: 'pointer' }}><FiX size={12} /></button>
            </div>
            
            <div style={{ padding: '10px', fontSize: '8px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ color: COLORS.textSecondary }}>Date:</span><span style={{ color: COLORS.textPrimary }}>{formatDateTime(selectedOrder.createdAt)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ color: COLORS.textSecondary }}>Customer:</span><span style={{ color: COLORS.textPrimary }}>{selectedOrder.customer?.name || 'Walk-In'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ color: COLORS.textSecondary }}>Type:</span><span style={{ color: COLORS.textPrimary }}>{selectedOrder.orderType}</span></div>
                {selectedOrder.tableNumber && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ color: COLORS.textSecondary }}>Table:</span><span style={{ color: COLORS.textPrimary }}>{selectedOrder.tableNumber}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ color: COLORS.textSecondary }}>Status:</span><span style={{ color: selectedOrder.status === 'completed' ? COLORS.success : COLORS.secondary }}>{selectedOrder.payment?.status === 'credit_due' ? 'Credit Due' : selectedOrder.status}</span></div>
                {selectedOrder.payment?.method === 'credit' && selectedOrder.payment?.status === 'credit_due' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ color: COLORS.textSecondary }}>Due Date:</span><span style={{ color: COLORS.secondary }}>{selectedOrder.payment?.dueDate ? formatDate(selectedOrder.payment.dueDate) : 'Not set'}</span></div>
                )}
              </div>
              
              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '6px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '9px', color: COLORS.textPrimary }}>Items:</div>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '7px', color: COLORS.textSecondary }}>
                    <span>{item.quantity} x {item.name}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: COLORS.textSecondary }}><span>Subtotal:</span><span>₹{selectedOrder.subtotal || 0}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: COLORS.textSecondary }}><span>Tax ({selectedOrder.taxRate || 10}%):</span><span>₹{selectedOrder.tax || 0}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9px', marginTop: '4px', paddingTop: '3px', borderTop: `1px solid ${COLORS.border}` }}>
                  <span style={{ color: COLORS.textPrimary }}>Total:</span><span style={{ color: COLORS.success }}>₹{selectedOrder.total || 0}</span>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '6px 8px', borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setShowOrderDetail(false)} style={{ width: '100%', padding: '5px', background: COLORS.primary, color: COLORS.textPrimary, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '8px' }}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;