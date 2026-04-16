import React from 'react';
import { FiShoppingCart, FiMonitor, FiClipboard, FiBarChart2, FiSettings, FiUsers, FiX } from 'react-icons/fi';

const Sidebar = ({ isOpen, toggleSidebar, activeTab, setActiveTab, availableTabs, isMobile }) => {
  const tabIcons = {
    pos: FiShoppingCart,
    kitchen: FiMonitor,
    orders: FiClipboard,
    reports: FiBarChart2,
    users: FiUsers,
    settings: FiSettings
  };

  const sidebarClasses = `sidebar ${!isOpen ? 'collapsed' : ''} ${isMobile ? (isOpen ? 'mobile-open' : '') : ''}`;

  return (
    <>
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      <div className={sidebarClasses}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🍽️</span>
            {isOpen && <span>POS System</span>}
          </div>
          {isMobile && (
            <button className="close-sidebar" onClick={toggleSidebar}>
              <FiX />
            </button>
          )}
        </div>
        
        <div className="sidebar-nav">
          {availableTabs.map(tab => {
            const Icon = tabIcons[tab.id];
            return (
              <div
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isMobile) toggleSidebar();
                }}
              >
                {Icon && <Icon className="nav-icon" />}
                {isOpen && <span className="nav-label">{tab.label}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Sidebar;