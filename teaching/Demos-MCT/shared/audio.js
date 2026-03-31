/* shared/audio.js — Utilidades Web Audio compartidas */
let _audioCtx = null;
const _activeNodes = [];

function getAudioContext() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function stopAllAudio() {
  _activeNodes.forEach(n => { try { n.stop(); } catch(e){} });
  _activeNodes.length = 0;
}

function playTone(freq, duration, type = 'sine', gain = 0.3) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start();
  // duration = 0 o null → indefinido hasta stopAllAudio()
  if (duration) {
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => {
      const i = _activeNodes.indexOf(osc);
      if (i >= 0) _activeNodes.splice(i, 1);
    };
  }
  _activeNodes.push(osc);
  return { osc, gainNode };
}

// Ruido blanco filtrado a `cutoff` Hz — dos filtros en cascada para -24 dB/oct
// Devuelve { src, filters } para poder actualizar el cutoff en vivo
function playNoise(cutoff, gain = 0.3) {
  const ctx = getAudioContext();
  const bufLen = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  // Dos filtros encadenados → pendiente -24 dB/oct → corte mucho más nítido
  const f1 = ctx.createBiquadFilter();
  f1.type = 'lowpass'; f1.frequency.value = cutoff; f1.Q.value = 0.7;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'lowpass'; f2.frequency.value = cutoff; f2.Q.value = 0.7;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);

  src.connect(f1); f1.connect(f2); f2.connect(gainNode);
  gainNode.connect(ctx.destination);
  src.start();
  _activeNodes.push(src);
  return { src, filters: [f1, f2] };
}

function playFilteredTone(freq, cutoff, duration, gain = 0.3) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gainNode = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  filter.Q.value = 0.7;
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start();
  // duration=0 → indefinido hasta stopAllAudio()
  if (duration) {
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }
  _activeNodes.push(osc);
  return osc;
}
