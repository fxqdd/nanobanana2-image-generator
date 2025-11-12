// 模拟数据库文件，用于存储用户信息

// 加密函数 - 在实际项目中应使用更强的加密库如bcrypt
const hashPassword = (password) => {
  // 简单的哈希模拟，实际项目中应使用专业加密库
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return hash.toString(16);
};

// 初始用户数据
const initialUsers = [
  {
    id: '1',
    name: '测试用户',
    email: 'test@example.com',
    passwordHash: hashPassword('password123'), // 密码: password123
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: '管理员',
    email: 'admin@example.com',
    passwordHash: hashPassword('admin123'), // 密码: admin123
    createdAt: new Date().toISOString()
  }
];

// 从localStorage获取用户数据或使用初始数据
const getUsers = () => {
  const storedUsers = localStorage.getItem('mockUsers');
  return storedUsers ? JSON.parse(storedUsers) : initialUsers;
};

// 保存用户数据到localStorage
const saveUsers = (users) => {
  localStorage.setItem('mockUsers', JSON.stringify(users));
};

// 模拟数据库操作
const mockDatabase = {
  // 通过邮箱查找用户
  findUserByEmail: (email) => {
    const users = getUsers();
    return users.find(user => user.email === email);
  },
  
  // 通过ID查找用户
  findUserById: (id) => {
    const users = getUsers();
    return users.find(user => user.id === id);
  },
  
  // 创建新用户
  createUser: (userData) => {
    const users = getUsers();
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      passwordHash: hashPassword(userData.password),
      createdAt: new Date().toISOString()
    };
    
    // 删除明文密码
    delete newUser.password;
    
    users.push(newUser);
    saveUsers(users);
    return newUser;
  },
  
  // 验证用户密码
  validatePassword: (user, password) => {
    return user.passwordHash === hashPassword(password);
  },
  
  // 更新用户信息
  updateUser: (userId, updates) => {
    const users = getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) return null;
    
    // 如果更新包含密码，进行哈希处理
    if (updates.password) {
      updates.passwordHash = hashPassword(updates.password);
      delete updates.password;
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    saveUsers(users);
    return users[userIndex];
  },
  
  // 获取所有用户（实际项目中应有限制）
  getAllUsers: () => {
    return getUsers();
  }
};

export { mockDatabase, hashPassword };