'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearAuth,
  getMe,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* On mount — restore user from localStorage and verify the token */
  useEffect(() => {
    const stored = getStoredUser();
    const token = getToken();

    if (stored && token) {
      setUser(stored);
      getMe()
        .then((data) => {
          setUser(data.user);
          setStoredUser(data.user);
        })
        .catch(() => {
          clearAuth();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = useCallback((userData, token) => {
    setToken(token);
    setStoredUser(userData);
    setUser(userData);
  }, []);

  const logoutUser = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
