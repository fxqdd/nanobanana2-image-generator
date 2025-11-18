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
  
  const currentMode = getAuthStorageMode();
  const currentStorage = selectStorageByMode(currentMode) ?? window.localStorage;
  const targetStorage = selectStorageByMode(mode) ?? window.localStorage;
  
  // 如果存储模式没有变化，直接返回
  if (currentMode === mode && currentStorage === targetStorage) {
    return;
  }
  
  // 在切换存储之前，先迁移现有的 session 数据
  try {
    const existingSession = currentStorage.getItem(SUPABASE_STORAGE_KEY);
    if (existingSession) {
      // 迁移 session 到新的存储
      targetStorage.setItem(SUPABASE_STORAGE_KEY, existingSession);
      console.log(`[AuthStorage] Migrated session from ${currentMode} to ${mode} storage`);
    }
  } catch (error) {
    console.warn('[AuthStorage] Failed to migrate session during storage switch:', error);
  }
  
  // 切换存储适配器
  storageAdapter.setStorage(targetStorage);
  window.localStorage.setItem(STORAGE_MODE_KEY, mode === 'session' ? 'session' : 'local');
  
  // 清理旧存储（但只在确认新存储有数据后）
  const opposite = mode === 'session' ? window.localStorage : window.sessionStorage;
  try {
    // 延迟清理，确保新存储已经设置好
    setTimeout(() => {
      if (targetStorage.getItem(SUPABASE_STORAGE_KEY)) {
        opposite?.removeItem(SUPABASE_STORAGE_KEY);
      }
    }, 100);
  } catch (error) {
    console.warn('Failed to clean up opposite auth storage', error);
  }
};

export default supabase;


