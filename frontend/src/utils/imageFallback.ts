/**
 * Local SVG placeholder — no external DNS, works offline.
 * Use as fallback when an image fails to load.
 */
export function svgPlaceholder(label = 'Ad', width = 400, height = 300): string {
  const safe = label.replace(/[<>&'"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#1a1a2e"/>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#g)" opacity="0.4"/>
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.3"/>
      </linearGradient>
    </defs>
    <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui,sans-serif" font-size="${Math.max(12, Math.min(24, width / 16))}"
      fill="#a5b4fc" opacity="0.9">${safe}</text>
    <text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui,sans-serif" font-size="${Math.max(10, Math.min(16, width / 24))}"
      fill="#6366f1" opacity="0.6">No Image Available</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Returns a raw URL without any proxy wrapper. CDN images are fetched directly. */
export function safeImageUrl(url: string | undefined, label?: string, w = 400, h = 300): string {
  if (!url || url.trim() === '') return svgPlaceholder(label, w, h);
  // Strip corsproxy wrapper if it was previously applied
  if (url.startsWith('https://corsproxy.io/?')) {
    try { return decodeURIComponent(url.replace('https://corsproxy.io/?', '')); } catch { return url; }
  }
  return url;
}
