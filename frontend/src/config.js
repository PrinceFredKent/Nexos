// Detect if we are running on Vercel or localhost
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL = isLocal 
  ? "http://localhost:8000" 
  : "https://nexos-api-production.up.railway.app";
  // After deploying to Railway, update this URL with your Railway service domain from the Railway dashboard


  