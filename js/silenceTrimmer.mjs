// silenceTrimmer.mjs
// Trims leading/trailing silence from an AudioBuffer based on an
// amplitude threshold expressed in dBFS, with a small padding margin
// left in place to avoid audible clicks at the cut points.

export const TRIM_THRESHOLD_OPTIONS = [
  { label: 'Off', value: '' },
  { label: '-40 dB (aggressive)', value: '-40' },
  { label: '-50 dB (default)', value: '-50' },
  { label: '-60 dB (light)', value: '-60' },
];

const PADDING_MS = 5;

function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

/**
 * Max absolute sample value across all channels at frame index i.
 */
function frameAbsMax(channelData, channels, i) {
  let m = 0;
  for (let c = 0; c < channels; c++) {
    const v = Math.abs(channelData[c][i]);
    if (v > m) m = v;
  }
  return m;
}

/**
 * Trim leading and trailing silence from an AudioBuffer.
 * @param {AudioBuffer} audioBuffer
 * @param {number|null} thresholdDb  dBFS threshold below which a frame is
 *   considered silent (e.g. -50). Pass null/undefined to disable trimming.
 * @returns {{ buffer: AudioBuffer, trimmedStartFrames: number, trimmedEndFrames: number }}
 */
export function trimSilence(audioBuffer, thresholdDb) {
  if (thresholdDb === null || thresholdDb === undefined || Number.isNaN(thresholdDb)) {
    return { buffer: audioBuffer, trimmedStartFrames: 0, trimmedEndFrames: 0 };
  }

  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const threshold = dbToLinear(thresholdDb);

  const channelData = [];
  for (let c = 0; c < channels; c++) channelData.push(audioBuffer.getChannelData(c));

  let start = 0;
  while (start < length && frameAbsMax(channelData, channels, start) < threshold) start++;

  // Entirely silent (or below threshold throughout) — leave untouched
  // rather than producing an empty/near-empty array.
  if (start >= length) {
    return { buffer: audioBuffer, trimmedStartFrames: 0, trimmedEndFrames: 0 };
  }

  let end = length - 1;
  while (end > start && frameAbsMax(channelData, channels, end) < threshold) end--;

  const paddingFrames = Math.round((PADDING_MS / 1000) * audioBuffer.sampleRate);
  const paddedStart = Math.max(0, start - paddingFrames);
  const paddedEnd = Math.min(length - 1, end + paddingFrames);

  // Nothing meaningful to trim.
  if (paddedStart === 0 && paddedEnd === length - 1) {
    return { buffer: audioBuffer, trimmedStartFrames: 0, trimmedEndFrames: 0 };
  }

  const newLength = paddedEnd - paddedStart + 1;
  const trimmed = new AudioBuffer({
    length: newLength,
    numberOfChannels: channels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let c = 0; c < channels; c++) {
    trimmed.copyToChannel(channelData[c].subarray(paddedStart, paddedEnd + 1), c);
  }

  return {
    buffer: trimmed,
    trimmedStartFrames: paddedStart,
    trimmedEndFrames: length - 1 - paddedEnd,
  };
}
