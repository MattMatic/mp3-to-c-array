// fileStrip.mjs
// Builds and drives a single "channel strip" list item: decodes one MP3,
// resamples/converts it, draws its waveform, and wires up its actions.

import { decodeAndResample, DEFAULT_SAMPLE_RATE, DEFAULT_CHANNELS } from './audioDecoder.mjs';
import { floatChannelToInt16, floatBufferToInterleavedInt16 } from './pcmConverter.mjs';
import { toCIdentifier, buildHeaderFile } from './cArrayFormatter.mjs';
import { drawWaveform, drawIdleLine } from './waveformRenderer.mjs';
import { downloadTextFile, copyText } from './downloadUtils.mjs';
import { trimSilence } from './silenceTrimmer.mjs';

/**
 * @param {File} file
 * @param {HTMLTemplateElement} template
 * @param {HTMLElement} container
 * @param {object} [options]
 * @param {number} [options.sampleRate]     Target output sample rate, in Hz.
 * @param {number} [options.channels]       Target output channel count (1 or 2).
 * @param {number|null} [options.trimThresholdDb]  dBFS threshold for silence
 *   trimming, or null/undefined to leave leading/trailing silence intact.
 */
export function createFileStrip(file, template, container, options = {}) {
  const sampleRate = options.sampleRate || DEFAULT_SAMPLE_RATE;
  const channels = options.channels || DEFAULT_CHANNELS;
  const trimThresholdDb = options.trimThresholdDb ?? null;
  const node = template.content.firstElementChild.cloneNode(true);
  container.appendChild(node);

  const els = {
    canvas: node.querySelector('.strip__wave'),
    status: node.querySelector('.strip__status'),
    name: node.querySelector('.strip__name'),
    meta: node.querySelector('.strip__meta'),
    progressBar: node.querySelector('.strip__progress-bar'),
    downloadBtn: node.querySelector('.strip__download'),
    copyBtn: node.querySelector('.strip__copy'),
    toggleBtn: node.querySelector('.strip__toggle'),
    preview: node.querySelector('.strip__preview'),
    previewCode: node.querySelector('.strip__preview code'),
  };

  els.name.textContent = file.name;
  els.name.title = file.name;
  drawIdleLine(els.canvas);
  setStatus('queued');

  let headerText = '';
  let downloadName = 'audio.h';

  els.toggleBtn.addEventListener('click', () => {
    const hidden = els.preview.hasAttribute('hidden');
    if (hidden) {
      els.preview.removeAttribute('hidden');
      els.toggleBtn.textContent = 'hide';
    } else {
      els.preview.setAttribute('hidden', '');
      els.toggleBtn.textContent = 'preview';
    }
  });

  els.downloadBtn.addEventListener('click', () => {
    downloadTextFile(downloadName, headerText);
  });

  els.copyBtn.addEventListener('click', async () => {
    const ok = await copyText(headerText);
    const original = els.copyBtn.textContent;
    els.copyBtn.textContent = ok ? 'copied!' : 'copy failed';
    setTimeout(() => { els.copyBtn.textContent = original; }, 1400);
  });

  run();

  async function run() {
    try {
      setStatus('working');
      setProgress(15);
      els.meta.textContent = 'decoding…';

      const targetWord = channels === 1 ? 'mono' : 'stereo';
      const { resampled, original } = await decodeAndResample(file, { sampleRate, channels });
      setProgress(50);
      els.meta.textContent = `${original.sampleRate} Hz ${original.channels === 1 ? 'mono' : 'stereo'} → ${formatRate(sampleRate)} ${targetWord}`;

      const { buffer: trimmedBuffer, trimmedStartFrames, trimmedEndFrames } = trimSilence(resampled, trimThresholdDb);
      const framesTrimmed = trimmedStartFrames + trimmedEndFrames;
      setProgress(65);

      const samples = floatBufferToInterleavedInt16(trimmedBuffer);
      setProgress(85);

      const identifier = toCIdentifier(file.name);
      headerText = buildHeaderFile({
        identifier,
        sourceName: file.name,
        samples,
        sampleRate,
        channels,
        originalInfo: original,
      });
      downloadName = `${identifier}.h`;

      els.previewCode.textContent = headerText;
      // The scope trace always shows a single channel (left, for stereo)
      // for a clean readout even when the exported array is interleaved.
      drawWaveform(els.canvas, floatChannelToInt16(trimmedBuffer, 0));

      setProgress(100);
      setStatus('done');
      const frameCount = channels === 1 ? samples.length : Math.floor(samples.length / channels);
      const trimNote = framesTrimmed > 0
        ? ` · trimmed ${Math.round((framesTrimmed / sampleRate) * 1000)}ms silence`
        : '';
      els.meta.textContent = `${original.sampleRate} Hz ${original.channels === 1 ? 'mono' : 'stereo'} → ${formatRate(sampleRate)} ${targetWord} · ${frameCount.toLocaleString()} samples${channels > 1 ? ` (${samples.length.toLocaleString()} values)` : ''}${trimNote}`;

      els.downloadBtn.disabled = false;
      els.copyBtn.disabled = false;
      els.toggleBtn.disabled = false;
    } catch (err) {
      console.error(`Failed to convert ${file.name}:`, err);
      setStatus('error');
      els.meta.textContent = err && err.message ? err.message : 'Conversion failed';
      els.progressBar.classList.add('is-error');
      setProgress(100);
    }
  }

  function setStatus(state) {
    els.status.dataset.state = state;
    els.status.textContent = state;
  }

  function setProgress(pct) {
    els.progressBar.style.width = pct + '%';
  }

  return node;
}

function formatRate(hz) {
  return hz % 1000 === 0 ? `${hz / 1000} kHz` : `${(hz / 1000).toFixed(3)} kHz`;
}
