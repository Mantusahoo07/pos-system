import React from 'react';
import { FiMenu, FiLogOut, FiRefreshCw, FiWifi, FiWifiOff, FiDownloadCloud } from 'react-icons/fi';

const TopBar = ({ toggleSidebar, connected, user, onLogout, pendingSyncCount, isOnline, onSync, isSyncing }) => {
  return (
    <div className="top-bar">
      <button className="menu-toggle" onClick={toggleSidebar}>
        <FiMenu />
      </button>
      
      <div className="top-bar-right">
        {/* Connection Status */}
        <div className={`connection-status ${!connected ? 'offline' : ''}`}>
          {connected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
          <span>{connected ? 'Online' : 'Reconnecting...'}</span>
        </div>
        
        {/* Sync Button - Only show when there are pending items or syncing */}
        {(pendingSyncCount > 0 || isSyncing) && (
          <button 
            className={`sync-btn ${isSyncing ? 'syncing' : ''}`}
            onClick={onSync}
            disabled={isSyncing}
            title={pendingSyncCount > 0 ? `${pendingSyncCount} pending orders to sync` : 'Syncing...'}
          >
            {isSyncing ? (
              <FiRefreshCw className="spinning" size={12} />
            ) : (
              <FiDownloadCloud size={12} />
            )}
            <span>
              {isSyncing ? 'Syncing...' : `${pendingSyncCount} Pending`}
            </span>
          </button>
        )}
        
        {/* Offline Indicator - When offline with pending items */}
        {!isOnline && pendingSyncCount > 0 && !isSyncing && (
          <div className="offline-badge">
            <FiWifiOff size={10} />
            <span>Offline</span>
          </div>
        )}
        
        {/* User Menu */}
        <div className="user-menu" onClick={onLogout}>
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.username || 'Guest'}</span>
            <span className="user-role">{user?.role || 'Cashier'}</span>
          </div>
          <FiLogOut size={18} />
        </div>
      </div>
    </div>
  );
};

export default TopBar;