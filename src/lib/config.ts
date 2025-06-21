// API Configuration
export const API_CONFIG = {
  SYNERGY_API_URL: import.meta.env.PROD 
    ? 'https://vowlfnpbffxzwvnippxt.supabase.co/functions/v1/quick-function'  // Production URL
    : '/api/synergy',  // Development URL (proxy)
  SYNERGY_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvd2xmbnBiZmZ4end2bmlwcHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MDIxNTksImV4cCI6MjA2NDE3ODE1OX0.qITVfdmeQc8vQOtJUcNSr-q3EKYL3q3doeFHXAYxdeU'
}; 

// Site URLs and configuration
export const APP_URL = (() => {
  if (window.location.hostname === 'localhost') {
    // In development, use the current origin (includes port)
    return window.location.origin;
  }
  return 'https://www.pranitnale.com';
})();

export const AUTH_CALLBACK_PATH = '/#/auth/callback';

export const getRedirectURL = () => `${APP_URL}${AUTH_CALLBACK_PATH}`;

// API URLs
export const SYNERGY_API_URL = 
  window.location.hostname === 'localhost'
    ? `${window.location.origin}/api/synergy`  // Local development
    : 'https://vowlfnpbffxzwvnippxt.supabase.co/functions/v1/quick-function';  // Production

// Avatar configuration
export const getAvatarURL = (userId: string) => `https://avatar.vercel.sh/${userId}.png`;

// Other configuration constants can be added here 