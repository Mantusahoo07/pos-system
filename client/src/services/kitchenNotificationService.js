// client/src/services/kitchenNotificationService.js

class KitchenNotificationService {
  constructor() {
    this.swRegistration = null;
    this.isSubscribed = false;
    this.vapidPublicKey = null;
    this.apiUrl = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';
  }

  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('❌ Push notifications not supported');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      await this.fetchVapidPublicKey();
      console.log('✅ Kitchen notification service initialized');
      return true;
    } catch (error) {
      console.error('❌ Kitchen notification init error:', error);
      return false;
    }
  }

  async fetchVapidPublicKey() {
    try {
      const response = await fetch(`${this.apiUrl}/notifications/vapid-public-key`);
      if (response.ok) {
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
        console.log('✅ VAPID public key fetched');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to fetch VAPID key:', error);
    }
    return false;
  }

  async requestPermission() {
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      console.log('📢 Permission result:', permission);
      return permission === 'granted';
    }
    
    console.log('❌ Notification permission denied');
    return false;
  }

  async subscribe() {
    if (!this.swRegistration) {
      console.log('❌ Service Worker not ready');
      return false;
    }

    if (!this.vapidPublicKey) {
      console.log('❌ VAPID public key not available');
      await this.fetchVapidPublicKey();
      if (!this.vapidPublicKey) return false;
    }

    const permissionGranted = await this.requestPermission();
    if (!permissionGranted) return false;

    try {
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('✅ Already subscribed to kitchen notifications');
        this.isSubscribed = true;
        return true;
      }

      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });
      
      await this.saveSubscriptionToServer(subscription);
      this.isSubscribed = true;
      console.log('✅ Subscribed to kitchen notifications');
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe:', error);
      return false;
    }
  }

  async saveSubscriptionToServer(subscription) {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await fetch(`${this.apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Error saving subscription:', error);
      return false;
    }
  }

  async unsubscribe() {
    if (!this.swRegistration) return;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`${this.apiUrl}/notifications/unsubscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        }
        
        this.isSubscribed = false;
        console.log('✅ Unsubscribed from kitchen notifications');
      }
    } catch (error) {
      console.error('❌ Failed to unsubscribe:', error);
    }
  }

  async checkSubscription() {
    if (!this.swRegistration) return false;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = !!subscription;
      return this.isSubscribed;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  async ensureSubscription() {
    console.log('🔔 Ensuring kitchen notification subscription...');
    
    await this.init();
    const isSubscribed = await this.checkSubscription();
    
    if (!isSubscribed) {
      console.log('📝 No subscription found, creating new one...');
      return await this.subscribe();
    }
    
    console.log('✅ Already subscribed to kitchen notifications');
    return true;
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export default new KitchenNotificationService();