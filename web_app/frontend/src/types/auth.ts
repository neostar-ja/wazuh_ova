export type UserRole = 'superadmin' | 'admin' | 'analyst' | 'viewer';

export interface User {
  id?: number | string;
  username: string;
  name?: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
}

export interface LoginRequest {
  username: string;
  password?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  user: User;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}
