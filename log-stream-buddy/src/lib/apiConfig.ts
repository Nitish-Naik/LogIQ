// API Configuration
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3003';
const LOGS_API_URL = import.meta.env.VITE_LOGS_API_URL || 'http://localhost:3004';

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: `${AUTH_API_URL}/api/auth/signup`,
    SIGNIN: `${AUTH_API_URL}/api/auth/signin`,
    REFRESH_TOKEN: `${AUTH_API_URL}/api/auth/refresh-token`,
    ME: `${AUTH_API_URL}/api/auth/me`,
  },
  LOGS: {
    GET_LOGS: `${LOGS_API_URL}/api/logs`,
    GET_STATS: `${LOGS_API_URL}/api/logs/stats`,
    CREATE_LOG: `http://localhost:4000/logs`, // Collector service
  },
};

export default AUTH_API_URL;
