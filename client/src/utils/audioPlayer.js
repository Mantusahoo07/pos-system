// src/utils/audioPlayer.js

class AudioPlayer {
  constructor() {
    this.audioElements = {};
    this.soundsLoaded = false;
    this.audioContext = null;
    this.gainNode = null;
    this.isAudioContextInitialized = false;
  }

  // Initialize audio context for better control
  initAudioContext() {
    if (this.isAudioContextInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.8;
      this.isAudioContextInitialized = true;
      console.log('✅ Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  // Preload all sounds
  async preloadSounds() {
    const sounds = {
      'new-dine-in': '/sounds/new-dine-in.mp3',
      'new-takeaway': '/sounds/new-takeaway.mp3',
      'new-zomato': '/sounds/new-zomato.mp3',
      'new-swiggy': '/sounds/new-swiggy.mp3',
      'new-delivery': '/sounds/new-delivery.mp3',
      'order-modified': '/sounds/order-modified.mp3',
      'order-cancelled': '/sounds/order-cancelled.mp3',
      'order-ready': '/sounds/order-ready.mp3',
      'cancellation-request': '/sounds/cancellation-request.mp3',
      'instant-order': '/sounds/instant-order.mp3',
      'payment-received': '/sounds/payment-received.mp3'
    };

    const loadPromises = Object.entries(sounds).map(async ([name, url]) => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;
        
        // Wait for audio to be loadable
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
          audio.load();
        });
        
        this.audioElements[name] = audio;
        console.log(`✅ Loaded sound: ${name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load sound: ${name}`, error);
        // Create fallback using Web Audio API
        this.createFallbackSound(name);
      }
    });

    await Promise.allSettled(loadPromises);
    this.soundsLoaded = true;
    console.log('🎵 All sounds preloaded');
  }

  // Create fallback sound using Web Audio API (beep)
  createFallbackSound(name) {
    this.audioElements[name] = {
      play: () => this.playBeep()
    };
  }

  // Play beep as fallback
  playBeep(frequency = 880, duration = 300) {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    if (!this.audioContext) return;
    
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), duration);
      setTimeout(() => gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.5), duration - 50);
    } catch (error) {
      console.error('Beep failed:', error);
    }
  }

  // Play sound by name
  async play(soundName, options = {}) {
    if (!this.soundsLoaded) {
      await this.preloadSounds();
    }
    
    const volume = options.volume !== undefined ? options.volume : 0.8;
    const loop = options.loop || false;
    
    const audio = this.audioElements[soundName];
    
    if (audio && audio.play) {
      try {
        // Clone the audio to allow overlapping sounds
        const audioClone = audio.cloneNode();
        audioClone.volume = Math.min(1, Math.max(0, volume));
        audioClone.loop = loop;
        
        // Resume audio context if suspended (browser policy)
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        const playPromise = audioClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn(`Audio play failed for ${soundName}:`, error);
            this.playBeep();
          });
        }
        return audioClone;
      } catch (error) {
        console.warn(`Error playing ${soundName}:`, error);
        this.playBeep();
      }
    } else {
      console.warn(`Sound not found: ${soundName}`);
      this.playBeep();
    }
    return null;
  }

  // Stop all sounds
  stopAll() {
    Object.values(this.audioElements).forEach(audio => {
      if (audio && audio.pause) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }

  // Stop specific sound
  stop(soundName) {
    const audio = this.audioElements[soundName];
    if (audio && audio.pause) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  // Set global volume
  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.min(1, Math.max(0, volume));
    }
    
    Object.values(this.audioElements).forEach(audio => {
      if (audio && audio.volume !== undefined) {
        audio.volume = volume;
      }
    });
  }
}

// Create singleton instance
const audioPlayer = new AudioPlayer();

// Initialize on user interaction (required by browsers)
const initAudioOnUserInteraction = () => {
  const init = () => {
    audioPlayer.initAudioContext();
    window.removeEventListener('click', init);
    window.removeEventListener('touchstart', init);
    window.removeEventListener('keydown', init);
  };
  
  window.addEventListener('click', init);
  window.addEventListener('touchstart', init);
  window.addEventListener('keydown', init);
};

initAudioOnUserInteraction();

export default audioPlayer;