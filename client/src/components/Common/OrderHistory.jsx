import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';

function OrderHistory({ orders }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = orders.filter(order => {
    if (filter !== 'all' && order.status !== filter) return false;
    if (searchTerm && !order.orderNumber.toString().includes(searchTerm)) return false;
    return true;
  });

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + (o.total || 0), 0) / orders.length : 0
  };

  return (
    <div className="order-history">
      <div className="history-header">
        <h2>Order History</h2>
        <div className="history-stats">
          <div className="stat">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{stats.completed}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Revenue</span>
            <span className="stat-value">{formatCurrency(stats.revenue)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Avg Order</span>
            <span className="stat-value">{formatCurrency(stats.avgOrderValue)}</span>
          </div>
        </div>
      </div>
      
      <div className="history-filters">
        <input 
          type="text"
          placeholder="Search by order number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed</button>
          <button className={filter === 'cancelled' ? 'active' : ''} onClick={() => setFilter('cancelled')}>Cancelled</button>
        </div>
      </div>
      
      <div className="history-list">
        {filteredOrders.map(order => (
          <div key={order.id} className="history-item" onClick={() => setSelectedOrder(order)}>
            <div className="history-item-header">
              <span className="order-number">Order #{order.orderNumber}</span>
              <span className={`order-status ${order.status}`}>{order.status}</span>
            </div>
            <div className="history-item-details">
              <span>{formatDateTime(order.timestamp)}</span>
              <span>{order.items.length} items</span>
              <span className="order-total">{formatCurrency(order.total)}</span>
            </div>
          </div>
        ))}
      </div>
      
      {selectedOrder && (
        <div className="order-detail-modal" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Order Details</h3>
            <div className="order-info">
              <p><strong>Order #:</strong> {selectedOrder.orderNumber}</p>
              <p><strong>Date:</strong> {formatDateTime(selectedOrder.timestamp)}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
            </div>
            <div className="order-items-list">
              <h4>Items</h4>
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="order-detail-item">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="order-total-detail">
              <strong>Total: {formatCurrency(selectedOrder.total)}</strong>
            </div>
            <button onClick={() => setSelectedOrder(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderHistory;