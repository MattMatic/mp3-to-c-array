// dragDropZone.mjs
// Wires up drag-and-drop and click-to-browse on the hero drop zone, and
// draws its faint decorative oscilloscope grid.

const SUPPORTED_EXTENSION_RE = /\.(mp3|wav)$/i;
const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/vnd.wave',
]);

function isSupportedAudioFile(file) {
  return SUPPORTED_MIME_TYPES.has(file.type) || SUPPORTED_EXTENSION_RE.test(file.name);
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.dropzone
 * @param {HTMLInputElement} opts.fileInput
 * @param {HTMLButtonElement} opts.browseBtn
 * @param {(files: File[]) => void} opts.onFiles
 */
export function initDragDropZone({ dropzone, fileInput, browseBtn, onFiles }) {
  let dragCounter = 0;

  const openPicker = () => fileInput.click();

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPicker();
  });

  dropzone.addEventListener('click', openPicker);
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });

  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  dropzone.addEventListener('dragenter', () => {
    dragCounter++;
    dropzone.classList.add('is-dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) dropzone.classList.remove('is-dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    dragCounter = 0;
    dropzone.classList.remove('is-dragover');
    handleFiles(e.dataTransfer && e.dataTransfer.files);
  });

  function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(isSupportedAudioFile);
    if (files.length === 0) return;
    onFiles(files);
  }
}

/**
 * Draw a faint static grid on the drop-zone background canvas, sized to
 * the element's current box. Re-run on resize for crispness.
 * @param {HTMLCanvasElement} canvas
 */
export function drawDropzoneGrid(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(111,255,176,0.06)';
  ctx.lineWidth = 1;

  const step = 28;
  ctx.beginPath();
  for (let x = 0; x <= width; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  // Faint center sine reference trace, echoing the wave-table motif.
  ctx.strokeStyle = 'rgba(111,255,176,0.15)';
  ctx.beginPath();
  const mid = height / 2;
  for (let x = 0; x <= width; x++) {
    const y = mid + Math.sin((x / width) * Math.PI * 4) * (height * 0.14);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
