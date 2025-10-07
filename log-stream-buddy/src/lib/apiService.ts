import { API_ENDPOINTS } from './apiConfig';

export interface User {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  organizationName: string;
}

export interface SigninRequest {
  email: string;
  password: string;
}


export interface GetLogsParams {
  userId: string;
  level?: string;
  appName?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogEntry {
  _id: string;
  _creationTime: number;
  level: string;
  message: string;
  timestamp: number;
  app_name: string;
  metadata: Record<string, unknown>;
  userId: string;
}

export interface GetLogsResponse {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
}


class ApiService {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await fetch(API_ENDPOINTS.AUTH.SIGNUP, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<AuthResponse>(response);
    
    // Store tokens
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    
    return result;
  }

  async signin(data: SigninRequest): Promise<AuthResponse> {
    const response = await fetch(API_ENDPOINTS.AUTH.SIGNIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<AuthResponse>(response);
    
    // Store tokens
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    
    return result;
  }

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await this.handleResponse<{ accessToken: string; refreshToken: string }>(response);
    
    // Update tokens
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    
    return result;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await fetch(API_ENDPOINTS.AUTH.ME, {
      method: 'GET',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<{ user: User }>(response);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async getLogs(params: GetLogsParams): Promise<GetLogsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', params.userId);
    if (params.level) queryParams.append('level', params.level);
    if (params.appName) queryParams.append('appName', params.appName);
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_ENDPOINTS.LOGS.GET_LOGS}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<GetLogsResponse>(response);
  }

  async createLog(log: {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    appName: string;
    userId?: string;
    organizationId?: string;
    meta?: Record<string, unknown>;
  }): Promise<{ status: string }> {
    const response = await fetch(API_ENDPOINTS.LOGS.CREATE_LOG, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    return this.handleResponse<{ status: string }>(response);
  }
}

export const apiService = new ApiService();
export default apiService;