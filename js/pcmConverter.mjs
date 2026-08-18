// pcmConverter.mjs
// Converts Web Audio's Float32 PCM samples ([-1, 1]) into signed 16-bit
// PCM, matching the standard WAV int16 encoding.

/**
 * Standard float -> int16 scaling: negative range uses 0x8000, positive
 * range uses 0x7FFF so both clamp exactly at full scale.
 * @param {number} f
 * @returns {number}
 */
function floatSampleToInt16(f) {
  const s = Math.max(-1, Math.min(1, f));
  return Math.round(s < 0 ? s * 0x8000 : s * 0x7fff);
}

/**
 * Convert a single channel of an AudioBuffer to Int16.
 * @param {AudioBuffer} audioBuffer
 * @param {number} [channel]
 * @returns {Int16Array}
 */
export function floatChannelToInt16(audioBuffer, channel = 0) {
  const float32 = audioBuffer.getChannelData(channel);
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    int16[i] = floatSampleToInt16(float32[i]);
  }
  return int16;
}

/**
 * Convert an AudioBuffer (any channel count) to a single Int16Array,
 * interleaved frame-by-frame (L,R,L,R,... for stereo; straight samples
 * for mono). This is the layout typically expected by a C int16_t PCM
 * buffer that feeds a DAC/codec.
 * @param {AudioBuffer} audioBuffer
 * @returns {Int16Array}
 */
export function floatBufferToInterleavedInt16(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const frames = audioBuffer.length;

  if (channels === 1) {
    return floatChannelToInt16(audioBuffer, 0);
  }

  const channelData = [];
  for (let c = 0; c < channels; c++) channelData.push(audioBuffer.getChannelData(c));

  const interleaved = new Int16Array(frames * channels);
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      interleaved[i * channels + c] = floatSampleToInt16(channelData[c][i]);
    }
  }
  return interleaved;
}
