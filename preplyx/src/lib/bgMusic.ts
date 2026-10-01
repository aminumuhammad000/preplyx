// Web Audio API Ambient Focus Music Synthesizer for CBT Practice Exam Runner

export interface MusicTrack {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const FOCUS_MUSIC_TRACKS: MusicTrack[] = [
  { id: 'alpha', name: '432Hz Alpha Waves', icon: '🎧', description: 'Deep concentration & memory retention binaural drone' },
  { id: 'lofi', name: 'Lo-Fi Chill Chords', icon: '☕', description: 'Warm lo-fi ambient chord progression for calm study' },
  { id: 'rain', name: 'Rain & Ambient Stream', icon: '🌧️', description: 'Soothing rain white noise with warm synth pad' },
  { id: 'zen', name: 'Zen Meditation Bell', icon: '🧘', description: 'Resonant harmonic frequencies for stress-free exam focus' }
];

let audioCtx: AudioContext | null = null;
let isPlaying = false;
let currentTrackId = 'alpha';
let masterVolume = 0.35; // Default 35% volume

// Web Audio Nodes
let gainNode: GainNode | null = null;
let activeNodes: any[] = [];
let loopInterval: any = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

type MusicChangeListener = (trackId: string | null, isPlaying: boolean) => void;
const listeners = new Set<MusicChangeListener>();

export function subscribeMusicChange(listener: MusicChangeListener): () => void {
  listeners.add(listener);
  listener(isPlaying ? currentTrackId : null, isPlaying);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach(l => l(isPlaying ? currentTrackId : null, isPlaying));
}

export function startFocusMusic(trackId: string = 'alpha', volume: number = 0.35): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  stopFocusMusic();

  currentTrackId = trackId;
  masterVolume = Math.max(0, Math.min(1, volume));

  gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(masterVolume, ctx.currentTime);
  gainNode.connect(ctx.destination);

  isPlaying = true;
  notifyListeners();

  if (trackId === 'alpha') {
    playAlphaWaves(ctx, gainNode);
  } else if (trackId === 'lofi') {
    playLofiChords(ctx, gainNode);
  } else if (trackId === 'rain') {
    playRainStream(ctx, gainNode);
  } else if (trackId === 'zen') {
    playZenDrone(ctx, gainNode);
  }
}

export function stopFocusMusic(): void {
  isPlaying = false;
  notifyListeners();
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  activeNodes.forEach(node => {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch (e) {}
  });
  activeNodes = [];
  gainNode = null;
}

export function setFocusMusicVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol));
  if (gainNode && audioCtx) {
    gainNode.gain.setTargetAtTime(masterVolume, audioCtx.currentTime, 0.1);
  }
}

export function isFocusMusicPlaying(): boolean {
  return isPlaying;
}

export function getCurrentTrackId(): string {
  return currentTrackId;
}

// 1. 432Hz Binaural Alpha Waves
function playAlphaWaves(ctx: AudioContext, master: GainNode) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, ctx.currentTime);

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(216, ctx.currentTime); // 432 / 2

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(226, ctx.currentTime); // 10Hz Alpha Difference

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.2, ctx.currentTime);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(subGain);
  subGain.connect(master);

  osc1.start();
  osc2.start();

  activeNodes.push(osc1, osc2, subGain, filter);
}

// 2. Lo-Fi Warm Chord Progression
function playLofiChords(ctx: AudioContext, master: GainNode) {
  const chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [196.00, 246.94, 293.66, 349.23]  // G7
  ];

  let chordIdx = 0;

  const playChord = () => {
    if (!isPlaying) return;
    const currentChord = chords[chordIdx % chords.length];
    chordIdx++;

    currentChord.forEach(freq => {
      const osc = ctx.createOscillator();
      const chordGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const now = ctx.currentTime;
      chordGain.gain.setValueAtTime(0.001, now);
      chordGain.gain.linearRampToValueAtTime(0.08, now + 1.2);
      chordGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

      osc.connect(filter);
      filter.connect(chordGain);
      chordGain.connect(master);

      osc.start(now);
      osc.stop(now + 4.0);

      activeNodes.push(osc, chordGain, filter);
    });
  };

  playChord();
  loopInterval = setInterval(playChord, 4000);
}

// 3. Soothing Rain & Ambient Stream
function playRainStream(ctx: AudioContext, master: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.Q.setValueAtTime(0.8, ctx.currentTime);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.12, ctx.currentTime);

  noise.connect(filter);
  filter.connect(rainGain);
  rainGain.connect(master);

  noise.start();
  activeNodes.push(noise, filter, rainGain);
}

// 4. Zen Meditation Bell & Drone
function playZenDrone(ctx: AudioContext, master: GainNode) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const zenGain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(136.1, ctx.currentTime); // Om frequency 136.1Hz

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(272.2, ctx.currentTime);

  zenGain.gain.setValueAtTime(0.15, ctx.currentTime);

  osc1.connect(zenGain);
  osc2.connect(zenGain);
  zenGain.connect(master);

  osc1.start();
  osc2.start();

  activeNodes.push(osc1, osc2, zenGain);
}
