// Use VITE_API_URL from environment (set in Cloudflare Pages dashboard for prod,
// or in .env.local for dev). Falls back to localhost if nothing is set.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '');