import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('library_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('library_token', token);
    localStorage.setItem('library_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user } = await api.register(payload);
    localStorage.setItem('library_token', token);
    localStorage.setItem('library_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('library_token');
    localStorage.removeItem('library_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
