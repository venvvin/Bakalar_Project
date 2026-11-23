import axios from 'axios';
import { tokenStore } from '../auth/AuthContext';

export const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});
