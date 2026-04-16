// src/services/notificationService.js

class NotificationService {
  constructor() {
    this.swRegistration = null;
    this.permissionGranted = false;
    this.isSubscribed = false;
    this.apiUrl = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';
    this.currentUser = null;
    this.currentUserRole = null;
    this.vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 'BLiNlzBDszn00bfL0w25zye0nz725AzWDHT-9RM-pksxzBbMWiO9W8cVTZdL1W5ouLIAcTMKyFkN4eXq4vAb_Kg';
    this.isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
  }

  async init() {
    // Check if Service Worker and Push are supported
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker not supported');
      return false;
    }

    if (!('PushManager' in window)) {
      console.log('❌ Push notifications not supported in this browser');
      return false;
    }

    // Get current user from localStorage
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.currentUser = user;
        this.currentUserRole = user.role;
        console.log('📢 Current user role:', this.currentUserRole);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }

    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');
      
      this.permissionGranted = Notification.permission === 'granted';
      console.log('📢 Notification permission:', this.permissionGranted ? 'Granted' : Notification.permission);
      console.log('🌐 Browser:', this.isFirefox ? 'Firefox' : 'Other');
      
      return true;
    } catch (error) {
      console.error('❌ Notification init error:', error);
      return false;
    }
  }

  async requestPermission() {
    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      try {
        console.log('📢 Requesting notification permission...');
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
        console.log('📢 Permission result:', permission);
        
        if (this.permissionGranted && this.isFirefox) {
          console.log('📢 Firefox permission granted, re-initializing...');
          await this.init();
        }
        
        return this.permissionGranted;
      } catch (error) {
        console.error('❌ Error requesting permission:', error);
        return false;
      }
    }
    
    console.log('❌ Notification permission denied by user');
    return false;
  }

  async checkSubscription() {
    if (!this.swRegistration) {
      console.log('❌ Service Worker not ready');
      return false;
    }
    
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = !!subscription;
      console.log('📢 Current subscription status:', this.isSubscribed);
      return this.isSubscribed;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  async subscribe() {
    if (!this.swRegistration) {
      console.log('❌ Service Worker not ready');
      return null;
    }

    if (!this.permissionGranted) {
      console.log('❌ Notification permission not granted');
      const permissionGranted = await this.requestPermission();
      if (!permissionGranted) return null;
    }

    // ONLY subscribe if user is kitchen (no admin)
    if (this.currentUserRole !== 'kitchen') {
      console.log(`❌ Skipping notification subscription for role: ${this.currentUserRole}. Only Kitchen staff can receive notifications.`);
      this.showRoleNotificationWarning();
      return null;
    }

    console.log(`✅ Kitchen role confirmed - proceeding with subscription`);

    try {
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('✅ Already subscribed to push notifications');
        this.isSubscribed = true;
        return existingSubscription;
      }

      console.log('📝 Creating new push subscription...');
      
      let subscription;
      
      try {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      } catch (subError) {
        console.error('Subscription error:', subError);
        
        if (this.isFirefox) {
          console.log('🔄 Retrying Firefox subscription without VAPID key...');
          subscription = await this.swRegistration.pushManager.subscribe({
            userVisibleOnly: true
          });
        } else {
          throw subError;
        }
      }
      
      console.log('✅ Push subscription created successfully');
      this.isSubscribed = true;
      
      await this.saveSubscriptionToServer(subscription);
      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe:', error);
      console.error('Error details:', error.message);
      
      if (this.isFirefox) {
        console.log('📢 Firefox specific: Push notifications may require HTTPS or browser settings');
      }
      
      return null;
    }
  }

  showRoleNotificationWarning() {
    // Only show if user is logged in and not kitchen
    if (this.currentUserRole && this.currentUserRole !== 'kitchen') {
      const warningDiv = document.createElement('div');
      warningDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1E1C2D;
        border-left: 4px solid #FB8D1A;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 12px;
        color: #FFFFFF;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
      `;
      warningDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">👨‍🍳</span>
          <div>
            <strong>Kitchen Only Feature</strong>
            <div style="font-size: 10px; color: #A0A0B8; margin-top: 4px;">
              Push notifications are only available for Kitchen Staff.
              Please switch to Kitchen Display tab.
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(warningDiv);
      
      setTimeout(() => {
        warningDiv.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => warningDiv.remove(), 300);
      }, 5000);
    }
  }

  async saveSubscriptionToServer(subscription) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No auth token, cannot save subscription');
        return false;
      }

      const response = await fetch(`${this.apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Server error:', error);
        return false;
      }
      
      const data = await response.json();
      console.log('✅ Subscription saved to server, kitchen subscribers:', data.kitchenSubscribers);
      return true;
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
        this.isSubscribed = false;
        
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
        console.log('✅ Unsubscribed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to unsubscribe:', error);
    }
  }

  async ensureSubscription() {
    console.log('🔔 Ensuring push notification subscription...');
    console.log('👤 User role:', this.currentUserRole);
    
    // Initialize
    await this.init();
    
    // Only proceed for kitchen users
    if (this.currentUserRole !== 'kitchen') {
      console.log(`❌ Skipping notification setup for role: ${this.currentUserRole}. Only Kitchen staff can receive notifications.`);
      return false;
    }
    
    // Check permission and request if needed
    if (!this.permissionGranted) {
      console.log('📢 Requesting notification permission...');
      const granted = await this.requestPermission();
      if (!granted) {
        console.log('❌ User denied notification permission');
        return false;
      }
    }
    
    if (this.isFirefox) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const hasSubscription = await this.checkSubscription();
    
    if (!hasSubscription) {
      console.log('📝 No subscription found, creating new one...');
      const subscription = await this.subscribe();
      if (subscription) {
        console.log('✅ Successfully subscribed to push notifications');
        
        this.showLocalNotification('👨‍🍳 Kitchen Notifications Active', {
          body: 'You will now receive real-time order updates!',
          icon: '/icon-192.png',
          tag: 'subscription-success',
          vibrate: [200, 100, 200]
        });
        
        return true;
      }
      
      if (this.isFirefox) {
        this.showFirefoxHelpMessage();
      }
      
      return false;
    }
    
    console.log('✅ Already subscribed to push notifications');
    return true;
  }

  showFirefoxHelpMessage() {
    const existingModal = document.getElementById('firefox-notification-help');
    if (existingModal) return;
    
    const modal = document.createElement('div');
    modal.id = 'firefox-notification-help';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    modal.innerHTML = `
      <div style="
        background: #1E1C2D;
        border-radius: 16px;
        padding: 24px;
        max-width: 350px;
        margin: 20px;
        border: 1px solid #2D2A3F;
        color: #FFFFFF;
      ">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="font-size: 48px; margin-bottom: 8px;">🦊</div>
          <h3 style="font-size: 18px; margin: 0 0 8px 0;">Firefox Android Setup</h3>
        </div>
        
        <div style="font-size: 13px; line-height: 1.5; color: #A0A0B8; margin-bottom: 20px;">
          To enable notifications in Firefox Android:
        </div>
        
        <ol style="font-size: 12px; line-height: 1.6; color: #A0A0B8; margin: 0 0 20px 0; padding-left: 20px;">
          <li>Tap the lock icon 🔒 in the address bar</li>
          <li>Tap "Site settings" or "Permissions"</li>
          <li>Find "Notifications" and set to "Allow"</li>
          <li>Refresh this page</li>
        </ol>
        
        <button id="firefox-help-close" style="
          width: 100%;
          padding: 12px;
          background: #573CFA;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        ">Got it</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('firefox-help-close').onclick = () => {
      modal.remove();
    };
  }

  showLocalNotification(title, options = {}) {
    if (!this.permissionGranted) return;
    
    try {
      if (this.swRegistration && this.swRegistration.showNotification) {
        this.swRegistration.showNotification(title, options);
      } else if (Notification.permission === 'granted') {
        new Notification(title, options);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
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

export default new NotificationService();