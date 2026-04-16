// src/components/Common/NotificationSettings.jsx
import React, { useState, useEffect } from 'react';
import { FiBell, FiBellOff, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import notificationService from '../../services/notificationService';

const COLORS = {
  primary: '#573CFA',
  secondary: '#FB8D1A',
  danger: '#E8083E',
  success: '#02864A',
  neutral: '#1C1A27',
  neutralLight: '#2D2A3F',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  border: '#2D2A3F',
  bgCard: '#1E1C2D'
};

function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    // Get current user role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
    checkNotificationStatus();
    checkServiceWorker();
  }, []);

  const checkServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        setServiceWorkerReady(true);
        console.log('Service Worker ready:', registration);
      } catch (error) {
        console.error('Service Worker not ready:', error);
        setServiceWorkerReady(false);
      }
    } else {
      console.log('Service Worker not supported');
      setServiceWorkerReady(false);
    }
  };

  const checkNotificationStatus = async () => {
    setCheckingStatus(true);
    try {
      await notificationService.init();
      const subscription = await notificationService.getSubscription();
      setIsSubscribed(!!subscription);
      setNotificationsEnabled(Notification.permission === 'granted');
      setPermissionStatus(Notification.permission);
      console.log('Notification status - Permission:', Notification.permission, 'Subscribed:', !!subscription);
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const enableNotifications = async () => {
    setLoading(true);
    try {
      if (!serviceWorkerReady) {
        await checkServiceWorker();
        if (!serviceWorkerReady) {
          toast.error('Service Worker not ready. Please refresh the page and try again.');
          setLoading(false);
          return;
        }
      }
      
      const success = await notificationService.init();
      if (success) {
        const subscription = await notificationService.subscribe();
        if (subscription) {
          setIsSubscribed(true);
          setNotificationsEnabled(true);
          setPermissionStatus('granted');
          toast.success(`Notifications enabled for ${userRole} role!`);
          
          setTimeout(() => {
            notificationService.showLocalNotification('Notifications Enabled', {
              body: `You (${userRole}) will now receive real-time updates.`,
              tag: 'welcome',
              icon: '/icon-192.png'
            });
          }, 1000);
        } else {
          toast.error('Failed to subscribe to notifications');
        }
      } else {
        if (Notification.permission === 'denied') {
          toast.error('Notifications are blocked. Please enable them in your browser settings.');
        } else {
          toast.error('Please allow notification permissions');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error(error.message || 'Failed to enable notifications');
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
      toast.success('Notifications disabled');
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
      if (Notification.permission === 'granted') {
        notificationService.showLocalNotification(`Test Notification for ${userRole}`, {
          body: `This is a test notification for ${userRole} role!`,
          tag: 'test',
          icon: '/icon-192.png',
          vibrate: [200, 100, 200]
        });
        toast.success('Test notification sent!');
      } else {
        toast.error('Notification permission not granted');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        await enableNotifications();
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div style={{
        background: COLORS.bgCard,
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${COLORS.border}`,
        textAlign: 'center'
      }}>
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ fontSize: '12px', color: COLORS.textSecondary }}>Checking notification status...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: COLORS.bgCard,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${COLORS.border}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: notificationsEnabled ? `${COLORS.success}20` : `${COLORS.danger}20`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {notificationsEnabled ? (
            <FiBell size={24} color={COLORS.success} />
          ) : (
            <FiBellOff size={24} color={COLORS.danger} />
          )}
        </div>
        <div>
          <h3 style={{ fontSize: '16px', margin: 0, color: COLORS.textPrimary }}>Push Notifications</h3>
          <p style={{ fontSize: '11px', color: COLORS.textSecondary, margin: '4px 0 0' }}>
            Receive real-time updates for new orders, cancellations, and alerts
          </p>
          {userRole && (
            <p style={{ fontSize: '10px', color: COLORS.primary, marginTop: '4px' }}>
              Current Role: {userRole.toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '12px',
          background: COLORS.neutralLight,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ fontSize: '10px', color: COLORS.textSecondary, marginBottom: '4px' }}>Permission</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: permissionStatus === 'granted' ? COLORS.success : (permissionStatus === 'denied' ? COLORS.danger : COLORS.secondary)
          }}>
            {permissionStatus === 'granted' ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {permissionStatus === 'granted' ? 'Granted' : permissionStatus === 'denied' ? 'Blocked' : 'Not Set'}
            </span>
          </div>
        </div>
        
        <div style={{
          padding: '12px',
          background: COLORS.neutralLight,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ fontSize: '10px', color: COLORS.textSecondary, marginBottom: '4px' }}>Service Worker</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: serviceWorkerReady ? COLORS.success : COLORS.danger
          }}>
            {serviceWorkerReady ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {serviceWorkerReady ? 'Ready' : 'Not Ready'}
            </span>
          </div>
        </div>
        
        <div style={{
          padding: '12px',
          background: COLORS.neutralLight,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ fontSize: '10px', color: COLORS.textSecondary, marginBottom: '4px' }}>Subscription</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: isSubscribed ? COLORS.success : COLORS.textMuted
          }}>
            {isSubscribed ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {isSubscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Warning for blocked permissions */}
      {permissionStatus === 'denied' && (
        <div style={{
          padding: '12px',
          background: `${COLORS.danger}20`,
          borderRadius: '8px',
          marginBottom: '16px',
          border: `1px solid ${COLORS.danger}40`
        }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.danger, marginBottom: '4px' }}>
            ⚠️ Notifications are blocked
          </div>
          <div style={{ fontSize: '10px', color: COLORS.textSecondary }}>
            Please enable notifications in your browser settings
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {permissionStatus !== 'granted' && permissionStatus !== 'denied' && (
          <button
            onClick={requestPermission}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? <FiRefreshCw className="spinning" size={16} /> : <FiBell size={16} />}
            {loading ? 'Requesting...' : 'Enable Notifications'}
          </button>
        )}

        {permissionStatus === 'granted' && !isSubscribed && (
          <button
            onClick={enableNotifications}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: COLORS.success,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? <FiRefreshCw className="spinning" size={16} /> : <FiBell size={16} />}
            {loading ? 'Subscribing...' : 'Subscribe to Notifications'}
          </button>
        )}

        {isSubscribed && (
          <button
            onClick={disableNotifications}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: COLORS.danger,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? <FiRefreshCw className="spinning" size={16} /> : <FiBellOff size={16} />}
            {loading ? 'Disabling...' : 'Disable Notifications'}
          </button>
        )}

        {isSubscribed && (
          <button
            onClick={testNotification}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: COLORS.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FiBell size={14} /> Test
          </button>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: `${COLORS.primary}10`,
        borderRadius: '8px',
        border: `1px solid ${COLORS.primary}20`
      }}>
        <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.primary, marginBottom: '8px' }}>
          📢 What you'll receive as {userRole?.toUpperCase()}:
        </div>
        <div style={{ fontSize: '10px', color: COLORS.textSecondary, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
          <div>🔔 New order alerts</div>
          <div>✅ Order acceptance confirmations</div>
          <div>💰 Ready for billing notifications</div>
          <div>❌ Cancellation requests</div>
          <div>⚡ Instant order requests</div>
          <div>📝 Order modifications</div>
        </div>
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
          width: 30px;
          height: 30px;
          border: 2px solid ${COLORS.border};
          border-top-color: ${COLORS.primary};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default NotificationSettings;