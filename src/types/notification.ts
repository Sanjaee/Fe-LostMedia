export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string;
  type: string; // "friend_request", "friend_accepted", "friend_rejected", "friend_removed"
  content: string;
  target_id?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name: string;
    username?: string;
    profile_photo?: string;
  };
}

export interface NotificationResponse {
  message: string;
  data?: {
    notifications: Notification[];
    limit?: number;
    offset?: number;
    total?: number;
  };
  notifications?: Notification[];
  limit?: number;
  offset?: number;
  total?: number;
}

export interface UnreadCountResponse {
  message: string;
  data?: {
    count: number;
  };
  count?: number;
}
