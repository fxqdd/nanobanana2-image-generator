import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import '../styles/Settings.css';
import { 
  getAllUsers, 
  updateUserCredits, 
  updateUserPlan,
  getMyProfile 
} from '../services/db';

const Admin = () => {
  const { t, getLocalizedPath } = useLanguage();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editCredits, setEditCredits] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const usersPerPage = 20;

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const profile = await getMyProfile();
        if (profile?.is_admin) {
          setIsAdmin(true);
          await loadUsers();
        } else {
          setError(t('admin.accessDenied') || 'Access denied: Admin only');
        }
      } catch (err) {
        console.error('检查管理员权限失败:', err);
        setError(err.message || 'Failed to check admin status');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers(usersPerPage, currentPage * usersPerPage);
      
      // 注意：Supabase 默认不允许直接查询 auth.users
      // 如果 profiles 表中没有存储 email，则显示 user_id
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('加载用户列表失败:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userProfile) => {
    setEditingUser(userProfile);
    setEditCredits(userProfile.credits_remaining?.toString() || '0');
    setEditPlan(userProfile.plan || 'basic');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      const credits = parseInt(editCredits, 10);
      if (isNaN(credits)) {
        alert(t('admin.invalidCredits') || 'Invalid credits value');
        return;
      }
      
      await Promise.all([
        updateUserCredits(editingUser.user_id, credits),
        updateUserPlan(editingUser.user_id, editPlan)
      ]);
      
      // 重新加载用户列表
      await loadUsers();
      setEditingUser(null);
      setEditCredits('');
      setEditPlan('');
      alert(t('admin.updateSuccess') || 'User updated successfully');
    } catch (err) {
      console.error('更新用户失败:', err);
      alert(err.message || 'Failed to update user');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditCredits('');
    setEditPlan('');
  };

  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(search) ||
      (u.user_id || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="container page">
        <p>{t('common.loading') || 'Loading...'}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container page">
        <SEO
          title={t('admin.title') || 'Admin - ' + t('common.appName')}
          description={t('admin.description') || 'Admin panel'}
          path={getLocalizedPath('/admin')}
        />
        <h1>{t('admin.title') || 'Admin Panel'}</h1>
        <div className="card">
          <p style={{ color: '#e53935' }}>{error || (t('admin.accessDenied') || 'Access denied: Admin only')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container page admin-page">
      <SEO
        title={t('admin.title') || 'Admin - ' + t('common.appName')}
        description={t('admin.description') || 'Admin panel'}
        path={getLocalizedPath('/admin')}
      />

      <h1>{t('admin.title') || 'Admin Panel'}</h1>
      <p>{t('admin.subtitle') || 'Manage users, credits, and plans'}</p>

      {error && (
        <div className="card" style={{ background: 'rgba(229, 57, 53, 0.1)', borderColor: '#e53935' }}>
          <p style={{ color: '#e53935' }}>{error}</p>
        </div>
      )}

      {/* 搜索框 */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder={t('admin.searchPlaceholder') || 'Search by username, email, or user ID...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            fontSize: '14px'
          }}
        />
      </div>

      {/* 用户列表 */}
      <div className="card list-card">
        <h3>{t('admin.users') || 'Users'} ({filteredUsers.length})</h3>
        
        {filteredUsers.length === 0 ? (
          <p>{t('admin.noUsers') || 'No users found'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('admin.userId') || 'User ID'}</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('admin.username') || 'Username'}</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('admin.email') || 'Email'}</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('admin.plan') || 'Plan'}</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>{t('admin.credits') || 'Credits'}</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>{t('admin.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userProfile) => (
                  <tr key={userProfile.user_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace' }}>
                      {userProfile.user_id?.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '12px' }}>{userProfile.username || '—'}</td>
                    <td style={{ padding: '12px' }}>{userProfile.email || '—'}</td>
                    <td style={{ padding: '12px' }}>{userProfile.plan || 'basic'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                      {userProfile.credits_remaining ?? 0}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEditUser(userProfile)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--background-light)',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {t('admin.edit') || 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 编辑用户对话框 */}
      {editingUser && (
        <div className="card" style={{ marginTop: '16px', background: 'rgba(255, 165, 0, 0.05)' }}>
          <h3>{t('admin.editUser') || 'Edit User'}</h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              {t('admin.userId') || 'User ID'}
            </label>
            <input
              type="text"
              value={editingUser.user_id}
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--background-light)',
                opacity: 0.6
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              {t('admin.credits') || 'Credits'}
            </label>
            <input
              type="number"
              value={editCredits}
              onChange={(e) => setEditCredits(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--background-light)'
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              {t('admin.plan') || 'Plan'}
            </label>
            <select
              value={editPlan}
              onChange={(e) => setEditPlan(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--background-light)'
              }}
            >
              <option value="basic">{t('pricing.basic') || 'Basic'}</option>
              <option value="professional">{t('pricing.professional') || 'Professional'}</option>
              <option value="enterprise">{t('pricing.enterprise') || 'Enterprise'}</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSaveUser}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#0f9d58',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {t('admin.save') || 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--background-light)',
                cursor: 'pointer'
              }}
            >
              {t('admin.cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* 刷新按钮 */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={loadUsers}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'var(--background-light)',
            cursor: 'pointer'
          }}
        >
          {t('admin.refresh') || 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default Admin;

