// downloadUtils.mjs

/**
 * Trigger a browser "Save As" download for a text file.
 * @param {string} filename
 * @param {string} text
 * @param {string} [mime]
 */
export function downloadTextFile(filename, text, mime = 'text/x-c') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick so the click has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy text to the clipboard, with an execCommand fallback for contexts
 * where the async Clipboard API is unavailable.
 * @param {string} text
 * @returns {Promise<boolean>} whether the copy succeeded
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}
