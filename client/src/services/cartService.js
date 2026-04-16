const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

class CartService {
  constructor() {
    this.sessionId = this.getSessionId();
  }

  getSessionId() {
    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
  }

  async getCart() {
    try {
      const response = await fetch(`${API_URL}/cart/${this.sessionId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching cart:', error);
      return null;
    }
  }

  async saveCart(cartData) {
    try {
      const response = await fetch(`${API_URL}/cart/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartData)
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error saving cart:', error);
      return null;
    }
  }

  async addItem(item) {
    try {
      const response = await fetch(`${API_URL}/cart/${this.sessionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item })
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error adding item:', error);
      return null;
    }
  }

  async updateItemQuantity(itemId, quantity) {
    try {
      const response = await fetch(`${API_URL}/cart/${this.sessionId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error updating item quantity:', error);
      return null;
    }
  }

  async removeItem(itemId) {
    try {
      const response = await fetch(`${API_URL}/cart/${this.sessionId}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error removing item:', error);
      return null;
    }
  }

  async clearCart() {
    try {
      const response = await fetch(`${API_URL}/cart/${this.sessionId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }
}

export default new CartService();