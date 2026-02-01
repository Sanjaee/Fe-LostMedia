export interface User {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  profile_photo?: string;
  phone?: string;
  user_type: string;
  date_of_birth?: string;
  gender?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSearchResponse {
  message?: string;
  data?: {
    users: User[];
    limit: number;
    offset: number;
    total: number;
  };
  // After unwrap from api.ts, response structure is flattened
  users?: User[];
  limit?: number;
  offset?: number;
  total?: number;
}
