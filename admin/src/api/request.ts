import axios from 'axios';
import { ElMessage } from 'element-plus';

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (res) => {
    const body = res.data;
    // 仅当 code 为数字且非 0 时视为业务错误
    if (body && typeof body === 'object' && typeof body.code === 'number' && body.code !== 0) {
      ElMessage.error(body.message || '请求失败');
      if (body.code === 1001 || body.code === 1002) {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
      }
      return Promise.reject(new Error(body.message));
    }
    return body;
  },
  (err) => {
    ElMessage.error(err.response?.data?.message || err.message || '网络错误');
    return Promise.reject(err);
  }
);

export default request;
