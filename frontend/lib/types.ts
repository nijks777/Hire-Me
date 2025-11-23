export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  email_verified?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user?: User;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}
