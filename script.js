// ==================== КОНФИГУРАЦИЯ ====================

// Мелодия — 4 октавы (сверху вниз: B5 → C2)
const MELODY_NOTES = [
    // Октава 5
    { freq: 987.77, name: 'B5', octave: 5 },
    { freq: 880.00, name: 'A5', octave: 5 },
    { freq: 783.99, name: 'G5', octave: 5 },
    { freq: 698.46, name: 'F5', octave: 5 },
    { freq: 659.25, name: 'E5', octave: 5 },
    { freq: 587.33, name: 'D5', octave: 5 },
    { freq: 523.25, name: 'C5', octave: 5 },
    // Октава 4
    { freq: 493.88, name: 'B4', octave: 4 },
    { freq: 440.00, name: 'A4', octave: 4 },
    { freq: 392.00, name: 'G4', octave: 4 },
    { freq: 349.23, name: 'F4', octave: 4 },
    { freq: 329.63, name: 'E4', octave: 4 },
    { freq: 293.66, name: 'D4', octave: 4 },
    { freq: 261.63, name: 'C4', octave: 4 },
    // Октава 3
    { freq: 246.94, name: 'B3', octave: 3 },
    { freq: 220.00, name: 'A3', octave: 3 },
    { freq: 196.00, name: 'G3', octave: 3 },
    { freq: 174.61, name: 'F3', octave: 3 },
    { freq: 164.81, name: 'E3', octave: 3 },
    { freq: 146.83, name: 'D3', octave: 3 },
    { freq: 130.81, name: 'C3', octave: 3 },
    // Октава 2
    { freq: 123.47, name: 'B2', octave: 2 },
    { freq: 110.00, name: 'A2', octave: 2 },
    { freq: 98.00,  name: 'G2', octave: 2 },
    { freq: 87.31,  name: 'F2', octave: 2 },
    { freq: 82.41,  name: 'E2', octave: 2 },
    { freq: 73.42,  name: 'D2', octave: 2 },
    { freq: 65.41,  name: 'C2', octave: 2 },
];

const ROWS = MELODY_NOTES.length; // 28
const OCTAVE_BREAKS = [7, 14, 21]; // Разделители октав

// Инструменты
const INSTRUMENTS = ['lute', 'viola', 'flute', 'dulcimer'];
// Volume levels for each instrument (0.0 - 1.0)
const instrumentVolumes = {
    lute: 0.4,
    viola: 0.4,
    flute: 0.4,
    dulcimer: 0.4,
};

// Ударные
const DRUMS = [
    { name: 'Hi-Hat', color: '#ff6b6b' },
    { name: 'Snare', color: '#4ecdc4' },
    { name: 'Kick', color: '#45b7d1' },
    { name: 'Clap', color: '#f9ca24' },
    { name: 'Tambourine', color: '#6c5ce7' },
    { name: 'Tom Hi', color: '#e17055' },
    { name: 'Tom Lo', color: '#00b894' },
    { name: 'Shaker', color: '#fdcb6e' },
    { name: 'Cowbell', color: '#e84393' },
    { name: 'Woodblock', color: '#00cec9' },
];

// ==================== СОСТОЯНИЕ ====================

let numCols = 16;
// Отдельная сетка для каждого инструмента
let instrumentGrids = {};
INSTRUMENTS.forEach(inst => {
    instrumentGrids[inst] = createEmptyGrid(ROWS, numCols);
});
let drumGrid = createEmptyGrid(DRUMS.length, numCols);

let activeMainTab = 'melody'; // 'melody' | 'drums'
let activeInstrument = 'lute';
let isPlaying = false;
let currentCol = 0;
let playInterval = null;
let audioContext = null;
let mediaStreamDestination = null; // for exporting audio
let mediaRecorder = null;
let recordedChunks = [];

let cursorMelody = { row: 0, col: 0 };
let cursorDrums = { row: 0, col: 0 };

// DOM-контейнеры для сеток инструментов
let melodyGridElements = {};

// ==================== DOM ====================

const gridContainer = document.getElementById('gridContainer');
const playBtn = document.getElementById('playBtn');
const clearBtn = document.getElementById('clearBtn');
const tempoSlider = document.getElementById('tempo');
const tempoValue = document.getElementById('tempoValue');
const colsInput = document.getElementById('cols');
const mainTabBtns = document.querySelectorAll('.main-tabs .tab-btn');
const instTabBtns = document.querySelectorAll('.instrument-tabs .tab-btn');

// ==================== AUDIO ====================

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Create a MediaStreamDestination once the AudioContext exists
    if (!mediaStreamDestination) {
        mediaStreamDestination = audioContext.createMediaStreamDestination();
        // Connect the destination to the context so that all sounds are routed through it.
        // Individual sources already connect to audioContext.destination; we also connect
        // the destination node to the same output to capture the mixed signal.
        // This does not affect playback because the node simply forwards the audio.
        mediaStreamDestination.connect(audioContext.destination);
    }
}

// ---------- 🪕 ЛЮТНЯ ----------
function playLute(frequency) {
    initAudio();
    const sampleRate = audioContext.sampleRate;
    const bufferSize = Math.round(sampleRate / frequency);
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency * 3;
    filter.Q.value = 1;

    const gain = audioContext.createGain();
    source.connect(filter);
    filter.connect(gain);
    // Connect to both the regular output and the export stream
    gain.connect(audioContext.destination);
    if (mediaStreamDestination) gain.connect(mediaStreamDestination);

    const now = audioContext.currentTime;
    // Apply instrument volume
    const baseVol = 0.4;
    const vol = baseVol * (instrumentVolumes.lute ?? 1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
    filter.frequency.setValueAtTime(frequency * 3, now);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.8, now + 2.0);

    source.start(now);
    source.stop(now + 3.0);
}

// ---------- 🎻 ВИОЛА ----------
function playViola(frequency) {
    initAudio();
    const now = audioContext.currentTime;
    const duration = 1.5;
    const bufferSize = Math.round(audioContext.sampleRate / frequency);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const waveshaper = audioContext.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 3);
    }
    waveshaper.curve = curve;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency * 5;
    filter.Q.value = 2;

    const filter2 = audioContext.createBiquadFilter();
    filter2.type = 'peaking';
    filter2.frequency.value = frequency * 2;
    filter2.gain.value = 3;
    filter2.Q.value = 1;

    // Bow noise
    const bowNoiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.3, audioContext.sampleRate);
    const bowNoiseData = bowNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bowNoiseData.length; i++) bowNoiseData[i] = (Math.random() * 2 - 1) * 0.05;
    const bowNoise = audioContext.createBufferSource();
    bowNoise.buffer = bowNoiseBuffer;
    const bowNoiseFilter = audioContext.createBiquadFilter();
    bowNoiseFilter.type = 'bandpass';
    bowNoiseFilter.frequency.value = 4000;
    bowNoiseFilter.Q.value = 0.5;
    const bowNoiseGain = audioContext.createGain();
    bowNoiseGain.gain.setValueAtTime(0.08, now);
    bowNoiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    bowNoise.connect(bowNoiseFilter);
    bowNoiseFilter.connect(bowNoiseGain);
    bowNoiseGain.connect(audioContext.destination);
    bowNoise.start(now);
    bowNoise.stop(now + 0.3);

    const gainNode = audioContext.createGain();
    const baseVol = 0.35;
    const vol = baseVol * (instrumentVolumes.viola ?? 1);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + 0.08);
    gainNode.gain.setValueAtTime(vol, now + duration * 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(waveshaper);
    waveshaper.connect(filter);
    filter.connect(filter2);
    filter2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    if (mediaStreamDestination) gainNode.connect(mediaStreamDestination);
    noiseSource.start(now);
    noiseSource.stop(now + duration);
}

// ---------- 📯 ФЛЕЙТА ----------
function playFlute(frequency) {
    initAudio();
    const now = audioContext.currentTime;
    const duration = 1.5;

    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;

    const vibrato = audioContext.createOscillator();
    vibrato.frequency.value = 5;
    const vibratoGain = audioContext.createGain();
    vibratoGain.gain.value = frequency * 0.015;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    const airBufferSize = audioContext.sampleRate * 0.5;
    const airBuffer = audioContext.createBuffer(1, airBufferSize, audioContext.sampleRate);
    const airData = airBuffer.getChannelData(0);
    for (let i = 0; i < airData.length; i++) airData[i] = (Math.random() * 2 - 1);
    const airSource = audioContext.createBufferSource();
    airSource.buffer = airBuffer;
    airSource.loop = true;

    const airFilter = audioContext.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = frequency * 2;
    airFilter.Q.value = 5;

    const airGain = audioContext.createGain();
    airGain.gain.setValueAtTime(0.08, now);
    airGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    airSource.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(audioContext.destination);
    if (mediaStreamDestination) airGain.connect(mediaStreamDestination);

    const gainNode = audioContext.createGain();
    const baseVol = 0.35;
    const vol = baseVol * (instrumentVolumes.flute ?? 1);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + 0.08);
    gainNode.gain.setValueAtTime(vol, now + duration * 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const resonance = audioContext.createBiquadFilter();
    resonance.type = 'bandpass';
    resonance.frequency.value = frequency;
    resonance.Q.value = 20;

    const osc2 = audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency * 2;
    const gain2 = audioContext.createGain();
    gain2.gain.value = 0.12;

    const osc3 = audioContext.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = frequency * 3;
    const gain3 = audioContext.createGain();
    gain3.gain.value = 0.05;

    osc.connect(resonance);
    osc2.connect(gain2);
    gain2.connect(resonance);
    osc3.connect(gain3);
    gain3.connect(resonance);
    resonance.connect(gainNode);
    gainNode.connect(audioContext.destination);
    if (mediaStreamDestination) gainNode.connect(mediaStreamDestination);

    osc.start(now);
    osc2.start(now);
    osc3.start(now);
    vibrato.start(now);
    airSource.start(now);

    osc.stop(now + duration);
    osc2.stop(now + duration);
    osc3.stop(now + duration);
    vibrato.stop(now + duration);
    airSource.stop(now + duration);
}

// ---------- 🔨 ЦИМБАЛЫ ----------
function playDulcimer(frequency) {
    initAudio();
    const now = audioContext.currentTime;

    const harmonics = [
        { ratio: 1, gain: 0.4 },
        { ratio: 2, gain: 0.2 },
        { ratio: 3, gain: 0.1 },
        { ratio: 4, gain: 0.05 },
    ];
    harmonics.forEach(h => {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency * h.ratio;
        const g = audioContext.createGain();
        const baseVol = h.gain;
        const vol = baseVol * (instrumentVolumes.dulcimer ?? 1);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.003);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        osc.connect(g);
    g.connect(audioContext.destination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
        if (mediaStreamDestination) g.connect(mediaStreamDestination);
        osc.start(now);
        osc.stop(now + 2.5);
    });

    const hitBuf = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate);
    const hitData = hitBuf.getChannelData(0);
    for (let i = 0; i < hitData.length; i++) hitData[i] = (Math.random() * 2 - 1) * 0.5;
    const hitSrc = audioContext.createBufferSource();
    hitSrc.buffer = hitBuf;
    const hitFilter = audioContext.createBiquadFilter();
    hitFilter.type = 'bandpass';
    hitFilter.frequency.value = frequency * 4;
    hitFilter.Q.value = 2;
    const hitGain = audioContext.createGain();
    hitGain.gain.setValueAtTime(0.15, now);
    hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    hitSrc.connect(hitFilter);
    hitFilter.connect(hitGain);
    hitGain.connect(audioContext.destination);
    if (mediaStreamDestination) hitGain.connect(mediaStreamDestination);
    hitSrc.start(now);
    hitSrc.stop(now + 0.06);
}

// Маршрутизация инструмента
function playMelodyNote(frequency) {
    playMelodyNoteForInstrument(activeInstrument, frequency);
}

function playMelodyNoteForInstrument(inst, frequency) {
    switch (inst) {
        case 'lute':     playLute(frequency); break;
        case 'viola':    playViola(frequency); break;
        case 'flute':    playFlute(frequency); break;
        case 'dulcimer': playDulcimer(frequency); break;
        default:         playLute(frequency);
    }
}

// ---------- УДАРНЫЕ ----------
function playDrumSound(type) {
    initAudio();
    const now = audioContext.currentTime;
    switch(type) {
        case 0: playHiHat(now); break;           // Hi-Hat
        case 1: playMedievalSnare(now); break;   // Snare
        case 2: playFrameDrum(now); break;       // Kick
        case 3: playHandClap(now); break;        // Clap
        case 4: playTambourine(now); break;      // Tambourine
        case 5: playTomHi(now); break;           // Tom Hi
        case 6: playTomLo(now); break;           // Tom Lo
        case 7: playShaker(now); break;          // Shaker
        case 8: playCowbell(now); break;         // Cowbell
        case 9: playWoodblock(now); break;       // Woodblock
    }
}
function playHandClap(time) {
    // Extend each burst slightly to avoid abrupt cut‑off and make the clap sound fuller.
    for (let burst = 0; burst < 3; burst++) {
        const t = time + burst * 0.015; // slightly more spacing
        // Use a longer buffer (30 ms) for a richer noise burst.
        const buf = audioContext.createBuffer(1, audioContext.sampleRate * 0.03, audioContext.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        const src = audioContext.createBufferSource();
        src.buffer = buf;
        const bp = audioContext.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2500;
        bp.Q.value = 1;
        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.25, t);
        // Slightly slower decay for smoother tail.
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        src.connect(bp);
        bp.connect(g);
        g.connect(audioContext.destination);
        if (mediaStreamDestination) bp.connect(mediaStreamDestination);
        if (mediaStreamDestination) g.connect(mediaStreamDestination);
        src.start(t);
        src.stop(t + 0.12);
    }
}
function playMedievalSnare(time) {
    const osc = audioContext.createOscillator();
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.4, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    osc.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc.start(time); osc.stop(time + 0.15);

    const buf = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    const bp = audioContext.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3000;
    const ng = audioContext.createGain();
    ng.gain.setValueAtTime(0.3, time);
    ng.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    src.connect(bp); bp.connect(ng); ng.connect(audioContext.destination);
    if (mediaStreamDestination) bp.connect(mediaStreamDestination);
    if (mediaStreamDestination) ng.connect(mediaStreamDestination);
    src.start(time); src.stop(time + 0.1);
    
}

function playFrameDrum(time) {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.2);
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.6, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    osc.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc.start(time); osc.stop(time + 0.45);
}

// Duplicate simple playHandClap removed; using the extended version defined earlier.

function playTabor(time) {
    const osc = audioContext.createOscillator();
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.15);
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
    osc.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc.start(time); osc.stop(time + 0.3);

    const buf = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    const bp = audioContext.createBiquadFilter();
    bp.type = 'highpass'; bp.frequency.value = 5000;
    const sg = audioContext.createGain();
    sg.gain.setValueAtTime(0.15, time);
    sg.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
    src.connect(bp); bp.connect(sg); sg.connect(audioContext.destination);
    if (mediaStreamDestination) bp.connect(mediaStreamDestination);
    if (mediaStreamDestination) sg.connect(mediaStreamDestination);
    src.start(time); src.stop(time + 0.06);
}

function playTambourine(time) {
    // Metal jingles - high frequency noise bursts
    for (let i = 0; i < 3; i++) {
        const t = time + i * 0.02;
        const buf = audioContext.createBuffer(1, audioContext.sampleRate * 0.04, audioContext.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
        const src = audioContext.createBufferSource();
        src.buffer = buf;
        const bp = audioContext.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 8000; bp.Q.value = 2;
        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        src.connect(bp); bp.connect(g); g.connect(audioContext.destination);
        if (mediaStreamDestination) bp.connect(mediaStreamDestination);
        if (mediaStreamDestination) g.connect(mediaStreamDestination);
        src.start(t); src.stop(t + 0.05);
    }
    // Add a subtle drum hit
    const osc = audioContext.createOscillator();
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.3, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    osc.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc.start(time); osc.stop(time + 0.2);
}

function playTomHi(time) {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.15);
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(g); g.connect(audioContext.destination);    
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc.start(time); osc.stop(time + 0.35);
}

function playTomLo(time) {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.2);
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.55, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    osc.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc.start(time); osc.stop(time + 0.45);
}

function playShaker(time) {
    const buf = audioContext.createBuffer(1, audioContext.sampleRate * 0.08, audioContext.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    const hp = audioContext.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 8000;
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.2, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.06);
    src.connect(hp); hp.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) hp.connect(mediaStreamDestination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    src.start(time); src.stop(time + 0.08);
}

function playCowbell(time) {
    const osc1 = audioContext.createOscillator();
    osc1.type = 'square';
    osc1.frequency.value = 560;
    const osc2 = audioContext.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 845;
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.3, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    const bp = audioContext.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
    osc1.connect(bp);
    osc2.connect(bp);
    bp.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) bp.connect(mediaStreamDestination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc1.start(time); osc2.start(time);
    osc1.stop(time + 0.2); osc2.stop(time + 0.2);
}

function playWoodblock(time) {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.05);
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.4, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    osc.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    osc.start(time); osc.stop(time + 0.1);

    const buf = audioContext.createBuffer(1, audioContext.sampleRate * 0.03, audioContext.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    const hp = audioContext.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 3000;
    const ng = audioContext.createGain();
    ng.gain.setValueAtTime(0.15, time);
    ng.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
    src.connect(hp); hp.connect(ng); ng.connect(audioContext.destination);
    if (mediaStreamDestination) hp.connect(mediaStreamDestination);
    if (mediaStreamDestination) ng.connect(mediaStreamDestination);
    src.start(time); src.stop(time + 0.04);
}

function playHiHat(time) {
    const buf = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    const hp = audioContext.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0.3, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    src.connect(hp); hp.connect(g); g.connect(audioContext.destination);
    if (mediaStreamDestination) hp.connect(mediaStreamDestination);
    if (mediaStreamDestination) g.connect(mediaStreamDestination);
    src.start(time); src.stop(time + 0.05);
}

// ==================== СЕТКА ====================

function createEmptyGrid(rows, cols) {
    return Array(rows).fill(null).map(() => Array(cols).fill(false));
}

function createDrumGrid() {
    const grid = document.createElement('div');
    grid.id = 'drumGrid';
    grid.className = 'grid';

    const headerRow = document.createElement('div');
    headerRow.className = 'grid-row';
    const corner = document.createElement('div');
    corner.className = 'note-label';
    headerRow.appendChild(corner);
    for (let col = 0; col < numCols; col++) {
        const h = document.createElement('div');
        h.className = 'col-header';
        h.textContent = col + 1;
        headerRow.appendChild(h);
    }
    grid.appendChild(headerRow);

    for (let row = 0; row < DRUMS.length; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'grid-row';

        const colorBar = document.createElement('div');
        colorBar.className = 'note-color';
        colorBar.style.background = DRUMS[row].color;
        rowDiv.appendChild(colorBar);

        const label = document.createElement('div');
        label.className = 'note-label';
        label.textContent = DRUMS[row].name;
        rowDiv.appendChild(label);

        for (let col = 0; col < numCols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            if (drumGrid[row][col]) cell.classList.add(`drum-active-${row}`);
            cell.addEventListener('click', () => {
                drumGrid[row][col] = !drumGrid[row][col];
                cell.classList.toggle(`drum-active-${row}`);
                if (drumGrid[row][col]) playDrumSound(row);
            });
            rowDiv.appendChild(cell);
        }
        grid.appendChild(rowDiv);
    }
    return grid;
}

function renderGrids() {
    gridContainer.innerHTML = '';

    // Volume sliders for instruments (placed above melody grids)
    const volumeContainer = document.createElement('div');
    volumeContainer.id = 'volumeContainer';
    volumeContainer.style.display = 'flex';
    volumeContainer.style.gap = '10px';
    volumeContainer.style.marginBottom = '8px';
    INSTRUMENTS.forEach(inst => {
        const label = document.createElement('label');
        label.textContent = `${inst} volume`;
        label.style.fontSize = '12px';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = instrumentVolumes[inst] * 100;
        slider.dataset.inst = inst;
        slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) / 100;
            instrumentVolumes[inst] = val;
        });
        label.appendChild(slider);
        volumeContainer.appendChild(label);
    });
    gridContainer.appendChild(volumeContainer);

    // Melody wrapper
    const melodyWrapper = document.createElement('div');
    melodyWrapper.id = 'melodyWrapper';
    melodyWrapper.className = activeMainTab === 'melody' ? '' : 'hidden';

    const melodyGridsContainer = document.getElementById('melodyGrids');
    if (melodyGridsContainer) {
        INSTRUMENTS.forEach(inst => {
            const panel = document.getElementById(`melody-${inst}`);
            if (panel && !panel.querySelector('.grid')) {
                panel.appendChild(createMelodyGridForInstrument(inst));
            }
        });
        INSTRUMENTS.forEach(inst => {
            const panel = document.getElementById(`melody-${inst}`);
            if (panel) {
                panel.className = `melody-grid-panel ${inst === activeInstrument ? '' : 'hidden'}`;
            }
        });
        melodyWrapper.appendChild(melodyGridsContainer);
    }
    gridContainer.appendChild(melodyWrapper);

    // Drum wrapper
    const drumWrapper = document.createElement('div');
    drumWrapper.id = 'drumWrapper';
    drumWrapper.className = activeMainTab === 'drums' ? '' : 'hidden';
    drumWrapper.appendChild(createDrumGrid());
    gridContainer.appendChild(drumWrapper);
}

function createMelodyGridForInstrument(inst) {
    const grid = document.createElement('div');
    grid.id = `melodyGrid-${inst}`;
    grid.className = 'grid';

    // Заголовок
    const headerRow = document.createElement('div');
    headerRow.className = 'grid-row';
    const corner = document.createElement('div');
    corner.className = 'note-label';
    headerRow.appendChild(corner);
    for (let col = 0; col < numCols; col++) {
        const h = document.createElement('div');
        h.className = 'col-header';
        h.textContent = col + 1;
        headerRow.appendChild(h);
    }
    grid.appendChild(headerRow);

    const currentGrid = instrumentGrids[inst];

    for (let row = 0; row < ROWS; row++) {
        if (OCTAVE_BREAKS.includes(row)) {
            const sep = document.createElement('div');
            sep.className = 'octave-separator';
            grid.appendChild(sep);
        }

        const rowDiv = document.createElement('div');
        rowDiv.className = 'grid-row';

        const colorBar = document.createElement('div');
        colorBar.className = 'note-color';
        const octaveIndex = Math.floor(row / 7);
        const hue = 200 + octaveIndex * 40;
        colorBar.style.background = `hsl(${hue}, 70%, 65%)`;
        rowDiv.appendChild(colorBar);

        const label = document.createElement('div');
        label.className = 'note-label';
        label.textContent = MELODY_NOTES[row].name;
        rowDiv.appendChild(label);

        for (let col = 0; col < numCols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            if (currentGrid[row][col]) cell.classList.add('active');
            cell.addEventListener('click', () => {
                currentGrid[row][col] = !currentGrid[row][col];
                cell.classList.toggle('active');
                if (currentGrid[row][col]) {
                    playMelodyNoteForInstrument(inst, MELODY_NOTES[row].freq);
                }
            });
            rowDiv.appendChild(cell);
        }
        grid.appendChild(rowDiv);
    }
    return grid;
}

function getMelodyCell(row, col) {
    const melodyGridEl = document.getElementById(`melodyGrid-${activeInstrument}`);
    if (!melodyGridEl) return null;
    return melodyGridEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function getMelodyCellForInstrument(inst, row, col) {
    const melodyGridEl = document.getElementById(`melodyGrid-${inst}`);
    if (!melodyGridEl) return null;
    return melodyGridEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function getDrumCell(row, col) {
    const drumGridEl = document.getElementById('drumGrid');
    if (!drumGridEl) return null;
    return drumGridEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

// ==================== ВОСПРОИЗВЕДЕНИЕ ====================

function playColumn(col) {
    // Все инструменты играют одновременно, каждый из своей сетки
    INSTRUMENTS.forEach(inst => {
        const grid = instrumentGrids[inst];
        for (let row = 0; row < ROWS; row++) {
            if (grid[row][col]) {
                playMelodyNoteForInstrument(inst, MELODY_NOTES[row].freq);
                const cell = getMelodyCellForInstrument(inst, row, col);
                if (cell) cell.classList.add('playing');
            }
        }
    });

    // Ударные
    for (let row = 0; row < DRUMS.length; row++) {
        const cell = getDrumCell(row, col);
        if (cell) cell.classList.add('playing');
        if (drumGrid[row][col]) playDrumSound(row);
    }

    setTimeout(() => {
        document.querySelectorAll('.cell.playing').forEach(c => c.classList.remove('playing'));
    }, 200);
}

function togglePlay() {
    isPlaying ? stopPlaying() : startPlaying();
}

function startPlaying() {
    isPlaying = true;
    playBtn.textContent = '⏹ Stop';
    const tempo = parseInt(tempoSlider.value);
    // Calculate interval for one column per beat (tempo is beats per minute)
    const interval = 60000 / tempo;
    playInterval = setInterval(() => {
        playColumn(currentCol);
        currentCol = (currentCol + 1) % numCols;
    }, interval);
}

function stopPlaying() {
    isPlaying = false;
    playBtn.textContent = '▶ Play';
    clearInterval(playInterval);
    document.querySelectorAll('.cell.playing').forEach(c => c.classList.remove('playing'));
    currentCol = 0;
}

// ==================== УПРАВЛЕНИЕ ====================

function clearActive() {
    if (activeMainTab === 'melody') {
        instrumentGrids[activeInstrument] = createEmptyGrid(ROWS, numCols);
        // Очищаем только DOM активной сетки
        const gridEl = document.getElementById(`melodyGrid-${activeInstrument}`);
        if (gridEl) {
            gridEl.querySelectorAll('.cell.active').forEach(c => c.classList.remove('active'));
        }
    } else {
        drumGrid = createEmptyGrid(DRUMS.length, numCols);
        const drumGridEl = document.getElementById('drumGrid');
        if (drumGridEl) {
            drumGridEl.querySelectorAll('.cell[class*="drum-active"]').forEach(c => {
                c.className = 'cell';
            });
        }
    }
    if (isPlaying) stopPlaying();
}

function switchMainTab(tab) {
    activeMainTab = tab;
    mainTabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mainTab === tab));

    const melodyWrapper = document.getElementById('melodyWrapper');
    const drumWrapper = document.getElementById('drumWrapper');
    if (melodyWrapper) melodyWrapper.className = tab === 'melody' ? '' : 'hidden';
    if (drumWrapper) drumWrapper.className = tab === 'drums' ? '' : 'hidden';

    // Показываем/скрываем вкладки инструментов
    const instrumentTabs = document.getElementById('instrumentTabs');
    const melodyGrids = document.getElementById('melodyGrids');
    if (instrumentTabs) instrumentTabs.className = tab === 'melody' ? 'tabs instrument-tabs' : 'tabs instrument-tabs hidden';
    if (melodyGrids) melodyGrids.className = tab === 'melody' ? '' : 'hidden';
}

function switchInstrument(inst) {
    activeInstrument = inst;
    instTabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.instrument === inst));
    // Просто переключаем видимость, не перерисовывая
    INSTRUMENTS.forEach(i => {
        const panel = document.getElementById(`melody-${i}`);
        if (panel) {
            panel.className = `melody-grid-panel ${i === inst ? '' : 'hidden'}`;
        }
    });
}

function updateCols() {
    let val = parseInt(colsInput.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 1024) val = 1024;
    colsInput.value = val;

    const newCols = val;

    // Пересоздаём сетки для всех инструментов
    INSTRUMENTS.forEach(inst => {
        const old = instrumentGrids[inst].map(r => [...r]);
        instrumentGrids[inst] = createEmptyGrid(ROWS, newCols);
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < Math.min(old[row].length, newCols); col++) {
                instrumentGrids[inst][row][col] = old[row][col];
            }
        }
        // Перерисовываем DOM для этого инструмента
        const panel = document.getElementById(`melody-${inst}`);
        if (panel) {
            panel.innerHTML = '';
            panel.appendChild(createMelodyGridForInstrument(inst));
        }
    });

    const oldDrums = drumGrid.map(r => [...r]);
    drumGrid = createEmptyGrid(DRUMS.length, newCols);
    for (let row = 0; row < DRUMS.length; row++) {
        for (let col = 0; col < Math.min(oldDrums[row].length, newCols); col++) {
            drumGrid[row][col] = oldDrums[row][col];
        }
    }

    numCols = newCols;
    // Перерисовываем ударные
    const drumWrapper = document.getElementById('drumWrapper');
    if (drumWrapper) {
        drumWrapper.innerHTML = '';
        drumWrapper.appendChild(createDrumGrid());
    }

    if (isPlaying) { stopPlaying(); startPlaying(); }
}

// ==================== КЛАВИАТУРА ====================

function handleKeyboard(e) {
    const cursor = activeMainTab === 'melody' ? cursorMelody : cursorDrums;
    const maxRow = activeMainTab === 'melody' ? ROWS : DRUMS.length;

    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            cursor.row = Math.max(0, cursor.row - 1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            cursor.row = Math.min(maxRow - 1, cursor.row + 1);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            cursor.col = Math.max(0, cursor.col - 1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            cursor.col = Math.min(numCols - 1, cursor.col + 1);
            break;
        case 'Enter':
            e.preventDefault();
            const getCell = activeMainTab === 'melody' ? getMelodyCell : getDrumCell;
            const cell = getCell(cursor.row, cursor.col);
            if (cell) cell.click();
            break;
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
        case 'Backspace':
            e.preventDefault();
            const grid = activeMainTab === 'melody'
                ? instrumentGrids[activeInstrument] : drumGrid;
            if (grid[cursor.row][cursor.col]) {
                const getCell2 = activeMainTab === 'melody' ? getMelodyCell : getDrumCell;
                const cell2 = getCell2(cursor.row, cursor.col);
                if (cell2) cell2.click();
            }
            break;
    }
    updateCursor();
}

function updateCursor() {
    document.querySelectorAll('.cell').forEach(c => c.style.outline = '');
    const cursor = activeMainTab === 'melody' ? cursorMelody : cursorDrums;
    const getCell = activeMainTab === 'melody' ? getMelodyCell : getDrumCell;
    const cell = getCell(cursor.row, cursor.col);
    if (cell) cell.style.outline = '3px solid #ff6b6b';
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

playBtn.addEventListener('click', togglePlay);
clearBtn.addEventListener('click', clearActive);
tempoSlider.addEventListener('input', () => {
    tempoValue.textContent = tempoSlider.value;
    if (isPlaying) { stopPlaying(); startPlaying(); }
});
tempoSlider.addEventListener('change', () => {
    let val = parseInt(tempoSlider.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 420) val = 420;
    tempoSlider.value = val;
    tempoValue.textContent = val;
    if (isPlaying) { stopPlaying(); startPlaying(); }
});
colsInput.addEventListener('change', updateCols);
colsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') updateCols();
});
mainTabBtns.forEach(btn => btn.addEventListener('click', () => switchMainTab(btn.dataset.mainTab)));
instTabBtns.forEach(btn => btn.addEventListener('click', () => switchInstrument(btn.dataset.instrument)));
document.addEventListener('keydown', handleKeyboard);

renderGrids();

// ==================== EXPORT ====================
/**
 * Starts recording the mixed audio output using MediaRecorder.
 * The recorded data is stored in `recordedChunks` and will be saved
 * when `stopExport` is called.
 */
function startExport() {
    if (!mediaStreamDestination) return;
    // Create MediaRecorder if not already created
    if (!mediaRecorder) {
        try {
            mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
        } catch (e) {
            console.error('MediaRecorder not supported:', e);
            return;
        }
        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'song.webm';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            recordedChunks = [];
        };
    }
    recordedChunks = [];
    mediaRecorder.start();
    console.log('Recording started');
}

/**
 * Stops the recording and triggers download of the recorded audio.
 */
function stopExport() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('Recording stopped');
    }
}

// Toggle export on button click
const exportBtn = document.getElementById('exportBtn');
let exporting = false;
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        exporting = !exporting;
        if (exporting) {
            startExport();
            exportBtn.textContent = '⏹ Stop Export';
        } else {
            stopExport();
            exportBtn.textContent = '💾 Export';
        }
    });
}
