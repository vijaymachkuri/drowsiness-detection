class AudioService {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Must be called on user interaction (Click)
  public async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playAlarm() {
    if (!this.audioContext) return;
    this.resume();

    if (this.oscillator) return; // Already playing

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
    
    // Siren modulation
    this.oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.5);
    this.oscillator.frequency.linearRampToValueAtTime(440, this.audioContext.currentTime + 1.0);
    
    this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    this.oscillator.start();
    
    // LFO for Siren Pulse
    const lfo = this.audioContext.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 4; // Faster pulse
    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = 200;
    
    lfo.connect(lfoGain);
    lfoGain.connect(this.oscillator.frequency);
    lfo.start();
  }

  public stopAlarm() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch(e) {}
      this.oscillator = null;
    }
    if (this.gainNode) {
       this.gainNode.disconnect();
       this.gainNode = null;
    }
  }

  public playPing() {
    if (!this.audioContext) return;
    this.resume();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }
}

export const audioService = new AudioService();