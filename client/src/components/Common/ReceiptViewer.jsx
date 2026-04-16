import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPrinter, FiDownload, FiX, FiShare2, FiCreditCard, FiSmartphone, FiCornerDownLeft, FiInfo, FiList } from 'react-icons/fi';
import QRCode from 'react-qr-code';
import { useReactToPrint } from 'react-to-print';
import { pdf } from '@react-pdf/renderer';
import ReceiptPDF from './ReceiptPDF';
import paymentService from '../../services/paymentService';
import printerService from '../../services/printerService';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

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
  bgCard: '#1E1C2D'
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

function ReceiptViewer() {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCashInfoModal, setShowCashInfoModal] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [selectedOrderForReprint, setSelectedOrderForReprint] = useState(null);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const printRef = useRef();
  const receiptLoadedRef = useRef(false);

  // Fetch current settings (only once)
  const fetchSettings = async () => {
    if (settingsLoaded) return;
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: getAuthHeaders(),
        cache: 'no-cache'
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentSettings(data);
        setSettingsLoaded(true);
        console.log('Current settings loaded:', data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Load receipt from backend (only once)
  useEffect(() => {
    const loadReceipt = async () => {
      if (receiptLoadedRef.current) return;
      receiptLoadedRef.current = true;
      
      console.log('ReceiptViewer mounted with receiptId:', receiptId);
      setLoading(true);
      
      // Fetch current settings first
      await fetchSettings();
      
      try {
        // Try to get from backend
        const response = await fetch(`${API_URL}/receipts/${receiptId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Receipt loaded from backend:', data);
          setReceiptData(data);
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem(`receipt_${receiptId}`);
          if (stored) {
            const data = JSON.parse(stored);
            setReceiptData(data);
          } else {
            console.error('Receipt not found:', receiptId);
          }
        }
      } catch (error) {
        console.error('Error loading receipt:', error);
        const stored = localStorage.getItem(`receipt_${receiptId}`);
        if (stored) {
          const data = JSON.parse(stored);
          setReceiptData(data);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadReceipt();
  }, [receiptId]);

  // Apply settings to receipt data when both are available (only once)
  useEffect(() => {
    if (receiptData && currentSettings && !receiptData._settingsApplied) {
      // Apply current settings to the receipt data
      if (receiptData.order && receiptData.business) {
        const shouldShowTax = receiptData.business.printTaxBreakdown !== false && currentSettings.taxRate > 0;
        
        // Calculate values based on print settings
        const subtotal = receiptData.order.subtotal;
        const serviceCharge = receiptData.order.serviceCharge || 0;
        
        let tax = 0;
        let total = subtotal + serviceCharge;
        
        if (shouldShowTax) {
          tax = subtotal * (currentSettings.taxRate / 100);
          total = subtotal + tax + serviceCharge;
        }
        
        setReceiptData(prev => ({
          ...prev,
          order: {
            ...prev.order,
            taxRate: currentSettings.taxRate,
            tax: tax,
            total: total,
            _settingsApplied: true
          }
        }));
        console.log('Receipt updated - shouldShowTax:', shouldShowTax, 'tax:', tax, 'total:', total);
      }
    }
  }, [receiptData, currentSettings]);

  // Setup print functionality
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0mm;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `,
    onAfterPrint: () => {
      console.log('Print completed');
    },
    onPrintError: (error) => {
      console.error('Print error:', error);
      toast.error('Failed to print. Please try again.');
    }
  });

  // Generate PDF blob
  const generatePDFBlob = async () => {
    if (!receiptData) return null;
    
    try {
      const blob = await pdf(<ReceiptPDF receiptData={receiptData} />).toBlob();
      return blob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  };

  // Download PDF directly
  const handleDownloadPDF = async () => {
    if (!receiptData || pdfGenerating) return;
    
    setPdfGenerating(true);
    try {
      const blob = await generatePDFBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `receipt_${receiptData.order?.displayOrderNumber || receiptData.order?.orderNumber || 'order'}.pdf`;
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Share PDF via Web Share API
  const handleSharePDF = async () => {
    if (!receiptData || pdfGenerating) return;
    
    setPdfGenerating(true);
    try {
      const blob = await generatePDFBlob();
      
      if (!blob) {
        throw new Error('Failed to generate PDF');
      }
      
      const fileName = `receipt_${receiptData.order?.displayOrderNumber || receiptData.order?.orderNumber || 'order'}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Receipt #${receiptData.order?.displayOrderNumber || receiptData.order?.orderNumber}`,
            text: `Receipt for order #${receiptData.order?.displayOrderNumber || receiptData.order?.orderNumber}`,
            files: [file]
          });
          console.log('PDF shared successfully');
        } catch (shareError) {
          console.error('Error sharing:', shareError);
          if (shareError.name !== 'AbortError') {
            handleDownloadPDF();
            alert('Sharing not available. PDF downloaded instead.');
          }
        }
      } else {
        handleDownloadPDF();
        alert('Share feature not supported on this browser. PDF downloaded instead.');
      }
    } catch (error) {
      console.error('Error generating PDF for share:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Update order payment status on backend
  const updateOrderPayment = async (orderId, paymentDetails) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/${orderId}/complete-payment`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          paymentMethod: paymentDetails.method,
          paymentDetails: paymentDetails,
          status: 'completed',
          completedAt: new Date()
        })
      });
      
      if (response.ok) {
        const updatedOrder = await response.json();
        console.log('Order payment updated:', updatedOrder);
        
        // Update local receipt data
        if (receiptData) {
          receiptData.payment = {
            method: paymentDetails.method,
            amount: paymentDetails.amount,
            transactionId: paymentDetails.transactionId,
            paidAt: new Date(),
            change: paymentDetails.change || 0,
            status: 'completed'
          };
          receiptData.order.status = 'paid';
          setReceiptData({ ...receiptData });
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating payment:', error);
      return false;
    }
  };

  // Card Payment with Razorpay
  const handleCardPayment = async () => {
    if (!receiptData || processingPayment) return;
    
    setProcessingPayment(true);
    const loadingToastId = toast.loading('Opening payment gateway...', { duration: 10000 });
    
    try {
      const order = receiptData.order;
      const business = receiptData.business;
      const gatewayCharges = order.total * 0.02;
      const totalWithCharges = order.total + gatewayCharges;
      
      const result = await paymentService.processCardPayment(totalWithCharges, {
        orderNumber: order.displayOrderNumber || order.orderNumber,
        customerName: order.customerName || 'Customer',
        customerPhone: '',
        customerEmail: '',
        restaurantName: business?.name || 'Restaurant POS'
      });
      
      toast.dismiss(loadingToastId);
      
      if (result && result.success) {
        const paymentDetails = {
          method: 'card',
          amount: order.total,
          gatewayCharges: gatewayCharges,
          transactionId: result.transactionId,
          paidAt: new Date()
        };
        
        const updated = await updateOrderPayment(order.orderNumber || order.id, paymentDetails);
        
        if (updated) {
          await printerService.printReceipt(order, paymentDetails);
          toast.success(`Payment successful! Gateway charges: ₹${gatewayCharges.toFixed(2)}`, { duration: 4000 });
          setShowPaymentModal(false);
        } else {
          throw new Error('Failed to update order');
        }
      }
    } catch (error) {
      console.error('Card payment error:', error);
      toast.dismiss(loadingToastId);
      toast.error(error.message || 'Payment failed. Please try again.', { duration: 5000 });
    } finally {
      setProcessingPayment(false);
    }
  };

  // UPI Payment - Directly open UPI app
  const handleUPIPayment = () => {
    if (!receiptData) return;
    
    const order = receiptData.order;
    const business = receiptData.business;
    const upiId = business?.upiId || 'paytm.s1yxcay@pty';
    const payeeName = business?.name || 'Restaurant POS';
    const amount = order.total;
    const description = `Order ${order.displayOrderNumber || order.orderNumber}`;
    
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;
    
    window.location.href = upiUrl;
    
    setTimeout(() => {
      toast(
        (t) => (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '8px' }}>If UPI app didn't open automatically:</p>
            <QRCode value={upiUrl} size={100} style={{ margin: '10px auto' }} />
            <p style={{ fontSize: '10px', marginTop: '8px' }}>UPI: {upiId}</p>
            <p style={{ fontSize: '10px' }}>Amount: ₹{amount}</p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                setTimeout(() => {
                  if (window.confirm('Did you complete the payment?')) {
                    confirmUPIPayment();
                  }
                }, 500);
              }}
              style={{
                marginTop: '10px',
                padding: '6px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Confirm Payment
            </button>
          </div>
        ),
        { duration: 30000, position: 'top-center' }
      );
    }, 1000);
    
    setShowPaymentModal(false);
  };

  // Confirm UPI Payment after user pays
  const confirmUPIPayment = async () => {
    if (!receiptData || processingPayment) return;
    
    setProcessingPayment(true);
    
    try {
      const order = receiptData.order;
      const paymentDetails = {
        method: 'upi',
        amount: order.total,
        transactionId: `UPI_${Date.now()}`,
        paidAt: new Date()
      };
      
      const updated = await updateOrderPayment(order.orderNumber || order.id, paymentDetails);
      
      if (updated) {
        await printerService.printReceipt(order, paymentDetails);
        toast.success('Payment successful!');
        setShowPaymentModal(false);
      } else {
        throw new Error('Failed to update order');
      }
    } catch (error) {
      console.error('UPI payment confirmation error:', error);
      toast.error('Failed to process payment. Please contact support.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Reprint bill for an order from today's list
  const handleReprintBill = async (order) => {
    try {
      const paymentDetails = {
        method: order.paymentMethod || 'paid',
        amount: order.total,
        status: 'completed',
        transactionId: order.transactionId,
        paidAt: order.paidAt
      };
      
      // Create a order object compatible with printerService
      const orderForPrint = {
        orderNumber: order.orderNumber,
        displayOrderNumber: order.orderNumberDisplay || order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        taxRate: order.taxRate || 0,
        serviceCharge: order.serviceCharge || 0,
        total: order.total,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        customer: { name: order.customerName },
        createdAt: order.createdAt
      };
      
      await printerService.printReceipt(orderForPrint, paymentDetails);
      toast.success(`Bill reprinted for Order ${order.orderNumber}`);
    } catch (error) {
      console.error('Error reprinting bill:', error);
      toast.error('Failed to reprint bill');
    }
  };

  // Render today's orders list
  const renderTodayOrders = (data) => {
    const orders = data.orders || [];
    
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            background: COLORS.primary + '20', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <FiList size={28} color={COLORS.primary} />
          </div>
          <h2 style={{ fontSize: '16px', color: COLORS.textPrimary }}>Today's Completed Orders</h2>
          <p style={{ fontSize: '11px', color: COLORS.textSecondary }}>
            {data.totalOrders} Orders | Total: {formatCurrencyPrint(data.totalRevenue)}
          </p>
          <p style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '4px' }}>
            {new Date(data.date).toLocaleDateString()}
          </p>
        </div>
        
        <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
          {orders.map((order, idx) => (
            <div
              key={order.orderId || idx}
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                setSelectedOrderForReprint(order);
                setShowReprintModal(true);
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = COLORS.primary}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = COLORS.border}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: COLORS.textPrimary }}>#{order.orderNumber}</span>
                  <div style={{ fontSize: '9px', color: COLORS.textSecondary }}>{new Date(order.createdAt).toLocaleTimeString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: COLORS.success }}>{formatCurrencyPrint(order.total)}</div>
                  <div style={{ fontSize: '8px', color: COLORS.textMuted }}>{order.customerName}</div>
                </div>
              </div>
              <div style={{ fontSize: '8px', color: COLORS.textMuted }}>
                {order.items.slice(0, 2).map((item, i) => (
                  <span key={i}>{item.quantity}× {item.name}{i < order.items.length - 1 && i < 1 ? ', ' : ''}</span>
                ))}
                {order.items.length > 2 && <span> +{order.items.length - 2} more</span>}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ 
                  fontSize: '7px', 
                  color: COLORS.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <FiPrinter size={8} /> Click to reprint
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '10px',
            background: COLORS.primary,
            color: COLORS.textPrimary,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Back to Home
        </button>
      </div>
    );
  };

  const formatCurrencyPrint = (amount) => `₹${amount?.toFixed(2) || '0.00'}`;
  const formatDatePrint = (date) => new Date(date).toLocaleString();

  // Check if this is a today's orders receipt (multiple orders)
  const isTodayOrdersReceipt = receiptData?.orders && Array.isArray(receiptData.orders) && receiptData.date;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: COLORS.neutralDark, color: COLORS.textPrimary }}>
        Loading...
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px', background: COLORS.neutralDark, color: COLORS.textPrimary }}>
        <h2>Receipt not found</h2>
        <p style={{ fontSize: '12px', color: COLORS.textSecondary }}>
          Receipt ID: {receiptId}
        </p>
        <button onClick={() => navigate('/')} style={{ padding: '10px 20px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Go to Home
        </button>
      </div>
    );
  }

  // If this is a today's orders receipt, show the list view
  if (isTodayOrdersReceipt) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.neutralDark,
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          background: COLORS.neutral,
          borderRadius: '12px',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            background: COLORS.success,
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiList size={18} /> Today's Orders
            </h2>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FiX size={14} /> Close
            </button>
          </div>
          {renderTodayOrders(receiptData)}
        </div>
        
        {/* Reprint Modal */}
        {showReprintModal && selectedOrderForReprint && (
          <>
            <div onClick={() => setShowReprintModal(false)} style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
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
              <h3 style={{ fontSize: '14px', marginBottom: '12px', color: COLORS.textPrimary }}>Reprint Bill</h3>
              <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '16px' }}>
                Reprint bill for Order #{selectedOrderForReprint.orderNumber}?
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowReprintModal(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: COLORS.neutralLight,
                    color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleReprintBill(selectedOrderForReprint);
                    setShowReprintModal(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: COLORS.primary,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Reprint Bill
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const { order, payment, business } = receiptData;
  const businessDetails = business;
  const currencySymbol = businessDetails.currencySymbol || '₹';
  const isPaid = payment?.status === 'completed' || (payment?.method !== 'pending' && payment?.method !== 'credit');
  
  // Check print settings from business details
  const shouldShowTax = businessDetails.printTaxBreakdown !== false && order.taxRate > 0;
  
  // Use values from order (which already has tax excluded if printTaxBreakdown is false)
  const displayTaxRate = order.taxRate || 0;
  const displayTax = order.tax || 0;
  const displayTotal = order.total || (order.subtotal + displayTax + (order.serviceCharge || 0));
  const shouldShowServiceCharge = businessDetails.printServiceCharge !== false && (order.serviceCharge || 0) > 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.neutralDark,
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
        background: COLORS.bgCard,
        borderRadius: '12px',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header with Actions */}
        <div style={{
          padding: '16px',
          background: isPaid ? COLORS.success : COLORS.secondary,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <h2 style={{ fontSize: '16px', margin: 0 }}>Receipt #{order.displayOrderNumber || order.orderNumber}</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {isPaid ? 'PAID' : 'PENDING'}
            </span>
            {!isPaid && (
              <button
                onClick={() => setShowPaymentModal(true)}
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                <FiCreditCard size={14} /> Pay Now
              </button>
            )}
            <button
              onClick={handlePrint}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px'
              }}
            >
              <FiPrinter size={14} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfGenerating}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'white',
                cursor: pdfGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                opacity: pdfGenerating ? 0.6 : 1
              }}
            >
              <FiDownload size={14} /> {pdfGenerating ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={handleSharePDF}
              disabled={pdfGenerating}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'white',
                cursor: pdfGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                opacity: pdfGenerating ? 0.6 : 1
              }}
            >
              <FiShare2 size={14} /> {pdfGenerating ? 'Generating...' : 'Share'}
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px'
              }}
            >
              <FiX size={14} /> Close
            </button>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <>
            <div onClick={() => setShowPaymentModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, backdropFilter: 'blur(4px)' }} />
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
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              border: `1px solid ${COLORS.border}`
            }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.secondary, color: 'white' }}>
                <h2 style={{ fontSize: '14px', margin: 0 }}>Pay for Order #{order.displayOrderNumber || order.orderNumber}</h2>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: COLORS.success }}>{formatCurrencyPrint(displayTotal)}</div>
                  <div style={{ fontSize: '11px', color: COLORS.textSecondary }}>Total Amount</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    onClick={handleCardPayment} 
                    disabled={processingPayment} 
                    style={{ 
                      padding: '12px', 
                      background: COLORS.primary, 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: processingPayment ? 'not-allowed' : 'pointer', 
                      fontSize: '14px', 
                      fontWeight: '500',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px',
                      opacity: processingPayment ? 0.6 : 1
                    }}
                  >
                    <FiCreditCard size={18} /> Card (+2%)
                  </button>
                  <button 
                    onClick={handleUPIPayment} 
                    style={{ 
                      padding: '12px', 
                      background: '#8b5cf6', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontSize: '14px', 
                      fontWeight: '500',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px'
                    }}
                  >
                    <FiSmartphone size={18} /> UPI / QR Code
                  </button>
                  <button 
                    onClick={() => setShowPaymentModal(false)} 
                    style={{ 
                      padding: '10px', 
                      background: COLORS.neutralLight, 
                      color: COLORS.textSecondary, 
                      border: `1px solid ${COLORS.border}`, 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontSize: '12px' 
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Thermal Print Content (hidden, used for printing) */}
        <div style={{ display: 'none' }}>
          <div ref={printRef}>
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: '14px',
              width: '80mm',
              margin: '0 auto',
              padding: '2px 2px 0 2px',
              lineHeight: '1.4',
              fontWeight: 'bold',
              color: 'black',
              background: 'white'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid black' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{businessDetails.name}</div>
                {businessDetails.address && <div style={{ fontSize: '10px', margin: '2px 0' }}>{businessDetails.address}</div>}
                {businessDetails.phone && <div style={{ fontSize: '10px', margin: '2px 0' }}>Tel: {businessDetails.phone}</div>}
                {businessDetails.gst && <div style={{ fontSize: '9px', margin: '2px 0' }}>{businessDetails.taxLabel || 'GST'}: {businessDetails.gst}</div>}
                <div style={{ fontSize: '10px', marginTop: '4px' }}>{formatDatePrint(order.createdAt)}</div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '12px' }}>
                  <strong>Order #:</strong> <span>{order.displayOrderNumber || order.orderNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '12px' }}>
                  <strong>Customer:</strong> <span>{order.customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '12px' }}>
                  <strong>Type:</strong> 
                  <span>{order.orderType === 'dine-in' ? `Dine-In (T-${order.tableNumber})` : (order.orderType?.toUpperCase() || 'DINE-IN')}</span>
                </div>
              </div>

              <div style={{ borderTop: '2px solid black', margin: '6px 0' }}></div>

              <table style={{ width: '100%', fontSize: '12px', margin: '6px 0', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid black' }}>
                    <th style={{ textAlign: 'left', padding: '5px 0' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '5px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '5px 0' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '5px 0' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '5px 0', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ textAlign: 'center', padding: '5px 0', fontWeight: 'bold' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '5px 0' }}>{formatCurrencyPrint(item.price)}</td>
                      <td style={{ textAlign: 'right', padding: '5px 0', fontWeight: 'bold' }}>{formatCurrencyPrint(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '2px solid black', margin: '6px 0' }}></div>

              <div style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrencyPrint(order.subtotal)}</span>
                </div>
                {shouldShowTax && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span>{businessDetails.taxLabel || 'Tax'} ({displayTaxRate}%):</span>
                    <span>{formatCurrencyPrint(displayTax)}</span>
                  </div>
                )}
                {shouldShowServiceCharge && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span>Service Charge:</span>
                    <span>{formatCurrencyPrint(order.serviceCharge)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', paddingTop: '6px', borderTop: '2px solid black', fontWeight: 'bold', fontSize: '14px' }}>
                  <span>TOTAL:</span>
                  <span>{formatCurrencyPrint(displayTotal)}</span>
                </div>
              </div>

              <div style={{ marginTop: '10px', padding: '8px', textAlign: 'center', background: isPaid ? '#dcfce7' : '#fef3c7', border: '2px solid black', borderRadius: '4px' }}>
                {isPaid ? (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#10b981' }}>✓ PAID ✓</div>
                    <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>
                      Paid via: {(payment?.method?.toUpperCase() || 'CASH')}
                      {payment.transactionId && <><br/>ID: {payment.transactionId}</>}
                      {payment.change > 0 && <><br/>Change: {formatCurrencyPrint(payment.change)}</>}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#d97706' }}>→ TO BE PAID ←</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Amount Due: {formatCurrencyPrint(displayTotal)}</div>
                    {businessDetails.upiId && (
                      <div style={{ marginTop: '6px' }}>
                        <div>UPI: {businessDetails.upiId}</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '11px', borderTop: '2px solid black', paddingTop: '8px', fontWeight: 'bold' }}>
                <div>{businessDetails.footerMessage || 'Thank you! Visit Again!'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Web View Content */}
        <div style={{ padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '4px', color: COLORS.textPrimary }}>{businessDetails.name}</h3>
            {businessDetails.address && <p style={{ fontSize: '10px', margin: '2px 0', color: COLORS.textSecondary }}>{businessDetails.address}</p>}
            {businessDetails.phone && <p style={{ fontSize: '10px', margin: '2px 0', color: COLORS.textSecondary }}>Tel: {businessDetails.phone}</p>}
            {businessDetails.gst && <p style={{ fontSize: '9px', margin: '2px 0', color: COLORS.textSecondary }}>{businessDetails.taxLabel || 'GST'}: {businessDetails.gst}</p>}
            <div style={{ borderTop: `1px dashed ${COLORS.border}`, margin: '8px 0' }}></div>
            <p style={{ fontSize: '10px', color: COLORS.textSecondary }}>{formatDatePrint(order.createdAt)}</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: COLORS.textPrimary }}><strong>Order #:</strong> {order.displayOrderNumber || order.orderNumber}</p>
            <p style={{ color: COLORS.textPrimary }}><strong>Customer:</strong> {order.customerName}</p>
            <p style={{ color: COLORS.textPrimary }}><strong>Type:</strong> {order.orderType === 'dine-in' ? `Dine-In (Table ${order.tableNumber})` : (order.orderType?.toUpperCase() || 'DINE-IN')}</p>
          </div>

          <div style={{ borderTop: `1px dashed ${COLORS.border}`, marginBottom: '12px' }}></div>

          <table style={{ width: '100%', fontSize: '10px', marginBottom: '12px', color: COLORS.textPrimary }}>
            <thead>
              <tr style={{ borderBottom: `1px dashed ${COLORS.border}` }}>
                <th style={{ textAlign: 'left', padding: '4px 0', color: COLORS.textSecondary }}>Item</th>
                <th style={{ textAlign: 'center', padding: '4px 0', color: COLORS.textSecondary }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '4px 0', color: COLORS.textSecondary }}>Price</th>
                <th style={{ textAlign: 'right', padding: '4px 0', color: COLORS.textSecondary }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '4px 0', color: COLORS.textPrimary }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '4px 0', color: COLORS.textPrimary }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '4px 0', color: COLORS.textPrimary }}>{currencySymbol}{item.price}</td>
                  <td style={{ textAlign: 'right', padding: '4px 0', color: COLORS.success, fontWeight: 'bold' }}>{currencySymbol}{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: `1px dashed ${COLORS.border}`, marginBottom: '12px' }}></div>

          <div style={{ fontSize: '10px', color: COLORS.textPrimary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Subtotal:</span>
              <span>{currencySymbol}{order.subtotal}</span>
            </div>
            {shouldShowTax && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>{businessDetails.taxLabel || 'Tax'} ({displayTaxRate}%):</span>
                <span>{currencySymbol}{displayTax.toFixed(2)}</span>
              </div>
            )}
            {shouldShowServiceCharge && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Service Charge:</span>
                <span>{currencySymbol}{order.serviceCharge}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: `1px dashed ${COLORS.border}`, fontWeight: 'bold' }}>
              <span>TOTAL:</span>
              <span style={{ color: COLORS.success }}>{currencySymbol}{displayTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '10px', background: payment?.method === 'credit' ? 'rgba(251, 141, 26, 0.1)' : (isPaid ? 'rgba(2, 134, 74, 0.1)' : 'rgba(251, 141, 26, 0.1)'), borderRadius: '8px', textAlign: 'center', border: `1px solid ${payment?.method === 'credit' ? 'rgba(251, 141, 26, 0.3)' : (isPaid ? 'rgba(2, 134, 74, 0.2)' : 'rgba(251, 141, 26, 0.2)')}` }}>
            {payment?.method === 'credit' ? (
              <>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.secondary, margin: 0 }}>→ CREDIT SALE - PENDING PAYMENT ←</p>
                <p style={{ fontSize: '9px', marginTop: '4px', color: COLORS.textSecondary }}>
                  Customer: {payment.customerName || order.customerName || 'N/A'}
                  {payment.customerPhone && <><br />Phone: {payment.customerPhone}</>}
                  {payment.dueDate && <><br />Due Date: {new Date(payment.dueDate).toLocaleDateString()}</>}
                  {payment.notes && <><br />Notes: {payment.notes}</>}
                  <br />Transaction ID: {payment.transactionId}
                </p>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    background: COLORS.secondary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FiCreditCard size={12} /> Collect Payment
                </button>
              </>
            ) : isPaid ? (
              <>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.success, margin: 0 }}>✓ PAID ✓</p>
                <p style={{ fontSize: '9px', marginTop: '4px', color: COLORS.textSecondary }}>
                  Paid via: {(payment?.method?.toUpperCase() || 'CASH')}
                  {payment.transactionId && <><br />ID: {payment.transactionId}</>}
                  {payment.change > 0 && <><br />Change: {currencySymbol}{payment.change}</>}
                  {payment.paidAt && <><br />Time: {new Date(payment.paidAt).toLocaleString()}</>}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.secondary, margin: 0 }}>→ TO BE PAID ←</p>
                <p style={{ fontSize: '9px', marginTop: '4px', color: COLORS.textSecondary }}>
                  Amount Due: {currencySymbol}{displayTotal.toFixed(2)}
                </p>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    background: COLORS.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FiCreditCard size={12} /> Pay Now
                </button>
                {businessDetails.upiId && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ 
                      display: 'inline-block', 
                      padding: '10px', 
                      background: COLORS.neutral, 
                      borderRadius: '8px',
                      border: `1px solid ${COLORS.border}`
                    }}>
                      <QRCode 
                        value={`upi://pay?pa=${businessDetails.upiId}&pn=${encodeURIComponent(businessDetails.name)}&am=${displayTotal}&cu=INR&tn=Order%20${order.orderNumber}`} 
                        size={120} 
                      />
                    </div>
                    <p style={{ fontSize: '8px', marginTop: '8px', color: COLORS.textSecondary }}>
                      UPI ID: {businessDetails.upiId}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '9px', color: COLORS.textMuted, borderTop: `1px dashed ${COLORS.border}`, paddingTop: '12px' }}>
            <p>{businessDetails.footerMessage}</p>
            <p style={{ fontSize: '8px', marginTop: '4px' }}>Thank you for your visit!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiptViewer;