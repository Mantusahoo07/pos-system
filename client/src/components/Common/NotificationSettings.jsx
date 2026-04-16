import React, { useState, useEffect } from 'react';
import { FiBell, FiBellOff, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import notificationService from '../../services/notificationService';

function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [userRole, setUserRole] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    // Get current user role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
    
    // Only check notification status for kitchen users
    if (user.role === 'kitchen') {
      checkNotificationStatus();
    } else {
      setCheckingStatus(false);
    }
  }, []);

  const checkNotificationStatus = async () => {
    setLoading(true);
    try {
      await notificationService.init();
      const subscription = await notificationService.getSubscription();
      setIsSubscribed(!!subscription);
      setPermissionStatus(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setLoading(false);
      setCheckingStatus(false);
    }
  };

  const enableNotifications = async () => {
    setLoading(true);
    try {
      const success = await notificationService.init();
      if (success) {
        const subscription = await notificationService.subscribe();
        if (subscription) {
          setIsSubscribed(true);
          setNotificationsEnabled(true);
          setPermissionStatus('granted');
          toast.success('Notifications enabled for Kitchen Display!');
          notificationService.showLocalNotification('🔔 Kitchen Notifications Active', {
            body: 'You will now receive real-time order updates!',
            tag: 'welcome',
            icon: '/icon-192.png',
            vibrate: [200, 100, 200]
          });
        }
      } else {
        toast.error('Please allow notification permissions');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    setLoading(true);
    try {
      await notificationService.unsubscribe();
      setIsSubscribed(false);
      setNotificationsEnabled(false);
      toast.success('Notifications disabled for Kitchen Display');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    setLoading(true);
    try {
      notificationService.showLocalNotification('🔔 Kitchen Test Notification', {
        body: 'This is a test notification for Kitchen Display!',
        tag: 'test',
        icon: '/icon-192.png',
        vibrate: [200, 100, 200]
      });
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (checkingStatus) {
    return (
      <div style={{
        background: '#1E1C2D',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #2D2A3F',
        textAlign: 'center'
      }}>
        <div className="loading-spinner" style={{ 
          width: '30px', 
          height: '30px', 
          margin: '0 auto 12px',
          border: '2px solid #2D2A3F',
          borderTopColor: '#573CFA',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ fontSize: '12px', color: '#A0A0B8' }}>Checking notification status...</p>
      </div>
    );
  }

  // For non-kitchen users, show a message
  if (userRole !== 'kitchen') {
    return (
      <div style={{
        background: '#1E1C2D',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #2D2A3F',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: 'rgba(87, 60, 250, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <FiInfo size={28} color="#573CFA" />
        </div>
        <h3 style={{ fontSize: '14px', color: '#FFFFFF', marginBottom: '8px' }}>Kitchen Display Only</h3>
        <p style={{ fontSize: '11px', color: '#A0A0B8', marginBottom: '12px' }}>
          Push notifications are only available for Kitchen Staff.
        </p>
        <p style={{ fontSize: '10px', color: '#6B6B80' }}>
          Current Role: <strong style={{ color: '#FB8D1A' }}>{userRole?.toUpperCase() || 'Unknown'}</strong>
        </p>
        <div style={{
          marginTop: '16px',
          padding: '10px',
          background: 'rgba(251, 141, 26, 0.1)',
          borderRadius: '8px',
          fontSize: '10px',
          color: '#FB8D1A'
        }}>
          💡 Kitchen staff should use the Kitchen Display tab to receive real-time order notifications.
        </div>
      </div>
    );
  }

  // For kitchen users, show the full notification settings
  return (
    <div style={{
      background: '#1E1C2D',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #2D2A3F'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: notificationsEnabled ? 'rgba(2, 134, 74, 0.1)' : 'rgba(232, 8, 62, 0.1)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {notificationsEnabled ? (
            <FiBell size={20} color="#02864A" />
          ) : (
            <FiBellOff size={20} color="#E8083E" />
          )}
        </div>
        <div>
          <h3 style={{ fontSize: '14px', margin: 0, color: '#FFFFFF' }}>Kitchen Push Notifications</h3>
          <p style={{ fontSize: '10px', color: '#A0A0B8', margin: '4px 0 0' }}>
            Receive real-time updates for new orders in Kitchen Display
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          padding: '10px',
          background: '#2D2A3F',
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#FFFFFF' }}>Kitchen Notifications:</span>
            <span style={{
              fontSize: '10px',
              color: notificationsEnabled ? '#02864A' : '#E8083E',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {notificationsEnabled ? (
                <><FiCheckCircle size={10} /> Active</>
              ) : (
                <><FiAlertCircle size={10} /> Inactive</>
              )}
            </span>
          </div>
          {permissionStatus === 'denied' && (
            <div style={{
              marginTop: '8px',
              padding: '6px',
              background: 'rgba(232, 8, 62, 0.1)',
              borderRadius: '6px',
              fontSize: '9px',
              color: '#E8083E'
            }}>
              ⚠️ Notifications are blocked. Please enable them in your browser settings.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!notificationsEnabled && permissionStatus !== 'denied' && (
            <button
              onClick={enableNotifications}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: '#02864A',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {loading ? <FiRefreshCw className="spinning" size={12} /> : <FiBell size={12} />}
              {loading ? 'Enabling...' : 'Enable Kitchen Notifications'}
            </button>
          )}

          {notificationsEnabled && (
            <button
              onClick={disableNotifications}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: '#E8083E',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {loading ? <FiRefreshCw className="spinning" size={12} /> : <FiBellOff size={12} />}
              {loading ? 'Disabling...' : 'Disable Notifications'}
            </button>
          )}

          {notificationsEnabled && (
            <button
              onClick={testNotification}
              disabled={loading}
              style={{
                padding: '8px 12px',
                background: '#573CFA',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FiBell size={12} /> Test
            </button>
          )}
        </div>
      </div>

      <div style={{
        padding: '10px',
        background: 'rgba(87, 60, 250, 0.1)',
        borderRadius: '8px',
        fontSize: '9px',
        color: '#A0A0B8'
      }}>
        <strong style={{ color: '#FFFFFF' }}>📢 Kitchen Notifications:</strong>
        <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
          <li style={{ marginBottom: '4px' }}>🍽️ New Dine-In orders</li>
          <li style={{ marginBottom: '4px' }}>📦 New Takeaway orders</li>
          <li style={{ marginBottom: '4px' }}>🛍️ New Zomato/Swiggy orders</li>
          <li style={{ marginBottom: '4px' }}>✏️ Order modifications</li>
          <li style={{ marginBottom: '4px' }}>⚡ Instant order requests</li>
          <li style={{ marginBottom: '4px' }}>❌ Cancellation requests</li>
          <li>💰 Ready for billing alerts</li>
        </ul>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        .loading-spinner {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default NotificationSettings;