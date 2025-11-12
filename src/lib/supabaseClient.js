import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const STORAGE_MODE_KEY = 'nb-auth-storage-mode';
const SUPABASE_STORAGE_KEY = 'nb-supabase-auth';

const selectStorageByMode = (mode) => {
  if (typeof window === 'undefined') return null;
  return mode === 'session' ? window.sessionStorage : window.localStorage;
};

const storageAdapter = {
  currentStorage: typeof window !== 'undefined' ? window.localStorage : null,
  setStorage(storage) {
    this.currentStorage = storage;
  },
  getItem(key) {
    try {
      return this.currentStorage?.getItem(key) ?? null;
    } catch (error) {
      console.warn('Failed to read auth storage item', error);
      return null;
    }
  },
  setItem(key, value) {
    try {
      this.currentStorage?.setItem(key, value);
    } catch (error) {
      console.warn('Failed to write auth storage item', error);
    }
  },
  removeItem(key) {
    try {
      this.currentStorage?.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove auth storage item', error);
    }
  }
};

if (typeof window !== 'undefined') {
  const savedMode = window.localStorage.getItem(STORAGE_MODE_KEY) === 'session' ? 'session' : 'local';
  storageAdapter.setStorage(selectStorageByMode(savedMode) ?? window.localStorage);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  console.error('Current values:', {
    url: supabaseUrl ? '✓ configured' : '✗ missing',
    key: supabaseAnonKey ? '✓ configured' : '✗ missing'
  });
} else {
  console.log('✓ Supabase client initialized:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyConfigured: !!supabaseAnonKey
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: storageAdapter,
    storageKey: SUPABASE_STORAGE_KEY
  }
});

export const getAuthStorageMode = () => {
  if (typeof window === 'undefined') return 'local';
  return window.localStorage.getItem(STORAGE_MODE_KEY) === 'session' ? 'session' : 'local';
};

export const setAuthStorageMode = (mode = 'local') => {
  if (typeof window === 'undefined') return;
  const targetStorage = selectStorageByMode(mode) ?? window.localStorage;
  storageAdapter.setStorage(targetStorage);
  window.localStorage.setItem(STORAGE_MODE_KEY, mode === 'session' ? 'session' : 'local');
  const opposite = mode === 'session' ? window.localStorage : window.sessionStorage;
  try {
    opposite?.removeItem(SUPABASE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clean up opposite auth storage', error);
  }
};

export default supabase;


