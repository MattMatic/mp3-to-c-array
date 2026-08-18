// audioDecoder.mjs
// Decodes audio (MP3, WAV, or anything else the browser's decodeAudioData
// supports) and resamples/downmixes it to a target sample rate + channel
// count using an OfflineAudioContext.

export const DEFAULT_SAMPLE_RATE = 24000;
export const DEFAULT_CHANNELS = 1;

export const SUPPORTED_SAMPLE_RATES = [8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000];

/**
 * Lazily-created AudioContext used only for `decodeAudioData`.
 * A single shared instance avoids hitting the browser's limit on
 * concurrently open AudioContexts when converting many files.
 */
let sharedDecodeContext = null;
function getDecodeContext() {
  if (!sharedDecodeContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sharedDecodeContext = new Ctx();
  }
  return sharedDecodeContext;
}

/**
 * Decode an MP3, WAV, or any other browser-supported audio file into an
 * AudioBuffer.
 * @param {File} file
 * @returns {Promise<AudioBuffer>}
 */
export async function decodeFileToAudioBuffer(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getDecodeContext();
  // decodeAudioData mutates/detaches the buffer in some browsers, but we
  // only need it once here so that's fine.
  return await new Promise((resolve, reject) => {
    ctx.decodeAudioData(arrayBuffer.slice(0), resolve, (err) => {
      reject(err instanceof Error ? err : new Error('Could not decode audio file (unsupported or corrupt MP3/WAV).'));
    });
  });
}

/**
 * Resample + downmix/upmix an AudioBuffer to the requested sample rate and
 * channel count using an OfflineAudioContext, which performs correct
 * band-limited resampling and standard channel up/down-mixing (e.g. the
 * spec's 0.5*(L+R) rule for stereo -> mono, and duplication for mono ->
 * stereo).
 * @param {AudioBuffer} audioBuffer
 * @param {number} sampleRate
 * @param {number} channels
 * @returns {Promise<AudioBuffer>}
 */
export async function resampleToTarget(audioBuffer, sampleRate = DEFAULT_SAMPLE_RATE, channels = DEFAULT_CHANNELS) {
  const targetLength = Math.max(1, Math.ceil(audioBuffer.duration * sampleRate));

  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(channels, targetLength, sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Full pipeline: File -> resampled AudioBuffer at the requested format.
 * @param {File} file
 * @param {object} [options]
 * @param {number} [options.sampleRate]
 * @param {number} [options.channels]
 * @returns {Promise<{ resampled: AudioBuffer, original: { sampleRate: number, channels: number, duration: number } }>}
 */
export async function decodeAndResample(file, options = {}) {
  const { sampleRate = DEFAULT_SAMPLE_RATE, channels = DEFAULT_CHANNELS } = options;
  const original = await decodeFileToAudioBuffer(file);
  const resampled = await resampleToTarget(original, sampleRate, channels);
  return {
    resampled,
    original: {
      sampleRate: original.sampleRate,
      channels: original.numberOfChannels,
      duration: original.duration,
    },
  };
}
