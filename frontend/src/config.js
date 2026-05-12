// Detect if we are running on Vercel or localhost
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL = isLocal 
  ? "http://localhost:8000" 
  : (import.meta.env.VITE_API_URL || "https://nexos-api-w4n0.onrender.com");

  