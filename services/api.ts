import { CredentialRecord, GenerateConfig, User, AuthResponse } from '../types';

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

const STORAGE_KEY_RECORDS = 'securegen_records';
const STORAGE_KEY_USERS = 'securegen_users';
const STORAGE_KEY_TOKEN = 'securegen_token';
const STORAGE_KEY_CURRENT_USER = 'securegen_current_user';

// Helper to get Auth Headers
const getAuthHeaders = () => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

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

  // --- Auth Methods ---

  login: async (username: string, password: string): Promise<AuthResponse> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 500));
      let users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');

      // SEED DEFAULT ADMIN USER IF MISSING
      if (!users.find((u: any) => u.username === 'admin')) {
          const adminUser = { id: 'default-admin-uuid', username: 'admin', password: 'admin' };
          users.push(adminUser);
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
          // Reload users to ensure we have the latest reference
          users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
      }

      const user = users.find((u: any) => u.username === username && u.password === password);
      
      if (user) {
        const token = `mock_token_${user.id}_${Date.now()}`;
        const userObj = { id: user.id, username: user.username };
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(userObj));
        return { access_token: token, token_type: 'bearer', user: userObj };
      } else {
        throw new Error('Invalid credentials');
      }
    } else {
      // Real Backend Login
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      if (!response.ok) throw new Error('Login failed');
      const data = await response.json();
      localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
      
      // Fetch user details after login
      const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      const userData = await userResponse.json();
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(userData));
      
      return { ...data, user: userData };
    }
  },

  register: async (username: string, password: string): Promise<AuthResponse> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
      
      if (users.find((u: any) => u.username === username)) {
        throw new Error('Username already exists');
      }

      const newUser = { id: crypto.randomUUID(), username, password }; // In mock, storing plain pwd for simplicity
      users.push(newUser);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

      // Auto login
      const token = `mock_token_${newUser.id}_${Date.now()}`;
      const userObj = { id: newUser.id, username: newUser.username };
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(userObj));

      return { access_token: token, token_type: 'bearer', user: userObj };
    } else {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('Registration failed');
      return api.login(username, password);
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    window.location.reload();
  },

  getCurrentUser: (): User | null => {
    const u = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return u ? JSON.parse(u) : null;
  },

  // --- Data Methods ---

  generateAndSave: async (config: GenerateConfig): Promise<CredentialRecord> => {
    const currentUser = api.getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

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
        user_id: currentUser.id, // LINK RECORD TO USER
        username,
        password_plain: password,
        password_hash: 'simulated_hash_' + Math.random().toString(36).substring(7),
        created_at: new Date().toISOString(),
        remark: config.remark,
        group: config.group,
      };

      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify([newRecord, ...existing]));

      return newRecord;
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: getAuthHeaders(),
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

  getHistory: async (): Promise<CredentialRecord[]> => {
    const currentUser = api.getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
      // FILTER BY USER ID
      return data.filter((r: CredentialRecord) => r.user_id === currentUser.id);
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/records`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        return data.data; 
      } catch (error) {
          console.error("Backend connection failed:", error);
          throw error;
      }
    }
  },

  updateRecord: async (id: string, updates: { group?: string; remark?: string }): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
      const updatedRecords = existing.map((r: CredentialRecord) => 
        r.id === id ? { ...r, ...updates } : r
      );
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updatedRecords));
    } else {
      await fetch(`${API_BASE_URL}/records/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
    }
  },

  updateRecords: async (ids: string[], updates: { group?: string }): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
      const updatedRecords = existing.map((r: CredentialRecord) => 
        ids.includes(r.id) ? { ...r, ...updates } : r
      );
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updatedRecords));
    } else {
      await fetch(`${API_BASE_URL}/records/batch-update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids, ...updates }),
      });
    }
  },

  deleteRecord: async (id: string): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
      const updated = existing.filter((r: CredentialRecord) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
    } else {
      await fetch(`${API_BASE_URL}/records/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    }
  },

  deleteRecords: async (ids: string[]): Promise<void> => {
    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
      const updated = existing.filter((r: CredentialRecord) => !ids.includes(r.id));
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
    } else {
      await fetch(`${API_BASE_URL}/records/batch-delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      });
    }
  },

  clearHistory: async (): Promise<void> => {
    const currentUser = api.getCurrentUser();
    if (!currentUser) return;

    if (USE_MOCK_BACKEND) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
      // KEEP records NOT belonging to current user
      const kept = existing.filter((r: CredentialRecord) => r.user_id !== currentUser.id);
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(kept));
    } else {
      await fetch(`${API_BASE_URL}/records`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    }
  }
};