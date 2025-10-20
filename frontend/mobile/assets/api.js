/**
 * ChefCode API Layer - Connected to FastAPI Backend
 * Gestisce tutte le chiamate al backend (port 8000)
 */

class ChefCodeAPI {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.apiKey = null; // MUST be set via setMobileConfig() or setApiKey()
    console.log('🌐 ChefCode API connected to:', this.baseURL);
    console.log('⚠️  API Key authentication required - set via setApiKey() or setMobileConfig()');
  }

  // Set API Key (must be called before making authenticated requests)
  setApiKey(apiKey) {
    if (!apiKey) {
      console.error('❌ API Key cannot be empty');
      throw new Error('API Key is required');
    }
    this.apiKey = apiKey;
    console.log('✅ API Key configured');
  }

  // Configurazione per mobile (React Native / Flutter)
  setMobileConfig(config) {
    this.baseURL = config.baseURL || this.baseURL;
    if (config.apiKey) {
      this.setApiKey(config.apiKey);
    }
    this.token = config.token; // Per autenticazione future (deprecated)
    console.log('📱 API URL updated to:', this.baseURL);
  }

  // Get headers with authentication
  getHeaders() {
    if (!this.apiKey) {
      console.error('❌ API Key not set. Call setApiKey() first.');
      throw new Error('API Key not configured. Call setApiKey() before making requests.');
    }
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
  }

  // ===== SYNC DATA =====
  async syncData(data) {
    try {
      console.log('🔗 API Call: syncData →', `${this.baseURL}/api/sync-data`);
      const response = await fetch(`${this.baseURL}/api/sync-data`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Check API Key configuration.');
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Sync failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Sync error:', error);
      throw error;
    }
  }

  // ===== CHATGPT AI =====
  async sendChatMessage(prompt, language = 'en') {
    try {
      console.log('🔗 API Call: sendChatMessage →', `${this.baseURL}/api/chatgpt-smart`);
      const response = await fetch(`${this.baseURL}/api/chatgpt-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Chat endpoint doesn't require auth for now
        body: JSON.stringify({ prompt, language })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'ChatGPT request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ ChatGPT error:', error);
      throw error;
    }
  }

  // ===== INVENTORY =====
  async getInventory() {
    try {
      const response = await fetch(`${this.baseURL}/api/data`);
      const data = await response.json();
      return data.inventory || [];
    } catch (error) {
      console.error('❌ Get inventory error:', error);
      throw error;
    }
  }

  async addInventoryItem(item) {
    try {
      const response = await fetch(`${this.baseURL}/api/action`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          action: 'add-inventory',
          data: item
        })
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Check API Key configuration.');
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add inventory item');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Add inventory error:', error);
      throw error;
    }
  }

  // ===== RECIPES =====
  async getRecipes() {
    try {
      const response = await fetch(`${this.baseURL}/api/data`);
      const data = await response.json();
      return data.recipes || {};
    } catch (error) {
      console.error('❌ Get recipes error:', error);
      throw error;
    }
  }

  async saveRecipe(name, recipe) {
    try {
      const response = await fetch(`${this.baseURL}/api/action`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          action: 'save-recipe',
          data: { name, recipe }
        })
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Check API Key configuration.');
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save recipe');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Save recipe error:', error);
      throw error;
    }
  }

  // ===== TASKS =====
  async getTasks() {
    try {
      const response = await fetch(`${this.baseURL}/api/data`);
      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.error('❌ Get tasks error:', error);
      throw error;
    }
  }

  async addTask(task) {
    try {
      const response = await fetch(`${this.baseURL}/api/action`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          action: 'add-task',
          data: task
        })
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Check API Key configuration.');
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add task');
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Add task error:', error);
      throw error;
    }
  }

  // ===== HEALTH CHECK =====
  async ping() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export per Web (browser)
if (typeof window !== 'undefined') {
  window.ChefCodeAPI = ChefCodeAPI;
}

// Export per Mobile (React Native / Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChefCodeAPI;
}

// Export per ES6 modules
if (typeof exports !== 'undefined') {
  exports.ChefCodeAPI = ChefCodeAPI;
}
