class AudioService {
  constructor() {
    this.sounds = {};
    this.enabled = true;
  }

  async loadSound(name, url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.addEventListener('canplaythrough', () => {
        this.sounds[name] = audio;
        resolve(audio);
      });
      audio.addEventListener('error', reject);
      audio.load();
    });
  }

  play(name, options = {}) {
    if (!this.enabled) return;
    
    const sound = this.sounds[name];
    if (sound) {
      const audio = sound.cloneNode();
      audio.volume = options.volume || 1;
      audio.loop = options.loop || false;
      audio.play().catch(err => console.error('Error playing sound:', err));
    }
  }

  stop(name) {
    const sound = this.sounds[name];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export default new AudioService();