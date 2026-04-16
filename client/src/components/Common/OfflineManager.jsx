import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

class OfflineQueue {
  constructor() {
    this.queue = [];
    this.loadFromStorage();
  }
  
  loadFromStorage() {
    const saved = localStorage.getItem('offlineQueue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }
  
  saveToStorage() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }
  
  add(action) {
    this.queue.push({
      ...action,
      id: Date.now(),
      timestamp: new Date()
    });
    this.saveToStorage();
  }
  
  getQueue() {
    return this.queue;
  }
  
  remove(id) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveToStorage();
  }
  
  clear() {
    this.queue = [];
    this.saveToStorage();
  }
}

function OfflineManager({ socket, onSync }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const offlineQueue = new OfflineQueue();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing pending actions...');
      syncQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Actions will be queued.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadQueue();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadQueue = () => {
    setQueue(offlineQueue.getQueue());
  };

  const syncQueue = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    const queuedActions = offlineQueue.getQueue();
    
    for (const action of queuedActions) {
      try {
        if (action.type === 'order') {
          socket.emit('new-order', action.data);
        } else if (action.type === 'stock') {
          socket.emit(action.data.available ? 'mark-in-stock' : 'mark-out-of-stock', action.data.itemId);
        }
        offlineQueue.remove(action.id);
        toast.success(`Synced: ${action.type}`);
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }
    
    setIsSyncing(false);
    loadQueue();
    if (onSync) onSync();
  };

  const queueAction = (type, data) => {
    offlineQueue.add({ type, data });
    loadQueue();
    toast.info(`Action queued (${queue.length + 1} pending)`);
    
    if (isOnline) {
      syncQueue();
    }
  };

  return (
    <div className="offline-manager">
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-indicator"></span>
        <span className="status-text">
          {isOnline ? 'Online' : 'Offline'}
        </span>
        {queue.length > 0 && (
          <span className="queue-count">{queue.length} pending</span>
        )}
      </div>
      
      {queue.length > 0 && (
        <div className="pending-queue">
          <h4>Pending Actions ({queue.length})</h4>
          <div className="queue-list">
            {queue.map(action => (
              <div key={action.id} className="queue-item">
                <span className="queue-type">{action.type}</span>
                <span className="queue-time">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          {isOnline && (
            <button className="sync-btn" onClick={syncQueue} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default OfflineManager;