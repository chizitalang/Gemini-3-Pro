
import { CredentialRecord, GenerateConfig } from '../types';

/**
 * SENIOR ENGINEER NOTE:
 * 
 * This service is configured to connect to your Python FastAPI + PostgreSQL backend.
 * 
 * Setup Requirements for Real Backend:
 * 1. Ensure PostgreSQL is running.
 * 2. Ensure FastAPI is running (uvicorn main:app --reload) on http://localhost:8000.
 * 3. Change USE_MOCK_BACKEND to false below.
 */

const USE_MOCK_BACKEND = true; // Set to true to fix "Failed to fetch" errors in preview environment
const API_BASE_URL = 'http://localhost:8000/api';

export const isMockMode = USE_MOCK_BACKEND;

// --- Mock Implementation (LocalStorage) ---

const STORAGE_KEY = 'securegen_records';

const generateRandomPassword = (config: GenerateConfig): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = lowercase;
  if (config.useUppercase) charset += uppercase;
  if (config.useNumbers) charset += numbers;
  if (config.useSymbols) charset += symbols;

  if (charset.length === 0) charset = lowercase; // Fallback

  let password = '';
  const array = new Uint32Array(config.length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < config.length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
};

// Pattern Generation Helpers
const ADJECTIVES = ['Swift', 'Silent', 'Happy', 'Brave', 'Calm', 'Witty', 'Fancy', 'Bold', 'Crimson', 'Neon', 'Blue', 'Red', 'Green'];
const NOUNS = ['Fox', 'Eagle', 'Panda', 'Tiger', 'Lion', 'Hawk', 'Wolf', 'Bear', 'Falcon', 'Badger', 'Shark', 'Whale', 'Cat'];

const getRandomAdjective = () => ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
const getRandomNoun = () => NOUNS[Math.floor(Math.random() * NOUNS.length)];
const getRandomDigit = () => Math.floor(Math.random() * 10).toString();
const getRandomLetter = () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];

const generateUsernameFromPattern = (pattern: string): string => {
  if (!pattern) pattern = '{adjective}{noun}{number}';

  // Replace placeholders
  let result = pattern;
  
  // Use a loop to handle multiple occurrences of word placeholders
  while (result.includes('{adjective}')) {
    result = result.replace('{adjective}', getRandomAdjective());
  }
  while (result.includes('{noun}')) {
    result = result.replace('{noun}', getRandomNoun());
  }
  while (result.includes('{number}')) {
    result = result.replace('{number}', Math.floor(Math.random() * 1000).toString());
  }

  // Replace character wildcards
  return result
    .replace(/#/g, () => getRandomDigit())
    .replace(/\?/g, () => getRandomLetter());
};

// --- API Methods ---

export const api = {
  /**
   * Generate a new credential pair and save it.
   */
  generateAndSave: async (config: GenerateConfig): Promise<CredentialRecord> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 600)); 

      const password = generateRandomPassword(config);
      
      let username = '';
      if (config.usernameType === 'manual' && config.username && config.username.trim() !== '') {
        username = config.username;
      } else {
        username = generateUsernameFromPattern(config.usernamePattern || '{adjective}{noun}{number}');
      }

      const newRecord: CredentialRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        username,
        password_plain: password,
        password_hash: 'simulated_hash_' + Math.random().toString(36).substring(7),
        created_at: new Date().toISOString(),
        remark: config.remark,
        group: config.group,
      };

      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...existing]));

      return newRecord;
    } else {
      // Real FastAPI Call
      try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.data; 
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    }
  },

  /**
   * Get all history records.
   */
  getHistory: async (): Promise<CredentialRecord[]> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/records`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        return data.data; 
      } catch (error) {
          console.error("Backend connection failed:", error);
          throw error;
      }
    }
  },

  /**
   * Update a record's group or remark.
   */
  updateRecord: async (id: string, updates: { group?: string; remark?: string }): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updatedRecords = existing.map((r: CredentialRecord) => 
        r.id === id ? { ...r, ...updates } : r
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
    } else {
      await fetch(`${API_BASE_URL}/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    }
  },

  /**
   * Batch update records.
   */
  updateRecords: async (ids: string[], updates: { group?: string }): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updatedRecords = existing.map((r: CredentialRecord) => 
        ids.includes(r.id) ? { ...r, ...updates } : r
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
    } else {
      await fetch(`${API_BASE_URL}/records/batch-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, ...updates }),
      });
    }
  },

  /**
   * Delete a single record by ID.
   */
  deleteRecord: async (id: string): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updated = existing.filter((r: CredentialRecord) => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      await fetch(`${API_BASE_URL}/records/${id}`, {
        method: 'DELETE',
      });
    }
  },

  /**
   * Batch delete records by IDs.
   */
  deleteRecords: async (ids: string[]): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updated = existing.filter((r: CredentialRecord) => !ids.includes(r.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      await fetch(`${API_BASE_URL}/records/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    }
  },

  /**
   * Clear all history.
   */
  clearHistory: async (): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 300));
      localStorage.removeItem(STORAGE_KEY);
    } else {
      await fetch(`${API_BASE_URL}/records`, {
        method: 'DELETE',
      });
    }
  }
};
