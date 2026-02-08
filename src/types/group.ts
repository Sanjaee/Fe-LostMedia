import type { User } from "./user";

export interface Group {
  id: string;
  created_by: string;
  name: string;
  slug: string;
  description?: string;
  cover_photo?: string;
  icon?: string;
  privacy: "open" | "closed" | "secret";
  membership_policy: "anyone_can_join" | "approval_required";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator?: User;
  members_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "moderator" | "member";
  status: "active" | "pending" | "banned";
  created_at: string;
  updated_at: string;
  user?: User;
  group?: Group;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  cover_photo?: string;
  icon?: string;
  privacy?: "open" | "closed" | "secret";
  membership_policy?: "anyone_can_join" | "approval_required";
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  cover_photo?: string;
  icon?: string;
  privacy?: "open" | "closed" | "secret";
  membership_policy?: "anyone_can_join" | "approval_required";
}

export interface GroupResponse {
  group: Group;
  is_member: boolean;
  member_role: string;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
  limit: number;
  offset: number;
}

export interface GroupMemberListResponse {
  members: GroupMember[];
  total: number;
  limit: number;
  offset: number;
}
