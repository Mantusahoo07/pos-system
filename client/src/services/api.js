const API_BASE = import.meta.env.VITE_API_URL || 'https://server-uvyi.onrender.com/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  // Payment endpoints
  createRazorpayOrder(orderData) {
    return this.request('/payments/create-razorpay-order', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  verifyRazorpayPayment(paymentData) {
    return this.request('/payments/verify-razorpay-payment', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // ... other methods remain the same
}

export default new ApiService();