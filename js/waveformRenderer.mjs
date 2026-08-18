// waveformRenderer.mjs
// Draws a phosphor-green oscilloscope-style trace of Int16 PCM data
// onto a canvas, min/max-binned per pixel column.

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Int16Array} samples
 */
export function drawWaveform(canvas, samples) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!samples || samples.length === 0) return;

  const mid = height / 2;
  const scale = (height / 2 - 3) / 32768;

  ctx.beginPath();
  ctx.strokeStyle = '#6FFFB0';
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(111,255,176,0.55)';
  ctx.shadowBlur = 4;

  const samplesPerPixel = samples.length / width;

  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * samplesPerPixel);
    const end = Math.max(start + 1, Math.floor((x + 1) * samplesPerPixel));
    let min = 32767, max = -32768;
    for (let i = start; i < end && i < samples.length; i++) {
      const v = samples[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min > max) { min = 0; max = 0; }

    const yMin = mid - max * scale;
    const yMax = mid - min * scale;

    if (x === 0) ctx.moveTo(x + 0.5, mid);
    ctx.moveTo(x + 0.5, yMin);
    ctx.lineTo(x + 0.5, yMax === yMin ? yMax + 0.5 : yMax);
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

/**
 * Draw a faint idle centerline (used while a strip is still queued/decoding).
 * @param {HTMLCanvasElement} canvas
 */
export function drawIdleLine(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(111,255,176,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2 + 0.5);
  ctx.lineTo(width, height / 2 + 0.5);
  ctx.stroke();
}
