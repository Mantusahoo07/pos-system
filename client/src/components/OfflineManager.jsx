import React, { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff, FiRefreshCw, FiDownloadCloud, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

// This component is now mostly for showing sync details when clicked
// The main sync UI is in the TopBar
function OfflineManager({ isOnline, pendingCount, onSync, pendingOrders = [] }) {
  const [showDetails, setShowDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing || !isOnline || pendingCount === 0) return;
    setSyncing(true);
    toast.loading(`Syncing ${pendingCount} item(s)...`, { id: 'sync-details' });
    await onSync();
    setSyncing(false);
    toast.success('Sync completed!', { id: 'sync-details', duration: 2000 });
    setShowDetails(false);
  };

  // Only show the details panel when there are pending items
  if (pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* Small indicator in corner - just shows count, main sync is in header */}
      <div 
        onClick={() => setShowDetails(!showDetails)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 999,
          background: isOnline ? '#3b82f6' : '#f59e0b',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ position: 'relative' }}>
          {syncing ? <FiRefreshCw className="spinning" size={20} /> : <FiDownloadCloud size={20} />}
          {pendingCount > 0 && !syncing && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-12px',
              background: '#ef4444',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {pendingCount}
            </span>
          )}
        </span>
      </div>

      {/* Details Panel */}
      {showDetails && pendingOrders.length > 0 && (
        <>
          <div 
            onClick={() => setShowDetails(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '320px',
            maxHeight: '400px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1001,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '12px 16px',
              background: isOnline ? '#3b82f6' : '#f59e0b',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isOnline ? <FiWifi size={16} /> : <FiWifiOff size={16} />}
                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>
              <button 
                onClick={() => setShowDetails(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                Pending Orders ({pendingOrders.length})
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {pendingOrders.map((order, idx) => (
                  <div key={idx} style={{
                    padding: '8px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '11px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>#{order.orderNumber}</span>
                      <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '10px' }}>
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {!isOnline && <FiAlertCircle size={12} color="#f59e0b" />}
                    {isOnline && <FiCheckCircle size={12} color="#10b981" />}
                  </div>
                ))}
              </div>
              
              {isOnline && pendingCount > 0 && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {syncing ? <FiRefreshCw className="spinning" size={14} /> : <FiDownloadCloud size={14} />}
                  {syncing ? 'Syncing...' : `Sync ${pendingCount} Order(s)`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default OfflineManager;