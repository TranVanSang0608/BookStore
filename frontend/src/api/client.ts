import axios from 'axios'

// Axios instance dùng chung — MỌI request API đều đi qua đây.
// Phase 1 sẽ thêm interceptor tự gắn JWT từ localStorage vào header Authorization.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 10_000,
})
