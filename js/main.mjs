// main.mjs
// Entry point: wires the drop zone to the file-strip pipeline.

import { initDragDropZone, drawDropzoneGrid } from './dragDropZone.mjs';
import { createFileStrip } from './fileStrip.mjs';

const dropzone = document.getElementById('dropzone');
const dropzoneGrid = document.getElementById('dropzone-grid');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const stripList = document.getElementById('strip-list');
const emptyState = document.getElementById('empty-state');
const template = document.getElementById('strip-template');
const sampleRateSelect = document.getElementById('sample-rate-select');
const channelsSelect = document.getElementById('channels-select');
const trimSelect = document.getElementById('trim-select');

function currentOptions() {
  const trimValue = trimSelect.value;
  return {
    sampleRate: parseInt(sampleRateSelect.value, 10),
    channels: parseInt(channelsSelect.value, 10),
    trimThresholdDb: trimValue === '' ? null : parseFloat(trimValue),
  };
}

function syncEmptyState() {
  emptyState.style.display = stripList.children.length ? 'none' : '';
}

initDragDropZone({
  dropzone,
  fileInput,
  browseBtn,
  onFiles(files) {
    const options = currentOptions();
    for (const file of files) {
      createFileStrip(file, template, stripList, options);
    }
    syncEmptyState();
  },
});

function resizeGrid() {
  drawDropzoneGrid(dropzoneGrid);
}
window.addEventListener('resize', resizeGrid);
resizeGrid();
syncEmptyState();

// Warn (gently) if the browser lacks the Web Audio APIs this tool needs.
if (!(window.AudioContext || window.webkitAudioContext) || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) {
  const warning = document.createElement('p');
  warning.textContent = 'This browser does not support the Web Audio API needed for conversion. Try a recent Chrome, Firefox, Safari, or Edge.';
  warning.style.color = '#FF6B6B';
  warning.style.textAlign = 'center';
  warning.style.marginTop = '14px';
  warning.style.fontSize = '13px';
  document.querySelector('main').appendChild(warning);
}
