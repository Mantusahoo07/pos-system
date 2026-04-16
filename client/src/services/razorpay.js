class RazorpayService {
  constructor() {
    this.key = import.meta.env.VITE_RAZORPAY_KEY_ID;
    this.isLoaded = false;
  }

  loadScript() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('#razorpay-script')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  async createOrder(amount, currency = 'INR') {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
          currency,
          receipt: `order_${Date.now()}`
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  async openPayment(options) {
    await this.loadScript();

    return new Promise((resolve, reject) => {
      const razorpayOptions = {
        key: this.key,
        amount: options.amount,
        currency: options.currency || 'INR',
        name: options.name || 'Restaurant POS',
        description: options.description || `Order #${options.orderNumber}`,
        order_id: options.orderId,
        handler: (response) => {
          resolve(response);
        },
        prefill: {
          name: options.customerName || '',
          email: options.customerEmail || '',
          contact: options.customerPhone || ''
        },
        notes: {
          orderNumber: options.orderNumber,
          orderType: options.orderType
        },
        theme: {
          color: '#3498db'
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
    });
  }

  async processPayment(orderDetails) {
    try {
      // Create order on server
      const order = await this.createOrder(orderDetails.total);
      
      // Open Razorpay checkout
      const paymentResponse = await this.openPayment({
        amount: orderDetails.total * 100,
        orderId: order.id,
        orderNumber: orderDetails.orderNumber,
        customerName: orderDetails.customerName,
        customerEmail: orderDetails.customerEmail,
        customerPhone: orderDetails.customerPhone,
        description: `Payment for Order #${orderDetails.orderNumber}`
      });

      // Verify payment on server
      const verification = await fetch(`${import.meta.env.VITE_API_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId: order.id,
          paymentId: paymentResponse.razorpay_payment_id,
          signature: paymentResponse.razorpay_signature
        })
      });

      const verificationResult = await verification.json();
      
      if (verificationResult.success) {
        return {
          success: true,
          paymentId: paymentResponse.razorpay_payment_id,
          orderId: order.id
        };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new RazorpayService();