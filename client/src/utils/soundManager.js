// src/utils/soundManager.js

class SoundManager {
  constructor() {
    this.audioElements = new Map();
    this.isEnabled = true;
    this.volume = 0.7;
    this.setupServiceWorkerListener();
  }

  setupServiceWorkerListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PLAY_SOUND') {
          this.playSoundFromUrl(event.data.sound);
        }
      });
    }
  }

  playSoundFromUrl(soundUrl, options = {}) {
    if (!this.isEnabled) return;
    
    try {
      let audio = this.audioElements.get(soundUrl);
      if (!audio) {
        audio = new Audio(soundUrl);
        audio.preload = 'auto';
        this.audioElements.set(soundUrl, audio);
      }
      
      audio.volume = options.volume !== undefined ? options.volume : this.volume;
      audio.currentTime = 0;
      audio.play().catch(err => console.log('Sound play failed:', err));
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  playCustomSound(soundName, options = {}) {
    const soundUrl = `/sounds/${soundName}.mp3`;
    this.playSoundFromUrl(soundUrl, options);
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audioElements.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  preloadSounds(soundNames) {
    soundNames.forEach(soundName => {
      const soundUrl = `/sounds/${soundName}.mp3`;
      const audio = new Audio(soundUrl);
      audio.preload = 'auto';
      this.audioElements.set(soundUrl, audio);
    });
  }
}

export default new SoundManager();