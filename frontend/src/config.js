// Use VITE_API_URL from environment (set in Cloudflare Pages dashboard for prod,
// or in .env.local for dev). Falls back to localhost / same-host:8000 when unset.

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function resolveApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  const { hostname, port, protocol } = window.location;
  if (LOCAL_HOSTNAMES.has(hostname)) {
    return 'http://localhost:8000';
  }
  if (port) {
    return `${protocol}//${hostname}:8000`;
  }
  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const isApiConfigured = API_BASE_URL.length > 0;

export const API_CONFIG_MESSAGE =
  'Backend URL is not configured. Set VITE_API_URL in Cloudflare Pages (Settings → Environment variables), then redeploy.';

if (!isApiConfigured) {
  const log = import.meta.env.PROD ? console.error : console.warn;
  log(`[Nexos] ${API_CONFIG_MESSAGE}`);
}
