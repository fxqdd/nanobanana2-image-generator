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

// 创建并导出Supabase客户端函数
// 创建单一的 Supabase 客户端实例
let supabaseClient = null;

// 初始化并获取 Supabase 客户端实例
export const getSupabaseClient = () => {
  // 如果客户端实例已存在，直接返回
  if (supabaseClient) {
    return supabaseClient;
  }
  
  // 创建新的客户端实例
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: storageAdapter,
      storageKey: SUPABASE_STORAGE_KEY
    }
  });
  
  return supabaseClient;
}

// 重置客户端实例（用于存储模式切换后获取新实例）
export const resetSupabaseClient = () => {
  supabaseClient = null;
}

// 默认导出客户端实例获取函数
export default getSupabaseClient;

// 导出客户端实例以便直接使用
export const supabase = getSupabaseClient();

export const getAuthStorageMode = () => {
  if (typeof window === 'undefined') return 'local';
  return window.localStorage.getItem(STORAGE_MODE_KEY) === 'session' ? 'session' : 'local';
};

export const setAuthStorageMode = (mode = 'local', preserveSession = true) => {
  if (typeof window === 'undefined') return;
  
  const currentMode = getAuthStorageMode();
  const currentStorage = selectStorageByMode(currentMode) ?? window.localStorage;
  const targetStorage = selectStorageByMode(mode) ?? window.localStorage;
  
  // 如果存储模式没有变化，直接返回
  if (currentMode === mode && currentStorage === targetStorage) {
    return;
  }
  
  // 在切换存储之前，先迁移现有的 session 数据（如果 preserveSession 为 true）
  if (preserveSession) {
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
  }
  
  // 切换存储适配器（必须在 Supabase 操作之前完成）
  storageAdapter.setStorage(targetStorage);
  window.localStorage.setItem(STORAGE_MODE_KEY, mode === 'session' ? 'session' : 'local');
  
  // 重置客户端实例，确保下次使用时创建新实例
  resetSupabaseClient();
  
  // 不立即清理旧存储，让 Supabase 客户端有时间同步
  // 旧存储会在下次切换时自然被覆盖
};



export const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear from both storages to be safe
    window.localStorage.removeItem(SUPABASE_STORAGE_KEY);
    window.sessionStorage.removeItem(SUPABASE_STORAGE_KEY);
    console.log('[AuthStorage] Cleared auth session from storage');
  } catch (error) {
    console.warn('[AuthStorage] Failed to clear auth session:', error);
  }
};
