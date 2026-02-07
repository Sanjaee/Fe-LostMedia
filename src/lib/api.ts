// API client for authentication and profile
import type {
  RegisterRequest,
  LoginRequest,
  OTPVerifyRequest,
  ResendOTPRequest,
  ResetPasswordRequest,
  VerifyResetPasswordRequest,
  RegisterResponse,
  AuthResponse,
  OTPVerifyResponse,
  ResendOTPResponse,
  ResetPasswordResponse,
  VerifyResetPasswordResponse,
  GoogleOAuthRequest,
} from "@/types/auth";
import type {
  Profile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileResponse,
} from "@/types/profile";
import type {
  Notification,
  NotificationResponse,
  UnreadCountResponse,
} from "@/types/notification";
import type {
  Friendship,
  FriendshipResponse,
  SendFriendRequestRequest,
} from "@/types/friendship";
import type { User, UserSearchResponse } from "@/types/user";
import type {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  PostResponse,
} from "@/types/post";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentResponse,
} from "@/types/comment";
import type {
  Like,
  LikePostRequest,
  LikeCommentRequest,
  LikeResponse,
} from "@/types/like";
import type { ChatMessage } from "@/types/chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.194.248:5000";

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Set access token for authenticated requests
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  // Get current access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Handle token refresh when 401 occurs
  private async handleTokenRefresh(): Promise<boolean> {
    try {
      // Try to get refresh token from localStorage
      const refreshToken = TokenManager.getRefreshToken();
      
      if (!refreshToken) {
        // NextAuth will handle token refresh automatically in the JWT callback
        // We just need to wait for the session to update
        return false;
      }

      // Temporarily clear access token to avoid using expired token
      const oldToken = this.accessToken;
      this.setAccessToken(null);

      try {
        const response = await this.refreshToken(refreshToken);
        if (response.access_token) {
          this.setAccessToken(response.access_token);
          TokenManager.setTokens(response.access_token, response.refresh_token);
          return true;
        }
        return false;
      } catch (refreshError) {
        // Restore old token if refresh fails (though it's expired)
        this.setAccessToken(oldToken);
        throw refreshError;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Clear tokens on refresh failure
      TokenManager.clearTokens();
      this.setAccessToken(null);
      // Optionally redirect to login page
      if (typeof window !== "undefined") {
        // Only redirect if we're not already on an auth page
        if (!window.location.pathname.startsWith("/auth")) {
          // Token expired, user will be redirected to login
        }
      }
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Ensure we have the latest token (fallback to localStorage if needed)
    if (!this.accessToken && typeof window !== "undefined") {
      const storedToken = TokenManager.getAccessToken();
      if (storedToken) {
        this.accessToken = storedToken;
      }
    }

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Add Authorization header if access token is available
    if (this.accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.accessToken}`,
      };
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired, try to refresh
        if (response.status === 401) {
          const refreshed = await this.handleTokenRefresh();
          if (refreshed) {
            // Retry the request with new token
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${this.accessToken}`,
            };
            const retryResponse = await fetch(url, config);
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              return retryData.data || retryData;
            }
          }
        }

        const errorData = await response.json().catch(() => ({}));

        // Extract error message from nested error object if present
        let errorMessage =
          errorData.message ||
          errorData.error?.message ||
          (typeof errorData.error === "string" ? errorData.error : null) ||
          `HTTP ${response.status}: ${response.statusText}`;

        // Handle data wrapper if present
        if (errorData.data && typeof errorData.data === "object") {
          errorMessage =
            errorData.data.message ||
            errorData.data.error?.message ||
            errorMessage;
        }

        // Ensure we have a string message, not an object
        if (typeof errorMessage !== "string") {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Intercept ban response — dispatch global event so BanDialog can catch it
        if (
          response.status === 403 &&
          errorData.is_banned === true &&
          errorData.banned_until
        ) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("user-banned", {
                detail: {
                  banned_until: errorData.banned_until,
                  ban_reason: errorData.ban_reason || "Melanggar ketentuan layanan",
                },
              })
            );
          }
        }

        // Create error with response data preserved
        const error = new Error(errorMessage) as Error & {
          response?: {
            status: number;
            data: unknown;
          };
        };

        error.response = {
          status: response.status,
          data: errorData,
        };

        throw error;
      }

      const data = await response.json();

      // Unwrap data if response is wrapped in { data: ... }
      if (data.data) {
        return data.data;
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Authentication endpoints
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async verifyOTP(data: OTPVerifyRequest): Promise<OTPVerifyResponse> {
    return this.request<OTPVerifyResponse>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resendOTP(data: ResendOTPRequest): Promise<ResendOTPResponse> {
    return this.request<ResendOTPResponse>("/api/v1/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async googleOAuth(data: GoogleOAuthRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/v1/auth/google-oauth", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Refresh token endpoint doesn't need Authorization header
    const url = `${this.baseURL}/api/v1/auth/refresh-token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to refresh token");
    }

    const data = await response.json();
    return data.data || data;
  }

  async requestResetPassword(
    data: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    return this.request<ResetPasswordResponse>(
      "/api/v1/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async verifyResetPassword(
    data: VerifyResetPasswordRequest
  ): Promise<VerifyResetPasswordResponse> {
    return this.request<VerifyResetPasswordResponse>(
      "/api/v1/auth/verify-reset-password",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async resetPassword(data: {
    token: string;
    newPassword: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: data.token, newPassword: data.newPassword }),
    });
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async deleteAccount(password?: string): Promise<void> {
    return this.request<void>("/api/v1/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ password: password || "" }),
    });
  }

  async getMe(): Promise<{ user: { id: string; email: string; full_name: string; login_type?: string; is_banned?: boolean; banned_until?: string; ban_reason?: string } }> {
    return this.request<{ user: { id: string; email: string; full_name: string; login_type?: string; is_banned?: boolean; banned_until?: string; ban_reason?: string } }>(
      "/api/v1/auth/me",
      { method: "GET" }
    );
  }

  // Profile endpoints
  async createProfile(data: CreateProfileRequest): Promise<ProfileResponse> {
    return this.request<ProfileResponse>("/api/v1/profiles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProfile(profileId: string): Promise<ProfileResponse> {
    return this.request<ProfileResponse>(`/api/v1/profiles/${profileId}`, {
      method: "GET",
    });
  }

  async getProfileByUserId(userId: string): Promise<ProfileResponse> {
    return this.request<ProfileResponse>(`/api/v1/profiles/user/${userId}`, {
      method: "GET",
    });
  }

  async getMyProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>("/api/v1/profiles/me", {
      method: "GET",
    });
  }

  async updateProfile(
    profileId: string,
    data: UpdateProfileRequest
  ): Promise<ProfileResponse> {
    return this.request<ProfileResponse>(`/api/v1/profiles/${profileId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProfile(profileId: string): Promise<void> {
    return this.request<void>(`/api/v1/profiles/${profileId}`, {
      method: "DELETE",
    });
  }

  // User search endpoints
  async searchUsers(
    keyword: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<UserSearchResponse> {
    return this.request<UserSearchResponse>(
      `/api/v1/users/search?q=${encodeURIComponent(keyword)}&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  // Notification endpoints
  async getNotifications(
    limit: number = 20,
    offset: number = 0
  ): Promise<NotificationResponse> {
    return this.request<NotificationResponse>(
      `/api/v1/notifications?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  async getUnreadNotifications(): Promise<NotificationResponse> {
    return this.request<NotificationResponse>("/api/v1/notifications/unread", {
      method: "GET",
    });
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    return this.request<UnreadCountResponse>(
      "/api/v1/notifications/unread/count",
      {
        method: "GET",
      }
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    return this.request<void>(`/api/v1/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return this.request<void>("/api/v1/notifications/read-all", {
      method: "PUT",
    });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return this.request<void>(`/api/v1/notifications/${notificationId}`, {
      method: "DELETE",
    });
  }

  // Friendship endpoints
  async sendFriendRequest(
    data: SendFriendRequestRequest
  ): Promise<FriendshipResponse> {
    return this.request<FriendshipResponse>("/api/v1/friendships/request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getFriendships(): Promise<FriendshipResponse> {
    return this.request<FriendshipResponse>("/api/v1/friendships", {
      method: "GET",
    });
  }

  async getPendingRequests(): Promise<FriendshipResponse> {
    return this.request<FriendshipResponse>("/api/v1/friendships/pending", {
      method: "GET",
    });
  }

  async getFriends(): Promise<FriendshipResponse> {
    return this.request<FriendshipResponse>("/api/v1/friendships/friends", {
      method: "GET",
    });
  }

  async getFriendshipStatus(targetUserID: string): Promise<FriendshipResponse> {
    return this.request<FriendshipResponse>(
      `/api/v1/friendships/status/${targetUserID}`,
      {
        method: "GET",
      }
    );
  }

  async getFriendsCount(userID: string): Promise<{ followers: number; following: number }> {
    return this.request<{ followers: number; following: number }>(
      `/api/v1/friendships/count/${userID}`,
      {
        method: "GET",
      }
    );
  }

  async acceptFriendRequest(friendshipID: string): Promise<FriendshipResponse> {
    return this.request<FriendshipResponse>(
      `/api/v1/friendships/${friendshipID}/accept`,
      {
        method: "POST",
      }
    );
  }

  async rejectFriendRequest(friendshipID: string): Promise<FriendshipResponse> {
    return this.request<FriendshipResponse>(
      `/api/v1/friendships/${friendshipID}/reject`,
      {
        method: "POST",
      }
    );
  }

  async removeFriend(friendshipID: string): Promise<void> {
    return this.request<void>(`/api/v1/friendships/${friendshipID}`, {
      method: "DELETE",
    });
  }

  // Chat endpoints
  async sendChatMessage(receiverId: string, content: string): Promise<{ message: ChatMessage }> {
    return this.request<{ message: ChatMessage }>("/api/v1/chat/messages", {
      method: "POST",
      body: JSON.stringify({ receiver_id: receiverId, content }),
    });
  }

  async getChatConversation(
    withUserId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: ChatMessage[] }> {
    return this.request<{ messages: ChatMessage[] }>(
      `/api/v1/chat/messages?with_user_id=${encodeURIComponent(withUserId)}&limit=${limit}&offset=${offset}`,
      { method: "GET" }
    );
  }

  async markChatAsRead(senderId: string): Promise<void> {
    return this.request<void>(`/api/v1/chat/read/${senderId}`, {
      method: "PUT",
    });
  }

  async getChatUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>("/api/v1/chat/unread/count", {
      method: "GET",
    });
  }

  async getChatUnreadBySenders(): Promise<{ counts: Record<string, number> }> {
    return this.request<{ counts: Record<string, number> }>("/api/v1/chat/unread/by-senders", {
      method: "GET",
    });
  }

  // Post endpoints
  async createPost(data: CreatePostRequest): Promise<PostResponse> {
    const cleanData: Record<string, any> = {};
    
    // Content - only include if not empty
    if (data.content?.trim()) {
      cleanData.content = data.content.trim();
    }
    
    // Image URLs - only send if there are valid URLs
    if (data.image_urls?.length) {
      const validUrls = data.image_urls.filter(url => url?.trim());
      if (validUrls.length > 0) {
        cleanData.image_urls = validUrls;
      }
    }
    
    // Optional fields
    if (data.shared_post_id) cleanData.shared_post_id = data.shared_post_id;
    if (data.group_id) cleanData.group_id = data.group_id;
    if (data.is_pinned !== undefined) cleanData.is_pinned = data.is_pinned;
    
    if (data.tags?.length) {
      const validTags = data.tags.filter(tag => tag?.trim());
      if (validTags.length > 0) {
        cleanData.tags = validTags;
      }
    }
    
    if (data.location) {
      const location: any = {};
      if (data.location.place_name) location.place_name = data.location.place_name;
      if (data.location.latitude != null) location.latitude = Number(data.location.latitude);
      if (data.location.longitude != null) location.longitude = Number(data.location.longitude);
      if (Object.keys(location).length > 0) {
        cleanData.location = location;
      }
    }

    return this.request<PostResponse>("/api/v1/posts", {
      method: "POST",
      body: JSON.stringify(cleanData),
    });
  }

  // Create post with image uploads (async)
  async createPostWithImages(
    content: string | undefined,
    imageFiles: File[],
    groupId?: string
  ): Promise<PostResponse> {
    const formData = new FormData();
    
    if (content?.trim()) {
      formData.append("content", content.trim());
    }
    
    if (groupId) {
      formData.append("group_id", groupId);
    }

    // Append image files
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    const url = `${this.baseURL}/api/v1/posts/upload`;

    // Ensure we have the latest token
    if (!this.accessToken && typeof window !== "undefined") {
      const storedToken = TokenManager.getAccessToken();
      if (storedToken) {
        this.accessToken = storedToken;
      }
    }

    const config: RequestInit = {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await this.handleTokenRefresh();
        if (refreshed) {
          // Retry with new token
          if (this.accessToken) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${this.accessToken}`,
            };
          }
          const retryResponse = await fetch(url, config);
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || "Request failed");
          }
          return retryResponse.json();
        }
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Request failed");
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error");
    }
  }

  async getPost(postID: string): Promise<PostResponse> {
    return this.request<PostResponse>(`/api/v1/posts/${postID}`, {
      method: "GET",
    });
  }

  async getPostsByUserID(
    userID: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PostResponse> {
    return this.request<PostResponse>(
      `/api/v1/posts/user/${userID}?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  async getFeed(
    limit: number = 20,
    offset: number = 0,
    sort: "newest" | "popular" = "newest"
  ): Promise<PostResponse> {
    return this.request<PostResponse>(
      `/api/v1/posts/feed?limit=${limit}&offset=${offset}&sort=${sort}`,
      {
        method: "GET",
      }
    );
  }

  async searchPosts(
    keyword: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PostResponse> {
    return this.request<PostResponse>(
      `/api/v1/posts/search?q=${encodeURIComponent(keyword)}&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  // Admin APIs
  async getAllUsers(limit: number = 50, offset: number = 0): Promise<{
    users: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.request(
      `/api/v1/admin/users?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  async getUserStats(): Promise<{
    total: number;
    by_type: { owner: number; member: number };
    by_verification: { verified: number; unverified: number };
  }> {
    return this.request(`/api/v1/admin/stats`, {
      method: "GET",
    });
  }

  async banUser(userId: string, duration: number, reason?: string): Promise<{ user_id: string; banned_until: string; reason: string }> {
    return this.request(`/api/v1/admin/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ duration, reason: reason || "" }),
    });
  }

  async unbanUser(userId: string): Promise<void> {
    return this.request<void>(`/api/v1/admin/users/${userId}/unban`, {
      method: "POST",
    });
  }

  async updatePost(
    postID: string,
    data: UpdatePostRequest
  ): Promise<PostResponse> {
    return this.request<PostResponse>(`/api/v1/posts/${postID}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePost(postID: string): Promise<void> {
    return this.request<void>(`/api/v1/posts/${postID}`, {
      method: "DELETE",
    });
  }

  async trackPostView(postID: string): Promise<void> {
    return this.request<void>(`/api/v1/posts/${postID}/view`, {
      method: "POST",
    });
  }

  async getPostViewCount(postID: string): Promise<{ count: number }> {
    return this.request<{ count: number }>(`/api/v1/posts/${postID}/views/count`, {
      method: "GET",
    });
  }

  async countPostsByUserID(userID: string): Promise<{ count: number }> {
    return this.request<{ count: number }>(
      `/api/v1/posts/user/${userID}/count`,
      {
        method: "GET",
      }
    );
  }

  // Comment endpoints
  async createComment(data: CreateCommentRequest): Promise<CommentResponse> {
    return this.request<CommentResponse>("/api/v1/comments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getComment(commentID: string): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/api/v1/comments/${commentID}`, {
      method: "GET",
    });
  }

  async getCommentsByPostID(
    postID: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<CommentResponse> {
    return this.request<CommentResponse>(
      `/api/v1/posts/${postID}/comments?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  async getCommentCount(postID: string): Promise<{ count: number }> {
    return this.request<{ count: number }>(
      `/api/v1/posts/${postID}/comments/count`,
      {
        method: "GET",
      }
    );
  }

  async getReplies(
    commentID: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<CommentResponse> {
    return this.request<CommentResponse>(
      `/api/v1/comments/${commentID}/replies?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  async updateComment(
    commentID: string,
    data: UpdateCommentRequest
  ): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/api/v1/comments/${commentID}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteComment(commentID: string): Promise<void> {
    return this.request<void>(`/api/v1/comments/${commentID}`, {
      method: "DELETE",
    });
  }

  // Like endpoints
  async likePost(postID: string, data?: LikePostRequest): Promise<LikeResponse> {
    return this.request<LikeResponse>(`/api/v1/posts/${postID}/like`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  }

  async unlikePost(postID: string): Promise<void> {
    return this.request<void>(`/api/v1/posts/${postID}/like`, {
      method: "DELETE",
    });
  }

  async likeComment(
    commentID: string,
    data?: LikeCommentRequest
  ): Promise<LikeResponse> {
    return this.request<LikeResponse>(`/api/v1/comments/${commentID}/like`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  }

  async unlikeComment(commentID: string): Promise<void> {
    return this.request<void>(`/api/v1/comments/${commentID}/like`, {
      method: "DELETE",
    });
  }

  async getLikes(
    targetType: "post" | "comment",
    targetID: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<LikeResponse> {
    return this.request<LikeResponse>(
      `/api/v1/likes?target_type=${targetType}&target_id=${targetID}&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
      }
    );
  }

  async getLikeCount(
    targetType: "post" | "comment",
    targetID: string
  ): Promise<{ count: number }> {
    return this.request<{ count: number }>(
      `/api/v1/likes/count?target_type=${targetType}&target_id=${targetID}`,
      {
        method: "GET",
      }
    );
  }
}

// Create API client instance
export const api = new ApiClient(API_BASE_URL);

// Token management utilities
export class TokenManager {
  private static ACCESS_TOKEN_KEY = "access_token";
  private static REFRESH_TOKEN_KEY = "refresh_token";

  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static clearTokens(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await api.refreshToken(refreshToken);
      this.setTokens(response.access_token, response.refresh_token);
      return response.access_token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.clearTokens();
      return null;
    }
  }
}
