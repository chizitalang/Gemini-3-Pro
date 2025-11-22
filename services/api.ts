
import { CredentialRecord, GenerateConfig } from '../types';

/**
 * SENIOR ENGINEER NOTE:
 * 
 * This service is designed to switch between a "Mock" mode (using localStorage)
 * and a "Real" mode (connecting to your Python FastAPI + PostgreSQL backend).
 * 
 * To connect to your real backend:
 * 1. Set USE_MOCK_BACKEND = false
 * 2. Ensure your FastAPI is running on localhost:8000 (or update API_BASE_URL)
 * 3. Ensure CORS is enabled in your FastAPI app.
 */

const USE_MOCK_BACKEND = true; 
const API_BASE_URL = 'http://localhost:8000/api';

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

  let password = '';
  for (let i = 0; i < config.length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

// Pattern Generation Helpers
const ADJECTIVES = ['Swift', 'Silent', 'Happy', 'Brave', 'Calm', 'Witty', 'Fancy', 'Bold', 'Crimson', 'Neon'];
const NOUNS = ['Fox', 'Eagle', 'Panda', 'Tiger', 'Lion', 'Hawk', 'Wolf', 'Bear', 'Falcon', 'Badger'];

const getRandomAdjective = () => ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
const getRandomNoun = () => NOUNS[Math.floor(Math.random() * NOUNS.length)];
const getRandomDigit = () => Math.floor(Math.random() * 10).toString();
const getRandomLetter = () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];

const generateUsernameFromPattern = (pattern: string): string => {
  // Default pattern if empty
  if (!pattern) pattern = '{adjective}{noun}{number}';

  return pattern
    .replace(/\{adjective\}/g, () => getRandomAdjective())
    .replace(/\{noun\}/g, () => getRandomNoun())
    .replace(/\{number\}/g, () => Math.floor(Math.random() * 1000).toString())
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
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network latency

      const password = generateRandomPassword(config);
      
      // Determine username based on type
      let username = '';
      if (config.usernameType === 'manual' && config.username && config.username.trim() !== '') {
        username = config.username;
      } else {
        // Auto generate using pattern (defaulting to standard if pattern is missing)
        username = generateUsernameFromPattern(config.usernamePattern || '{adjective}{noun}{number}');
      }

      const newRecord: CredentialRecord = {
        id: crypto.randomUUID(),
        username,
        password_plain: password,
        password_hash: 'simulated_hash_' + Math.random().toString(36).substring(7),
        created_at: new Date().toISOString(),
        remark: config.remark,
        group: config.group,
      };

      // Save to local storage mock DB
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...existing]));

      return newRecord;
    } else {
      // Real FastAPI Call
      // We send the full config, backend should handle usernameType logic
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      return data.data; // Assuming backend returns { data: record }
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
      const response = await fetch(`${API_BASE_URL}/records`);
      const data = await response.json();
      return data.data; // Assuming backend returns { data: [...] }
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
