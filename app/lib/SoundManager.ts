"use client";

class SoundManager {
  private static instance: SoundManager;
  private context: AudioContext | null = null;
  private swooshBuffer: AudioBuffer | null = null;
  private bounceBuffer: AudioBuffer | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.context = new AudioContextClass();
        this.loadAudioFiles();
        this.setupInteractions();
      }
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }
  
  private setupInteractions() {
    if (typeof window !== "undefined") {
      const initAudio = () => {
        this.init();
        window.removeEventListener("click", initAudio);
        window.removeEventListener("keydown", initAudio);
        window.removeEventListener("touchstart", initAudio);
      };
      window.addEventListener("click", initAudio, { once: true });
      window.addEventListener("keydown", initAudio, { once: true });
      window.addEventListener("touchstart", initAudio, { once: true });
    }
  }

  private async loadAudioFiles() {
    if (!this.context) return;
    try {
      const [swooshRes, bounceRes] = await Promise.all([
        fetch("/sounds/black-hole-impact.mp3"),
        fetch("/sounds/jump-sound.mp3")
      ]);
      
      const swooshArray = await swooshRes.arrayBuffer();
      const bounceArray = await bounceRes.arrayBuffer();
      
      // decodeAudioData doesn't always support Promise API in older Safari, but standard in modern browsers.
      this.context.decodeAudioData(swooshArray, (buffer) => {
        this.swooshBuffer = buffer;
      });
      this.context.decodeAudioData(bounceArray, (buffer) => {
        this.bounceBuffer = buffer;
      });
    } catch (e) {
      console.error("Failed to load audio buffers:", e);
    }
  }

  public init() {
    if (this.context && this.context.state === "suspended") {
      this.context.resume().catch(e => console.warn("Failed to resume audio context:", e));
    }
  }

  public playSplash() {
    // No splash sound provided
  }

  public playSwoosh() {
    if (!this.context || !this.swooshBuffer) return;
    this.init();

    const source = this.context.createBufferSource();
    source.buffer = this.swooshBuffer;
    
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0.5;

    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    source.start(0);
  }

  public playBounce(type: "floor" | "target") {
    if (!this.context || !this.bounceBuffer) return;
    this.init();

    const source = this.context.createBufferSource();
    source.buffer = this.bounceBuffer;
    
    const gainNode = this.context.createGain();
    
    if (type === "floor") {
      source.playbackRate.value = 1.0;
      gainNode.gain.value = 0.3;
    } else {
      source.playbackRate.value = 1.4; // Pitch up slightly for the target land
      gainNode.gain.value = 0.5;
    }

    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    source.start(0);
  }
}

export const soundManager = SoundManager.getInstance();
