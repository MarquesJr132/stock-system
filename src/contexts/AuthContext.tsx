import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (email: string, password: string, name: string, role?: 'admin' | 'user') => boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  console.log("AuthProvider rendering with user:", user);

  useEffect(() => {
    // Verificar se há usuário logado no localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Criar admin padrão se não existir
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: '1',
        email: 'admin@admin.com',
        name: 'Administrador',
        role: 'admin',
        createdAt: new Date()
      };
      
      const defaultUsers = [defaultAdmin];
      const defaultPasswords = { 'admin@admin.com': 'admin123' };
      
      localStorage.setItem('users', JSON.stringify(defaultUsers));
      localStorage.setItem('passwords', JSON.stringify(defaultPasswords));
    }
  }, []);

  const login = (email: string, password: string): boolean => {
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const passwords: Record<string, string> = JSON.parse(localStorage.getItem('passwords') || '{}');
    
    const foundUser = users.find(u => u.email === email);
    
    if (foundUser && passwords[email] === password) {
      setUser(foundUser);
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const register = (email: string, password: string, name: string, role: 'admin' | 'user' = 'user'): boolean => {
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const passwords: Record<string, string> = JSON.parse(localStorage.getItem('passwords') || '{}');
    
    // Verificar se email já existe
    if (users.some(u => u.email === email)) {
      return false;
    }
    
    const newUser: User = {
      id: (users.length + 1).toString(),
      email,
      name,
      role,
      createdAt: new Date()
    };
    
    const updatedUsers = [...users, newUser];
    const updatedPasswords = { ...passwords, [email]: password };
    
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    localStorage.setItem('passwords', JSON.stringify(updatedPasswords));
    
    return true;
  };

  const value = {
    user,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};