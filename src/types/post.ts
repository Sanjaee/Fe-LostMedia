export interface Post {
  id: string;
  user_id: string;
  group_id?: string;
  content?: string;
  image_urls?: string[]; // Array of image URLs
  video_urls?: string[]; // Array of video URLs
  shared_post_id?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  likes_count?: number; // Count from backend
  comments_count?: number; // Count from backend
  user_liked?: boolean; // Whether current user liked this post
  user?: {
    id: string;
    full_name: string;
    username?: string;
    profile_photo?: string;
    role?: string; // owner, admin, mod, mvp, god, vip, member
    user_type?: string; // fallback from backend (owner, member)
  };
  group?: {
    id: string;
    name: string;
    slug?: string;
  };
  shared_post?: Post;
  tags?: Array<{
    id: string;
    tagged_user_id: string;
    tagged_user?: {
      id: string;
      full_name: string;
      profile_photo?: string;
    };
  }>;
  location?: {
    id: string;
    place_name?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface CreatePostRequest {
  content?: string;
  image_urls?: string[]; // Array of image URLs
  video_urls?: string[]; // Array of video URLs (manual or from upload)
  shared_post_id?: string;
  group_id?: string;
  is_pinned?: boolean;
  tags?: string[]; // Array of user IDs to tag
  location?: {
    place_name?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface UpdatePostRequest {
  content?: string;
  image_urls?: string[]; // Array of image URLs
  video_urls?: string[]; // Array of video URLs
  is_pinned?: boolean;
}

export interface PostResponse {
  message: string;
  data?: {
    post?: Post;
    posts?: Post[];
    limit?: number;
    offset?: number;
    count?: number;
  };
  post?: Post;
  posts?: Post[];
  limit?: number;
  offset?: number;
  count?: number;
}
