// Read API URL from Vite environment, fallback based on port for development vs production/tunnels
export const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.port === '5173' || window.location.port === '3000' ? `http://${window.location.hostname}:8000` : window.location.origin);
