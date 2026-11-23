import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';

export type User = { id: number; email: string; full_name: string; role: 'TEACHER' | 'STUDENT'; email_verified: boolean };
type AuthValue = { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; refresh: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);
export const tokenStore = {
  get: () => localStorage.getItem('bakalar_access_token'),
  set: (token: string) => localStorage.setItem('bakalar_access_token', token),
  clear: () => localStorage.removeItem('bakalar_access_token'),
};
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    const token = tokenStore.get();
    if (!token) { setUser(null); return; }
    try {
      const { data } = await axios.get<User>('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      setUser(data);
    } catch { tokenStore.clear(); setUser(null); }
  }
  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);
  async function login(email: string, password: string) {
    const { data } = await axios.post<{ access_token: string }>('/api/auth/login', { email, password });
    tokenStore.set(data.access_token);
    try {
      const response = await axios.get<User>('/api/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
      setUser(response.data);
    } catch (err) { tokenStore.clear(); throw err; }
  }
  function logout() { tokenStore.clear(); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be inside AuthProvider');
  return context;
}
