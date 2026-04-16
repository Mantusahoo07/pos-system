import React, { useState, useEffect } from 'react';
import { FiSearch, FiUserPlus, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

function CustomerSelect({ onSelect, onClose, selectedCustomer: initialCustomer }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer || null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 0
  });

  useEffect(() => {
    if (searchTerm.length > 1) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [searchTerm]);

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/customers?search=${searchTerm}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Please enter customer name and phone number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newCustomer)
      });
      
      if (response.ok) {
        const customer = await response.json();
        toast.success('Customer added successfully');
        setSelectedCustomer(customer);
        setShowAddForm(false);
        setNewCustomer({ name: '', phone: '', email: '', address: '', creditLimit: 0 });
        onSelect(customer);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add customer');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    onSelect(customer);
    onClose();
  };

  return (
    <div style={{ padding: '16px' }}>
      {!showAddForm ? (
        <>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <FiSearch style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }} />
            <input
              type="text"
              placeholder="Search by name, phone or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 35px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              autoFocus
            />
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
              Searching...
            </div>
          )}

          {customers.length > 0 && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {customers.map(customer => (
                <div
                  key={customer._id}
                  onClick={() => handleSelectCustomer(customer)}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    background: selectedCustomer?._id === customer._id ? '#f0fdf4' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = selectedCustomer?._id === customer._id ? '#f0fdf4' : 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{customer.name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{customer.phone}</div>
                      {customer.email && <div style={{ fontSize: '9px', color: '#94a3b8' }}>{customer.email}</div>}
                    </div>
                    {selectedCustomer?._id === customer._id && (
                      <FiCheck size={16} color="#10b981" />
                    )}
                  </div>
                  {customer.outstandingAmount > 0 && (
                    <div style={{ fontSize: '9px', color: '#f59e0b', marginTop: '4px' }}>
                      Outstanding: ₹{customer.outstandingAmount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchTerm.length > 1 && customers.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                No customers found
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  margin: '0 auto'
                }}
              >
                <FiUserPlus size={14} /> Add New Customer
              </button>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleAddCustomer}>
          <h3 style={{ fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiUserPlus size={16} /> Add New Customer
          </h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Name *</label>
            <input
              type="text"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Phone Number *</label>
            <input
              type="tel"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '10px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Address</label>
            <textarea
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              rows="2"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11px',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
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
          </div>
        </form>
      )}
    </div>
  );
}

export default CustomerSelect;