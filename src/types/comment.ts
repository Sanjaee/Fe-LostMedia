export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  media_url?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    username?: string;
    profile_photo?: string;
  };
  parent?: Comment;
  replies?: Comment[];
  likes?: Like[];
  like_count?: number;
}

export interface CreateCommentRequest {
  post_id: string;
  parent_id?: string;
  content: string;
  media_url?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentResponse {
  message: string;
  data?: {
    comment?: Comment;
    comments?: Comment[];
    total?: number;
    limit?: number;
    offset?: number;
  };
  comment?: Comment;
  comments?: Comment[];
  total?: number;
  limit?: number;
  offset?: number;
}
