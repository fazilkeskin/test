import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/giris') {
      localStorage.removeItem('token');
      localStorage.removeItem('kullanici');
      window.location.href = '/giris';
    }
    return Promise.reject(err);
  }
);

export const hataMesaji = (err) =>
  err.response?.data?.hata || 'Beklenmeyen bir hata oluştu.';
