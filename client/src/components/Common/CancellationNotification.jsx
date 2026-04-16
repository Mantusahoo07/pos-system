import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheck, FiX, FiTrash2, FiBell } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

function CancellationNotification({ socket, user, onRequestProcessed }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Only show for POS and Admin users, not for kitchen
  const shouldShow = user && (user.role === 'admin' || user.role === 'manager' || user.role === 'cashier');

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/orders/cancellation-requests/pending`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
        
        // Play sound and vibrate for new requests
        if (data.length > 0 && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([500, 200, 500]);
        }
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Listen for new cancellation requests via socket
  useEffect(() => {
    if (!socket || !shouldShow) return;
    
    const handleNewRequest = (request) => {
      console.log('New cancellation request:', request);
      fetchPendingRequests();
      
      // Play notification sound
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 300);
      } catch (e) {
        console.log('Sound not supported');
      }
      
      // Vibrate
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([300, 100, 300]);
      }
      
      toast(`🔔 Cancellation requested for ${request.itemName}`, {
        duration: 5000,
        icon: '🔔'
      });
    };
    
    const handleCancellationApproved = (data) => {
      console.log('Cancellation approved:', data);
      toast.success(`Item ${data.itemName} has been removed from Order ${data.orderNumber}`);
      // Refresh orders to update the UI
      if (onRequestProcessed) onRequestProcessed();
      fetchPendingRequests();
    };
    
    const handleCancellationRejected = (data) => {
      console.log('Cancellation rejected:', data);
      toast(`Cancellation for ${data.itemName} was rejected`, { icon: '❌' });
      if (onRequestProcessed) onRequestProcessed();
      fetchPendingRequests();
    };
    
    socket.on('cancellation-requested', handleNewRequest);
    socket.on('cancellation-approved', handleCancellationApproved);
    socket.on('cancellation-rejected', handleCancellationRejected);
    
    return () => {
      socket.off('cancellation-requested', handleNewRequest);
      socket.off('cancellation-approved', handleCancellationApproved);
      socket.off('cancellation-rejected', handleCancellationRejected);
    };
  }, [socket, shouldShow, onRequestProcessed]);

  // Initial fetch
  useEffect(() => {
    if (shouldShow) {
      fetchPendingRequests();
      // Poll every 10 seconds
      const interval = setInterval(fetchPendingRequests, 10000);
      return () => clearInterval(interval);
    }
  }, [shouldShow]);

  // Approve cancellation
  const handleApprove = async (request) => {
    try {
      const response = await fetch(`${API_URL}/orders/${request.orderId}/items/${request.itemId}/approve-cancellation`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Cancelled ${request.itemName} from Order ${request.orderNumber}`);
        setPendingRequests(prev => prev.filter(r => r.itemId !== request.itemId));
        // Refresh orders to update UI
        if (onRequestProcessed) onRequestProcessed();
        // Also refresh pending requests
        fetchPendingRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to approve cancellation');
      }
    } catch (error) {
      console.error('Error approving cancellation:', error);
      toast.error('Failed to approve cancellation');
    }
    setSelectedRequest(null);
  };

  // Reject cancellation
  const handleReject = async (request) => {
    try {
      const response = await fetch(`${API_URL}/orders/${request.orderId}/items/${request.itemId}/reject-cancellation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rejectReason: rejectReason || 'No reason provided' })
      });
      
      if (response.ok) {
        toast(`Cancellation rejected for ${request.itemName}`, { icon: '❌' });
        setPendingRequests(prev => prev.filter(r => r.itemId !== request.itemId));
        // Refresh orders to update UI
        if (onRequestProcessed) onRequestProcessed();
        fetchPendingRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reject cancellation');
      }
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast.error('Failed to reject cancellation');
    }
    setSelectedRequest(null);
    setRejectReason('');
  };

  const getOrderIdentifier = (request) => {
    if (request.orderType === 'dine-in' && request.tableNumber) {
      return `Table ${request.tableNumber}`;
    }
    if (request.orderType === 'delivery') {
      if (request.deliveryPlatform === 'zomato') return 'Zomato';
      if (request.deliveryPlatform === 'swiggy') return 'Swiggy';
      return 'Home Delivery';
    }
    return `Order #${request.orderNumber}`;
  };

  if (!shouldShow) return null;

  if (pendingRequests.length === 0) return null;

  return (
    <>
      {/* Notification Bar - Fixed at top below header */}
      <div
        onClick={() => setShowPanel(true)}
        style={{
          position: 'fixed',
          top: '60px',
          left: '250px',
          right: '20px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.3s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiBell size={18} />
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
            {pendingRequests.length} Cancellation Request{pendingRequests.length > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '10px', opacity: 0.9 }}>
            Click to review
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: '20px',
            fontSize: '10px'
          }}>
            {pendingRequests.length}
          </span>
        </div>
      </div>

      {/* Modal Panel */}
      {showPanel && (
        <>
          <div
            onClick={() => setShowPanel(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 2000
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '500px',
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '16px',
              background: '#ef4444',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiTrash2 size={18} />
                <h3 style={{ fontSize: '14px', margin: 0 }}>Cancellation Requests</h3>
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '10px'
                }}>
                  {pendingRequests.length}
                </span>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <FiX size={18} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {pendingRequests.map((request, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '10px',
                    background: '#fef2f2'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#dc2626' }}>
                        {request.itemName} × {request.quantity}
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {getOrderIdentifier(request)}
                      </div>
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                      {new Date(request.requestedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#64748b',
                    background: '#fff',
                    padding: '6px',
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}>
                    Reason: {request.reason}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApprove(request)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <FiCheck size={12} /> Approve
                    </button>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <FiX size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reject Modal */}
      {selectedRequest && (
        <>
          <div
            onClick={() => { setSelectedRequest(null); setRejectReason(''); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 2100
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '350px',
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            zIndex: 2101
          }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Reject Cancellation</h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
              Reject cancellation for "{selectedRequest.itemName}"?
            </p>
            <textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11px',
                marginBottom: '16px',
                resize: 'vertical'
              }}
              rows="2"
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setSelectedRequest(null); setRejectReason(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#94a3b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedRequest)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export default CancellationNotification;