import React, { useState, useEffect } from 'react';

function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Loading POS System...');
  const [pulse, setPulse] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const messages = [
    'Initializing System...',
    'Loading Menu Items...',
    'Connecting to Kitchen...',
    'Syncing with Server...',
    'Preparing Workspace...',
    'Almost Ready...',
    'Welcome!'
  ];

  useEffect(() => {
    // Pulse animation every 1.5 seconds
    const pulseInterval = setInterval(() => {
      setPulse(prev => !prev);
    }, 1500);

    // Logo breathing animation
    const logoInterval = setInterval(() => {
      setLogoScale(prev => prev === 1 ? 1.05 : 1);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 12 + 3;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          clearInterval(pulseInterval);
          clearInterval(logoInterval);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 800);
          return 100;
        }
        
        // Update message based on progress
        const messageIndex = Math.floor(newProgress / 14.28);
        if (messageIndex < messages.length) {
          setMessage(messages[messageIndex]);
        }
        
        return newProgress;
      });
    }, 250);

    return () => {
      clearInterval(progressInterval);
      clearInterval(pulseInterval);
      clearInterval(logoInterval);
    };
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeOut 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      animationDelay: '2.5s'
    }}>
      {/* Animated Background Particles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              background: `rgba(87, 60, 250, ${Math.random() * 0.5 + 0.2})`,
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 5 + 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Glowing Orb Effect */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(87, 60, 250, 0.15) 0%, rgba(87, 60, 250, 0) 70%)',
        borderRadius: '50%',
        animation: 'pulseGlow 3s ease-in-out infinite'
      }} />

      <div style={{ 
        textAlign: 'center', 
        animation: 'slideUpFade 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo Container with Ripple Effect - Circle with Black Background */}
        <div style={{
          position: 'relative',
          width: '140px',
          height: '140px',
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Ripple Rings */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(87, 60, 250, 0.3)',
            animation: 'ripple 2s ease-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(87, 60, 250, 0.2)',
            animation: 'ripple 2s ease-out infinite 0.5s'
          }} />
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(87, 60, 250, 0.1)',
            animation: 'ripple 2s ease-out infinite 1s'
          }} />
          
          {/* Logo Container - Circle with Black Background */}
          <div style={{
            width: '120px',
            height: '120px',
            background: '#000000',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            transform: `scale(${logoScale})`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'rotateIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '2px solid rgba(87, 60, 250, 0.3)'
          }}>
            <img 
              src="/logo.png" 
              alt="POS Logo"
              style={{
                width: '70%',
                height: '70%',
                objectFit: 'contain',
                opacity: logoLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
              onLoad={() => setLogoLoaded(true)}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span style="font-size: 60px;">🍽️</span>';
                setLogoLoaded(true);
              }}
            />
          </div>
        </div>
        
        {/* App Name with Gradient */}
        <h1 style={{ 
          background: 'linear-gradient(135deg, #FFFFFF 0%, #A0A0B8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '28px', 
          marginBottom: '8px',
          fontWeight: '700',
          letterSpacing: '2px',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          POS System
        </h1>
        
        {/* Tagline */}
        <p style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '11px', 
          marginBottom: '35px',
          letterSpacing: '1px',
          animation: 'fadeIn 0.8s ease-out 0.2s both'
        }}>
          Complete Point of Sale Solution
        </p>
        
        {/* Progress Bar Container */}
        <div style={{
          width: '280px',
          margin: '0 auto',
          animation: 'fadeInUp 0.6s ease-out 0.3s both'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.5)'
          }}>
            <span>Loading</span>
            <span style={{ 
              color: '#573CFA',
              fontWeight: 'bold',
              animation: pulse ? 'pulse 0.5s ease-in-out' : 'none'
            }}>
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* Animated Progress Bar */}
          <div style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #573CFA, #8B5CF6, #573CFA)',
              borderRadius: '4px',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Shimmer Effect */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 1.5s infinite'
              }} />
            </div>
          </div>
          
          {/* Animated Loading Message */}
          <div style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: '#573CFA',
              borderRadius: '50%',
              animation: 'bounce 1.4s ease-in-out infinite'
            }} />
            <div style={{
              width: '6px',
              height: '6px',
              background: '#8B5CF6',
              borderRadius: '50%',
              animation: 'bounce 1.4s ease-in-out infinite 0.2s'
            }} />
            <div style={{
              width: '6px',
              height: '6px',
              background: '#A78BFA',
              borderRadius: '50%',
              animation: 'bounce 1.4s ease-in-out infinite 0.4s'
            }} />
            <span style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '10px',
              marginLeft: '4px'
            }}>
              {message}
            </span>
          </div>
        </div>
        
        {/* Version Text */}
        <p style={{ 
          color: 'rgba(255,255,255,0.2)', 
          fontSize: '8px', 
          marginTop: '30px',
          animation: 'fadeIn 1s ease-out 0.5s both'
        }}>
          Version 2.0.0
        </p>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes rotateIn {
          from {
            opacity: 0;
            transform: rotate(-180deg) scale(0.5);
          }
          to {
            opacity: 1;
            transform: rotate(0) scale(1);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            visibility: visible;
          }
          to {
            opacity: 0;
            visibility: hidden;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;