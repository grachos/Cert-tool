import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Backend local URL
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para inyectar el token JWT en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cert_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
