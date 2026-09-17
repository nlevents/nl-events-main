// Shared helpers for working with YouTube links (Shorts, watch, youtu.be, embed).

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;

/**
 * Extracts the 11-char YouTube video ID from any common YouTube URL shape,
 * including Shorts links. Returns null if the URL isn't recognized.
 * @param {string} url
 * @returns {string|null}
 */
export function youtubeId(url) {
  const match = typeof url === "string" ? url.match(YT_RE) : null;
  return match ? match[1] : null;
}

/**
 * Public, no-key-required thumbnail for a YouTube video.
 * @param {string} id
 * @returns {string}
 */
export function youtubeThumbnail(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
