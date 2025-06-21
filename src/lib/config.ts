// API Configuration
export const API_CONFIG = {
  SYNERGY_API_URL: import.meta.env.PROD 
    ? 'https://vowlfnpbffxzwvnippxt.supabase.co/functions/v1/quick-function'  // Production URL
    : '/api/synergy',  // Development URL (proxy)
  SYNERGY_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvd2xmbnBiZmZ4end2bmlwcHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MDIxNTksImV4cCI6MjA2NDE3ODE1OX0.qITVfdmeQc8vQOtJUcNSr-q3EKYL3q3doeFHXAYxdeU'
}; 

// Site URLs and configuration
export const APP_URL = 
  window.location.hostname === 'localhost' 
    ? 'http://localhost:5173'
    : 'https://www.pranitnale.com';

export const AUTH_CALLBACK_PATH = '/#/auth/callback';

export const getRedirectURL = () => `${APP_URL}${AUTH_CALLBACK_PATH}`;

// Other configuration constants can be added here 