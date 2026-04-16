class OfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingOrders = [];
    this.pendingCart = null;
    this.syncInProgress = false;
    
    // Load pending orders from localStorage
    this.loadPendingOrders();
    this.loadPendingCart();
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  loadPendingOrders() {
    try {
      const saved = localStorage.getItem('pendingOrders');
      if (saved) {
        this.pendingOrders = JSON.parse(saved);
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
    this.syncAll();
  }

  handleOffline() {
    console.log('🔴 Offline - Will store data locally');
    this.isOnline = false;
  }

  async syncAll() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      // Sync pending orders
      await this.syncPendingOrders();
      
      // Sync pending cart
      await this.syncPendingCart();
      
      console.log('✅ Sync completed');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncPendingOrders() {
    if (this.pendingOrders.length === 0) return;

    console.log(`Syncing ${this.pendingOrders.length} pending orders...`);
    
    const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';
    const successful = [];
    const failed = [];

    for (const order of this.pendingOrders) {
      try {
        const response = await fetch(`${API_URL}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order.data)
        });
        
        if (response.ok) {
          const savedOrder = await response.json();
          successful.push(order);
          console.log(`✅ Synced order #${order.orderNumber}`);
        } else {
          failed.push(order);
        }
      } catch (error) {
        console.error(`Failed to sync order #${order.orderNumber}:`, error);
        failed.push(order);
      }
    }

    // Update pending orders list
    this.pendingOrders = failed;
    this.savePendingOrders();
    
    return { successful, failed };
  }

  async syncPendingCart() {
    if (!this.pendingCart) return;

    const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';
    
    try {
      const response = await fetch(`${API_URL}/cart/${this.pendingCart.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Store order offline
  storeOrderOffline(orderData) {
    const pendingOrder = {
      id: Date.now(),
      orderNumber: orderData.orderNumber,
      data: orderData,
      timestamp: new Date().toISOString()
    };
    
    this.pendingOrders.push(pendingOrder);
    this.savePendingOrders();
    
    return pendingOrder;
  }

  // Store cart offline
  storeCartOffline(sessionId, cartData) {
    this.pendingCart = {
      sessionId,
      data: cartData,
      timestamp: new Date().toISOString()
    };
    this.savePendingCart();
  }

  // Get pending orders
  getPendingOrders() {
    return this.pendingOrders;
  }

  // Get pending cart
  getPendingCart() {
    return this.pendingCart;
  }

  // Check if online
  get isConnected() {
    return this.isOnline;
  }

  // Clear all pending data
  clearAll() {
    this.pendingOrders = [];
    this.pendingCart = null;
    this.savePendingOrders();
    this.savePendingCart();
  }
}

export default new OfflineService();