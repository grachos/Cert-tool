import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
  const selectedUocId = localStorage.getItem('ctc_selected_uoc_id');
  if (selectedUocId && selectedUocId !== 'all') {
    config.params = { ...(config.params || {}), uocId: config.params?.uocId || selectedUocId };
    if (config.data && !(config.data instanceof FormData) && typeof config.data === 'object') {
      config.data = { ...config.data, uocId: config.data.uocId || selectedUocId };
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
