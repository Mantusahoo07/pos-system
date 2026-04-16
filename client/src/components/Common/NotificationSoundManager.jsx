// src/components/Common/NotificationSoundManager.jsx
import React, { useEffect, useRef } from 'react';

const NotificationSoundManager = () => {
  const audioElements = useRef({});

  const sounds = {
    'new-order': '/sounds/new-order.mp3',
    'new-dine-in': '/sounds/new-dine-in.mp3',
    'new-delivery': '/sounds/new-delivery.mp3',
    'new-zomato': '/sounds/new-zomato.mp3',
    'new-swiggy': '/sounds/new-swiggy.mp3',
    'new-takeaway': '/sounds/new-takeaway.mp3',
    'order-ready': '/sounds/order-ready.mp3',
    'cancellation-request': '/sounds/cancellation-request.mp3',
    'instant-order': '/sounds/instant-order.mp3',
    'payment-received': '/sounds/payment-received.mp3'
  };

  useEffect(() => {
    // Preload all sounds
    Object.entries(sounds).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioElements.current[key] = audio;
    });

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PLAY_SOUND') {
          playSound(event.data.sound.replace('/sounds/', '').replace('.mp3', ''));
        }
      });
    }

    // Listen for custom events
    window.addEventListener('play-notification-sound', (event) => {
      if (event.detail && event.detail.sound) {
        playSound(event.detail.sound);
      }
    });

    return () => {
      Object.values(audioElements.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  const playSound = (soundName) => {
    const audio = audioElements.current[soundName];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  // This component doesn't render anything
  return null;
};

export default NotificationSoundManager;