let sharedAudioCtx: AudioContext | null = null;
let cachedNoiseBuffer: AudioBuffer | null = null;

export const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!sharedAudioCtx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
            sharedAudioCtx = new AudioCtx();
        }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
};

const getNoiseBuffer = (ctx: AudioContext) => {
    if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
        return cachedNoiseBuffer;
    }
    const bufferSize = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    cachedNoiseBuffer = buffer;
    return buffer;
};

export const playTurnSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {}
};

export const playWinSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.4);
            osc.start(ctx.currentTime + i * 0.1);
            osc.stop(ctx.currentTime + i * 0.1 + 0.5);
        });
    } catch {}
};

export const playExplosionSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.5);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 1.5);
    } catch {}
};

export const playGunshotSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.3);
    } catch {}
};

export const playMagicSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    } catch {}
};

export const playHeartbeatSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const playBeat = (startTime: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(50, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.7, startTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        };
        playBeat(ctx.currentTime);
        playBeat(ctx.currentTime + 0.3);
    } catch {}
};

export const playGlitchSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {}
};

export const playSilenceSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.5);
    } catch {}
};

export const playReloadSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const playClick = (startTime: number, freq: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        };
        playClick(ctx.currentTime, 800);
        playClick(ctx.currentTime + 0.15, 600);
    } catch {}
};

export const playSparkleSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(2000, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch {}
};
