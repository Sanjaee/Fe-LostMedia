export interface Profile {
  id: string;
  user_id: string;
  bio?: string;
  cover_photo?: string;
  website?: string;
  location?: string;
  city?: string;
  country?: string;
  hometown?: string;
  education?: string;
  work?: string;
  relationship_status?: string;
  intro?: string;
  is_profile_public: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    username?: string;
    profile_photo?: string;
    user_type?: string;
    role?: string;
  };
}

export interface CreateProfileRequest {
  bio?: string;
  cover_photo?: string;
  website?: string;
  location?: string;
  city?: string;
  country?: string;
  hometown?: string;
  education?: string;
  work?: string;
  relationship_status?: string;
  intro?: string;
  is_profile_public?: boolean;
}

export interface UpdateProfileRequest {
  bio?: string;
  cover_photo?: string;
  website?: string;
  location?: string;
  city?: string;
  country?: string;
  hometown?: string;
  education?: string;
  work?: string;
  relationship_status?: string;
  intro?: string;
  is_profile_public?: boolean;
}

export interface ProfileResponse {
  profile: Profile;
}

export interface ProfileListResponse {
  profiles: Profile[];
}
