export interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected" | "blocked";
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name: string;
    username?: string;
    profile_photo?: string;
    user_type?: string;
    role?: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    username?: string;
    profile_photo?: string;
    user_type?: string;
    role?: string;
  };
}

export interface FriendshipResponse {
  message: string;
  data: {
    friendship?: Friendship;
    friendships?: Friendship[];
    friends?: Friendship[];
    requests?: Friendship[];
    status?: string;
  };
}

export interface SendFriendRequestRequest {
  receiver_id: string;
}
