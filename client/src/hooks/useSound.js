import { useCallback, useEffect, useRef } from 'react';

const sounds = {
  'new-order': '/sounds/new-order.mp3',
  'order-accepted': '/sounds/order-accepted.mp3',
  'timer-warning': '/sounds/timer-warning.mp3',
  'timer-expired': '/sounds/timer-expired.mp3',
  'out-of-stock': '/sounds/out-of-stock.mp3',
  'order-placed': '/sounds/new-order.mp3',
  'item-completed': '/sounds/order-accepted.mp3'
};

export const useSound = () => {
  const audioElements = useRef({});

  useEffect(() => {
    // Preload sounds
    Object.entries(sounds).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioElements.current[key] = audio;
    });
  }, []);

  const playSound = useCallback((soundName) => {
    const audio = audioElements.current[soundName];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  }, []);

  const stopSound = useCallback((soundName) => {
    const audio = audioElements.current[soundName];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  return { playSound, stopSound };
};