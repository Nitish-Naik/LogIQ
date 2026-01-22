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
  apiKey?: string; // Only present on signup
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

// export interface LogEntry {
//   _id: string;
//   _creationTime: number;
//   level: string;
//   message: string;
//   timestamp: number;
//   app_name: string;
//   metadata: Record<string, unknown>;
//   userId: string;
// }

export interface LogEntry {
  _id: string;
  timestamp: number;
  level: "error" | "warning" | "info" | "debug";
  message: string;
  app_name: string;
  userId: string;
  organization: string;
  meta?: { [key: string]: unknown };
}


export interface GetLogsResponse {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
}

export interface GetAllLogsParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  organizationId?: string;
}

export interface GetAllLogsResponse {
  logs: LogEntry[];
  count: number;
  limit: number;
  offset: number;
}

export interface LogsCountResponse {
  total: number;
  timestamp: string;
}
export interface OrganizationDetailsResponse {
  name: string;
  // timestamp: string;
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
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    const result = await this.handleResponse<{ token: string; accessToken: string; refreshToken: string; user: User }>(response);
    
    // Update tokens
    const newAccessToken = result.accessToken || result.token;
    const newRefreshToken = result.refreshToken || result.token;
    
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
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

async getAllLogs(params?: GetAllLogsParams): Promise<GetAllLogsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.orderBy) queryParams.append('orderBy', params.orderBy);
  if (params?.organizationId) queryParams.append('organizationId', params.organizationId);

  const url = `${API_ENDPOINTS.LOGS.GET_ALL_LOGS}?${queryParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...this.getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  return this.handleResponse<GetAllLogsResponse>(response);
}


  async getLogsCount(params?: GetAllLogsParams): Promise<LogsCountResponse> {
    const queryParams = new URLSearchParams();
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId.toString());
    const url = `${API_ENDPOINTS.LOGS.GET_LOGS_COUNT}?${queryParams.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<LogsCountResponse>(response);
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

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string; resetLink?: string }> {
    const response = await fetch(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    return this.handleResponse<{ message: string; resetToken?: string; resetLink?: string }>(response);
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; email: string; message: string }> {
    const response = await fetch(API_ENDPOINTS.AUTH.VERIFY_RESET_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    return this.handleResponse<{ valid: boolean; email: string; message: string }>(response);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async getOrgDetails(): Promise<OrganizationDetailsResponse> {
    const response = await fetch(API_ENDPOINTS.ORGANIZATION.GET_DETAILS, {
      method: 'GET', 
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json',
      }
    });
    
    return this.handleResponse<OrganizationDetailsResponse>(response);
  }
}

export const apiService = new ApiService();
export default apiService;