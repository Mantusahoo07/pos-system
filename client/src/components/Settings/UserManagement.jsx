// src/components/Settings/UserManagement.jsx

import React, { useState, useEffect } from 'react';
import { 
  FiUserPlus, FiEdit2, FiTrash2, FiSave, FiX, FiUser, FiMail, FiLock, FiShield, 
  FiCheckCircle, FiAlertCircle, FiRefreshCw, FiSearch, FiChevronLeft, FiChevronRight,
  FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Theme Colors
const COLORS = {
  primary: '#573CFA',
  primaryLight: '#7B64FB',
  primaryDark: '#3D26D6',
  secondary: '#FB8D1A',
  success: '#02864A',
  danger: '#E8083E',
  neutral: '#1C1A27',
  neutralLight: '#2D2A3F',
  neutralDark: '#12111A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  border: '#2D2A3F',
  bgCard: '#1E1C2D',
  bgHover: '#2D2A3F'
};

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'cashier',
    active: true
  });

  // Role options
  const roles = [
    { value: 'admin', label: 'Admin', description: 'Full access to everything', color: '#e74c3c' },
    { value: 'manager', label: 'Manager', description: 'Can manage menu, orders, and view reports', color: '#f39c12' },
    { value: 'cashier', label: 'Cashier', description: 'Can process orders and payments', color: '#2ecc71' },
    { value: 'pos', label: 'POS Operator', description: 'Can only use POS terminal', color: '#3498db' },
    { value: 'kitchen', label: 'Kitchen Staff', description: 'Can only view kitchen display', color: '#9b59b6' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      console.log('Token present:', !!token);
      console.log('Fetching users from:', `${API_URL}/auth/users`);
      
      const response = await fetch(`${API_URL}/auth/users`, {
        headers: getAuthHeaders()
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users received:', data);
        setUsers(Array.isArray(data) ? data : []);
        if (data.length === 0) {
          toast('No users found. Create your first user!', { icon: 'ℹ️' });
        }
      } else if (response.status === 401) {
        const errorText = await response.text();
        console.error('Auth error:', errorText);
        setError('Authentication failed. Please login again.');
        toast.error('Session expired. Please login again.');
      } else if (response.status === 403) {
        setError('You do not have permission to view users. Admin access required.');
        toast.error('Admin access required to manage users');
      } else {
        const error = await response.json();
        console.error('API error:', error);
        setError(error.error || 'Failed to load users');
        toast.error(error.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Network error. Please check your connection.');
      toast.error('Failed to load users. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.password) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role
        })
      });
      
      if (response.ok) {
        toast.success(`User ${formData.username} created successfully`);
        setShowAddModal(false);
        setFormData({ username: '', email: '', password: '', role: 'cashier', active: true });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          role: editingUser.role,
          active: editingUser.active
        })
      });
      
      if (response.ok) {
        toast.success(`User ${editingUser.username} updated successfully`);
        setEditingUser(null);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.username === currentUser?.username) {
      toast.error('You cannot delete your own account');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/users/${user._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.ok) {
        toast.success(`User ${user.username} deleted successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj?.color || COLORS.textMuted;
  };

  const getRoleBgColor = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj?.color ? `${roleObj.color}20` : `${COLORS.textMuted}20`;
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading && users.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        background: COLORS.bgCard,
        borderRadius: '8px',
        border: `1px solid ${COLORS.border}`
      }}>
        <div className="loading-spinner" style={{ 
          width: '30px', 
          height: '30px', 
          border: `2px solid ${COLORS.border}`,
          borderTopColor: COLORS.primary,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ marginLeft: '12px', color: COLORS.textSecondary }}>Loading users...</span>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div style={{ 
        background: COLORS.bgCard, 
        borderRadius: '8px', 
        border: `1px solid ${COLORS.border}`,
        padding: '40px',
        textAlign: 'center'
      }}>
        <FiAlertTriangle size={48} color={COLORS.danger} style={{ marginBottom: '16px' }} />
        <h4 style={{ color: COLORS.textPrimary, marginBottom: '8px' }}>Unable to Load Users</h4>
        <p style={{ color: COLORS.textSecondary, fontSize: '12px', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={fetchUsers}
          style={{
            padding: '8px 20px',
            background: COLORS.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FiRefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bgCard, borderRadius: '8px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px',
        borderBottom: `1px solid ${COLORS.border}`,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: COLORS.textPrimary }}>User Management</h3>
          <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '4px' }}>
            {users.length} user(s) in the system
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontSize: '12px' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 10px 6px 32px',
                background: COLORS.neutralLight,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                fontSize: '11px',
                color: COLORS.textPrimary,
                width: '180px'
              }}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '500'
            }}
          >
            <FiUserPlus size={14} /> Add User
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: COLORS.neutralLight,
              color: COLORS.textSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            <FiRefreshCw size={12} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Grid */}
      {paginatedUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.textSecondary, fontSize: '11px' }}>
          {searchTerm ? 'No matching users found.' : 'No users found. Click "Add User" to create one.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', padding: '16px' }}>
          {paginatedUsers.map(user => {
            const roleColor = getRoleColor(user.role);
            const roleBgColor = getRoleBgColor(user.role);
            
            return (
              <div
                key={user._id}
                style={{
                  background: COLORS.neutralLight,
                  borderRadius: '10px',
                  padding: '16px',
                  border: `1px solid ${COLORS.border}`,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: roleBgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: roleColor,
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}>
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: COLORS.textPrimary }}>{user.username}</strong>
                      <span style={{
                        background: roleBgColor,
                        color: roleColor,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '9px',
                        fontWeight: '600'
                      }}>
                        {user.role?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      {!user.active && (
                        <span style={{
                          background: `${COLORS.danger}20`,
                          color: COLORS.danger,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '8px'
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiMail size={10} />
                      {user.email || 'No email'}
                    </div>
                    {user.lastLogin && (
                      <div style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '4px' }}>
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ 
                  marginTop: '12px', 
                  paddingTop: '12px', 
                  borderTop: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => setEditingUser(user)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px',
                      background: COLORS.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}
                  >
                    <FiEdit2 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.username === currentUser?.username}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px',
                      background: user.username === currentUser?.username ? COLORS.textMuted : COLORS.danger,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: user.username === currentUser?.username ? 'not-allowed' : 'pointer',
                      fontSize: '10px',
                      fontWeight: '500',
                      opacity: user.username === currentUser?.username ? 0.6 : 1
                    }}
                  >
                    <FiTrash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px', 
          padding: '12px', 
          borderTop: `1px solid ${COLORS.border}`,
          background: COLORS.neutralDark
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '4px 10px',
              background: COLORS.neutralLight,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1,
              color: COLORS.textPrimary,
              fontSize: '10px'
            }}
          >
            Previous
          </button>
          <span style={{ padding: '4px 10px', fontSize: '10px', color: COLORS.textSecondary }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '4px 10px',
              background: COLORS.neutralLight,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1,
              color: COLORS.textPrimary,
              fontSize: '10px'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <>
          <div
            onClick={() => setShowAddModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
              zIndex: 2000
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '450px',
            maxHeight: '85vh',
            background: COLORS.bgCard,
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${COLORS.border}`
          }}>
            <div style={{
              padding: '16px',
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.primary,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUserPlus size={16} /> Add New User
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <FiX size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  <FiUser size={12} style={{ marginRight: '4px' }} /> Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: COLORS.neutralLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: COLORS.textPrimary
                  }}
                  placeholder="Enter username"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  <FiMail size={12} style={{ marginRight: '4px' }} /> Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: COLORS.neutralLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: COLORS.textPrimary
                  }}
                  placeholder="Enter email"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  <FiLock size={12} style={{ marginRight: '4px' }} /> Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: COLORS.neutralLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: COLORS.textPrimary
                  }}
                  placeholder="Enter password (min 6 characters)"
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  <FiShield size={12} style={{ marginRight: '4px' }} /> Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: COLORS.neutralLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: COLORS.textPrimary
                  }}
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: COLORS.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {loading ? <FiRefreshCw className="spinning" size={14} /> : <FiSave size={14} />}
                  {loading ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: COLORS.neutralLight,
                    color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <>
          <div
            onClick={() => setEditingUser(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
              zIndex: 2000
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '400px',
            background: COLORS.bgCard,
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            border: `1px solid ${COLORS.border}`
          }}>
            <div style={{
              padding: '16px',
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.secondary,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiEdit2 size={16} /> Edit User: {editingUser.username}
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <FiX size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  Username
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: COLORS.neutralDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: COLORS.textMuted
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: COLORS.neutralDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: COLORS.textMuted
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: COLORS.neutralLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: COLORS.textPrimary
                  }}
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '6px', color: COLORS.textPrimary }}>
                  Status
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: COLORS.textPrimary }}>
                    <input
                      type="radio"
                      checked={editingUser.active === true}
                      onChange={() => setEditingUser({ ...editingUser, active: true })}
                    /> Active
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: COLORS.textPrimary }}>
                    <input
                      type="radio"
                      checked={editingUser.active === false}
                      onChange={() => setEditingUser({ ...editingUser, active: false })}
                    /> Inactive
                  </label>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: COLORS.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {loading ? <FiRefreshCw className="spinning" size={14} /> : <FiSave size={14} />}
                  {loading ? 'Updating...' : 'Update User'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: COLORS.neutralLight,
                    color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default UserManagement;