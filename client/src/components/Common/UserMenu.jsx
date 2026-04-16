import React, { useState } from 'react';
import toast from 'react-hot-toast';

function UserMenu({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      
      if (response.ok) {
        toast.success('Password changed successfully');
        setShowChangePassword(false);
        setOldPassword('');
        setNewPassword('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  return (
    <div className="user-menu">
      <div className="user-info" onClick={() => setShowMenu(!showMenu)}>
        <span className="user-avatar">{user.username[0].toUpperCase()}</span>
        <span className="user-name">{user.username}</span>
        <span className="user-role">{user.role}</span>
      </div>
      
      {showMenu && (
        <div className="user-dropdown">
          <div className="dropdown-item" onClick={() => setShowChangePassword(true)}>
            🔒 Change Password
          </div>
          <div className="dropdown-item" onClick={onLogout}>
            🚪 Logout
          </div>
        </div>
      )}
      
      {showChangePassword && (
        <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <input
                type="password"
                placeholder="Old Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button type="submit">Update Password</button>
              <button type="button" onClick={() => setShowChangePassword(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;