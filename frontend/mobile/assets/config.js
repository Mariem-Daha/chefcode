/**
 * ChefCode Frontend Configuration
 * Automatically detects environment and uses appropriate API URL
 */

// Detect if running locally or in production
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:';

// PRODUCTION BACKEND URL (always use this for deployed app)
const PRODUCTION_API_URL = 'https://chefcode.onrender.com';

const CHEFCODE_CONFIG = {
  // Backend API URL - uses production URL when not on localhost
  API_URL: isLocalhost ? 'http://localhost:8000' : PRODUCTION_API_URL,
  
  // API Key for authentication
  API_KEY: 'chefcode-secret-key-2024'
};

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.CHEFCODE_CONFIG = CHEFCODE_CONFIG;
  console.log('🔧 ChefCode Config:', {
    environment: isLocalhost ? 'Development' : 'Production',
    apiUrl: CHEFCODE_CONFIG.API_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol
  });
}


