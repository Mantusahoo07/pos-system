import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

class PaymentService {
  constructor() {
    this.razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
    console.log('Razorpay Key loaded:', this.razorpayKey ? 'Yes' : 'No');
  }

  // Get auth token with validation
  getAuthToken() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found in localStorage');
      return null;
    }
    
    // Check if token is expired (simple check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.warn('Token expired');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    } catch (e) {
      console.warn('Invalid token format');
    }
    
    return token;
  }

  // Load Razorpay script
  loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        console.log('Razorpay already loaded');
        resolve();
        return;
      }
      
      if (document.querySelector('#razorpay-script')) {
        console.log('Razorpay script already added, waiting for load');
        const script = document.querySelector('#razorpay-script');
        script.onload = resolve;
        script.onerror = reject;
        return;
      }
      
      console.log('Loading Razorpay script...');
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        console.log('Razorpay script loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load Razorpay script:', error);
        reject(error);
      };
      document.body.appendChild(script);
    });
  }

  // Create Razorpay order on backend
  async createRazorpayOrder(amount, orderId) {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        throw new Error('Please login again to continue payment');
      }
      
      console.log('Creating Razorpay order for amount:', amount);
      console.log('Token present:', !!token);
      
      const response = await axios.post(`${API_URL}/payments/create-order`, {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `order_${orderId}_${Date.now()}`
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('Razorpay order created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating Razorpay order:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Session expired. Please login again.');
      }
      
      throw new Error(error.response?.data?.error || 'Failed to create payment order');
    }
  }

  // Verify payment on backend
  async verifyPayment(orderId, paymentId, signature) {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        throw new Error('Please login again to verify payment');
      }
      
      console.log('Verifying payment:', { orderId, paymentId });
      
      const response = await axios.post(`${API_URL}/payments/verify`, {
        orderId,
        paymentId,
        signature
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('Payment verification response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error verifying payment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Payment verification failed');
    }
  }

  // Process card payment with Razorpay
  async processCardPayment(amount, orderDetails) {
    const self = this; // Store reference to this
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Starting card payment process...');
        console.log('Amount:', amount);
        console.log('Order details:', orderDetails);
        
        // Check if user is authenticated
        const token = self.getAuthToken();
        if (!token) {
          toast.error('Please login to make payment');
          reject(new Error('Please login to make payment'));
          return;
        }
        
        // Load Razorpay script
        await self.loadRazorpayScript();
        
        if (!window.Razorpay) {
          throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
        }
        
        // Create order on backend
        const razorpayOrder = await self.createRazorpayOrder(amount, orderDetails.orderNumber);
        
        if (!razorpayOrder || !razorpayOrder.id) {
          throw new Error('Failed to create Razorpay order');
        }
        
        console.log('Razorpay order created:', razorpayOrder);
        
        const options = {
          key: self.razorpayKey,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: orderDetails.restaurantName || 'Restaurant POS',
          description: `Payment for Order #${orderDetails.orderNumber}`,
          order_id: razorpayOrder.id,
          handler: async (response) => {
            console.log('Razorpay payment response:', response);
            try {
              const verification = await self.verifyPayment(
                razorpayOrder.id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              
              if (verification.success) {
                console.log('Payment verified successfully');
                resolve({
                  success: true,
                  paymentId: response.razorpay_payment_id,
                  transactionId: response.razorpay_payment_id,
                  method: 'card',
                  gatewayCharges: amount * 0.02
                });
              } else {
                throw new Error('Payment verification failed');
              }
            } catch (error) {
              console.error('Verification error:', error);
              reject(error);
            }
          },
          prefill: {
            name: orderDetails.customerName || 'Customer',
            email: orderDetails.customerEmail || '',
            contact: orderDetails.customerPhone || ''
          },
          theme: {
            color: '#4361ee'
          },
          modal: {
            ondismiss: () => {
              console.log('Payment modal dismissed');
              reject(new Error('Payment cancelled by user'));
            }
          }
        };
        
        const razorpay = new window.Razorpay(options);
        
        razorpay.on('payment.failed', (response) => {
          console.error('Payment failed:', response);
          reject(new Error(response.error?.description || 'Payment failed'));
        });
        
        razorpay.open();
        
      } catch (error) {
        console.error('Card payment error:', error);
        reject(error);
      }
    });
  }

  // Get UPI QR Code
  getUPIQRCode(amount, orderDetails) {
    const upiId = 'paytm.s1yxcay@pty';
    const payeeName = 'Restaurant POS';
    const description = `Order #${orderDetails.orderNumber}`;
    
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;
    
    return {
      upiUrl,
      upiId,
      amount,
      orderNumber: orderDetails.orderNumber
    };
  }

  // Process Credit Sale
  async processCreditSale(orderId, customerDetails) {
    try {
      const token = this.getAuthToken();
      const response = await axios.post(`${API_URL}/payments/credit-sale`, {
        orderId,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        customerEmail: customerDetails.email,
        dueDate: customerDetails.dueDate,
        amount: customerDetails.amount
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      return response.data;
    } catch (error) {
      console.error('Credit sale error:', error);
      throw error;
    }
  }
}

export default new PaymentService();