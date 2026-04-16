import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';

function Analytics({ orders, menuItems }) {
  const [timeRange, setTimeRange] = useState('week');
  const [analytics, setAnalytics] = useState({
    revenue: 0,
    topItems: [],
    hourlySales: [],
    dailySales: []
  });

  useEffect(() => {
    calculateAnalytics();
  }, [orders, timeRange]);

  const calculateAnalytics = () => {
    const now = new Date();
    let filteredOrders = [];
    
    switch(timeRange) {
      case 'day':
        filteredOrders = orders.filter(o => new Date(o.timestamp).toDateString() === now.toDateString());
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filteredOrders = orders.filter(o => new Date(o.timestamp) > weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filteredOrders = orders.filter(o => new Date(o.timestamp) > monthAgo);
        break;
      default:
        filteredOrders = orders;
    }
    
    // Calculate revenue
    const revenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Calculate top items
    const itemSales = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
      });
    });
    const topItems = Object.entries(itemSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    
    // Calculate hourly sales
    const hourlySales = Array(24).fill(0);
    filteredOrders.forEach(order => {
      const hour = new Date(order.timestamp).getHours();
      hourlySales[hour] += order.total || 0;
    });
    
    setAnalytics({ revenue, topItems, hourlySales, dailySales: [] });
  };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="time-range-selector">
          <button className={timeRange === 'day' ? 'active' : ''} onClick={() => setTimeRange('day')}>Day</button>
          <button className={timeRange === 'week' ? 'active' : ''} onClick={() => setTimeRange('week')}>Week</button>
          <button className={timeRange === 'month' ? 'active' : ''} onClick={() => setTimeRange('month')}>Month</button>
        </div>
      </div>
      
      <div className="analytics-cards">
        <div className="analytics-card">
          <h3>Total Revenue</h3>
          <div className="revenue-value">{formatCurrency(analytics.revenue)}</div>
        </div>
        
        <div className="analytics-card">
          <h3>Total Orders</h3>
          <div className="orders-value">{orders.filter(o => {
            if (timeRange === 'day') return new Date(o.timestamp).toDateString() === new Date().toDateString();
            if (timeRange === 'week') return new Date(o.timestamp) > new Date(new Date().setDate(new Date().getDate() - 7));
            return true;
          }).length}</div>
        </div>
      </div>
      
      <div className="analytics-section">
        <h3>Top Selling Items</h3>
        <div className="top-items-list">
          {analytics.topItems.map((item, idx) => (
            <div key={idx} className="top-item">
              <span className="rank">#{idx + 1}</span>
              <span className="item-name">{item.name}</span>
              <span className="item-quantity">{item.quantity} sold</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="analytics-section">
        <h3>Hourly Sales Distribution</h3>
        <div className="hourly-chart">
          {analytics.hourlySales.map((sales, hour) => (
            <div key={hour} className="hour-bar">
              <div className="bar-label">{hour}:00</div>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ 
                    width: `${(sales / Math.max(...analytics.hourlySales)) * 100}%`,
                    backgroundColor: sales > 0 ? '#3498db' : '#ecf0f1'
                  }}
                />
              </div>
              <div className="bar-value">{formatCurrency(sales)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Analytics;