import React, { createContext, useState, useEffect } from 'react';
import auth from './utils/auth';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const cur = auth.getCurrentUser();
    setUser(cur);
  }, []);

  const register = async (email, password) => {
    await auth.register(email, password);
    setUser(email);
  };

  const login = async (email, password) => {
    await auth.login(email, password);
    setUser(email);
  };

  const logout = () => {
    auth.logout();
    setUser(null);
  };

  const getUserPortfolio = () => {
    if (!user) return [];
    return auth.getUserData(user, 'portfolio') || [];
  };

  const setUserPortfolio = (portfolio) => {
    if (!user) return;
    auth.setUserData(user, 'portfolio', portfolio);
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout, getUserPortfolio, setUserPortfolio }}>
      {children}
    </AuthContext.Provider>
  );
}
