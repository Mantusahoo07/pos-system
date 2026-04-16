import React, { useEffect, useRef } from 'react';

const AudioManager = () => {
  const audioElements = useRef({});
  const soundsLoaded = useRef(false);
  const audioContextRef = useRef(null);

  const sounds = {
    'new-order': '/sounds/new-order.mp3',
    'new-dine-in': '/sounds/new-dine-in.mp3',
    'new-delivery': '/sounds/new-delivery.mp3',
    'new-zomato': '/sounds/new-zomato.mp3',
    'new-swiggy': '/sounds/new-swiggy.mp3',
    'new-takeaway': '/sounds/new-takeaway.mp3',
    'order-ready': '/sounds/order-ready.mp3',
    'order-modified': '/sounds/order-modified.mp3',
    'order-cancelled': '/sounds/order-cancelled.mp3',
    'cancellation-request': '/sounds/cancellation-request.mp3',
    'instant-order': '/sounds/instant-order.mp3',
    'payment-received': '/sounds/payment-received.mp3'
  };

  // Initialize Audio Context for Firefox fallback
  const initAudioContext = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch (error) {
      console.log('AudioContext not supported');
    }
  };

  // Play beep as fallback for Firefox when audio files fail
  const playBeep = (frequency = 880, duration = 300) => {
    try {
      initAudioContext();
      if (!audioContextRef.current) return;
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), duration);
      setTimeout(() => {
        if (gainNode.gain) {
          gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContextRef.current.currentTime + 0.5);
        }
      }, duration - 50);
    } catch (error) {
      console.log('Beep failed:', error);
    }
  };

  // Play sound from URL
  const playSoundFromUrl = (soundUrl, options = {}) => {
    try {
      // Extract sound name from URL
      let soundName = soundUrl.split('/').pop().replace('.mp3', '');
      
      // Check if we have this sound preloaded
      let audio = audioElements.current[soundName];
      
      if (!audio) {
        // Try to load it on the fly
        audio = new Audio(soundUrl);
        audio.preload = 'auto';
        audioElements.current[soundName] = audio;
      }
      
      const volume = options.volume !== undefined ? options.volume : 0.7;
      audio.volume = volume;
      audio.currentTime = 0;
      
      // Resume AudioContext if needed (for Firefox)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Audio play failed:', error);
          // Fallback to beep for Firefox
          playBeep();
        });
      }
      return audio;
    } catch (error) {
      console.log('Error playing sound:', error);
      playBeep();
      return null;
    }
  };

  // Preload all sounds
  const preloadSounds = () => {
    if (soundsLoaded.current) return;
    
    Object.entries(sounds).forEach(([name, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioElements.current[name] = audio;
    });
    
    soundsLoaded.current = true;
    console.log('🎵 Sounds preloaded');
  };

  useEffect(() => {
    // Preload sounds on mount
    preloadSounds();
    
    // Initialize AudioContext on user interaction (required for Firefox)
    const initAudioOnInteraction = () => {
      initAudioContext();
      window.removeEventListener('click', initAudioOnInteraction);
      window.removeEventListener('touchstart', initAudioOnInteraction);
    };
    
    window.addEventListener('click', initAudioOnInteraction);
    window.addEventListener('touchstart', initAudioOnInteraction);
    
    // Listen for messages from Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PLAY_SOUND') {
          console.log('🔊 Service Worker requested sound:', event.data.sound);
          playSoundFromUrl(event.data.sound);
        }
      });
    }
    
    // Listen for custom events from the app
    window.addEventListener('play-notification-sound', (event) => {
      if (event.detail && event.detail.sound) {
        playSoundFromUrl(event.detail.sound, event.detail.options);
      }
    });
    
    // Also listen for the global audioManager.play calls
    window.audioManagerPlay = (soundName, options) => {
      const soundUrl = `/sounds/${soundName}.mp3`;
      playSoundFromUrl(soundUrl, options);
    };
    
    return () => {
      window.removeEventListener('click', initAudioOnInteraction);
      window.removeEventListener('touchstart', initAudioOnInteraction);
      // Stop all sounds on unmount
      Object.values(audioElements.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default AudioManager;