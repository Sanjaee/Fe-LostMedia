export interface Like {
  id: string;
  user_id: string;
  target_type: "post" | "comment";
  target_id: string;
  reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry";
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    username?: string;
    profile_photo?: string;
  };
}

export interface LikePostRequest {
  reaction?: "like" | "love" | "haha" | "wow" | "sad" | "angry";
}

export interface LikeCommentRequest {
  reaction?: "like" | "love" | "haha" | "wow" | "sad" | "angry";
}

export interface LikeResponse {
  message: string;
  data?: {
    like?: Like;
    likes?: Like[];
    total?: number;
    count?: number;
    limit?: number;
    offset?: number;
  };
  like?: Like;
  likes?: Like[];
  total?: number;
  count?: number;
  limit?: number;
  offset?: number;
}
