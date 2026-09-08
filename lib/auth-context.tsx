'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AUTH_UNAUTHORIZED_EVENT, type User } from './api';

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User | null) => void;
  signup: (token: string, user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;

  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const setSession = (newToken: string, newUser: User | null) => {
    localStorage.setItem('token', newToken);
    if (newUser) localStorage.setItem('user', JSON.stringify(newUser));
    else localStorage.removeItem('user');
    setToken(newToken);
    setUser(newUser);
  };

  const login = (newToken: string, newUser: User | null) => setSession(newToken, newUser);
  const signup = (newToken: string, newUser: User | null) => setSession(newToken, newUser);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
  });

  return (
    <AuthContext.Provider value={{ token, user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
