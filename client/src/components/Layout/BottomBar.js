import React from 'react';
import { FiShoppingCart, FiMonitor, FiClipboard, FiBarChart2, FiSettings } from 'react-icons/fi';

const BottomBar = ({ activeTab, setActiveTab, availableTabs }) => {
  const tabIcons = {
    pos: FiShoppingCart,
    kitchen: FiMonitor,
    orders: FiClipboard,
    reports: FiBarChart2,
    settings: FiSettings
  };

  return (
    <div className="bottom-bar">
      {availableTabs.map(tab => {
        const Icon = tabIcons[tab.id];
        return (
          <button
            key={tab.id}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {Icon && <Icon className="bottom-nav-icon" />}
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomBar;