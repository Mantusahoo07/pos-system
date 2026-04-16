import React, { useState, useEffect } from 'react';

function RotationWarning() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscape) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#1C1A27',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
      <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Please Rotate Your Device</h2>
      <p style={{ fontSize: '14px', color: '#A0A0B8' }}>
        This application works best in portrait mode.
        Please rotate your device to continue.
      </p>
      <div style={{
        marginTop: '30px',
        animation: 'rotate 1.5s ease-in-out infinite'
      }}>
        🔄
      </div>
      <style>{`
        @keyframes rotate {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}

export default RotationWarning;