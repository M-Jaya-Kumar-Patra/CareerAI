/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const response = await api.get('/auth/me');
        if (mounted) setUser(response.data.data.user);
      } catch (error) {
        if (error.code === 'AUTH_REQUIRED' || error.code === 'SESSION_EXPIRED') {
          try {
            const refreshed = await api.post('/auth/refresh');
            if (mounted) setUser(refreshed.data.data.user);
          } catch {
            if (mounted) setUser(null);
          }
        }
      } finally {
        if (mounted) setStatus('ready');
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };
  const updateProfile = async (profile) => {
    const response = await api.patch('/auth/me', profile);
    setUser(response.data.data.user);
    return response.data.data.user;
  };
  const value = useMemo(() => ({ user, status, logout, updateProfile }), [user, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
