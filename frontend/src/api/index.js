import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:4000/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:    data => api.post('/auth/login', data),
  register: data => api.post('/auth/register', data),
};

export const scanAPI = {
  startSession: type  => api.post('/scan/start-session', { type }),
  endSession:   id    => api.post(`/scan/end-session/${id}`),
  scanFile:     data  => api.post('/scan/file', data),
  scanUsb:      drive => api.post('/scan/usb', { drive }),
  getThreats:   ()    => api.get('/scan/threats'),
  getStats:     ()    => api.get('/scan/stats'),
};

export const userAPI = {
  getMyStats:  () => api.get('/users/stats/me'),
  getAllStats:  () => api.get('/users/stats'),
};

export default api;