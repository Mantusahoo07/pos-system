import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ size = 'medium', message = 'Loading...' }) {
  const sizes = {
    small: '20px',
    medium: '40px',
    large: '60px'
  };

  return (
    <div className="loading-container">
      <div 
        className="loading-spinner" 
        style={{ 
          width: sizes[size], 
          height: sizes[size],
          borderWidth: size === 'small' ? '2px' : '4px'
        }}
      />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;