import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { ProfileLayout } from "@/components/profile/organisms/ProfileLayout";
import { Profile } from "@/types/profile";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string>("none");
  const [friendsCount, setFriendsCount] = useState({ followers: 0, following: 0 });

  // Always load friendship status from DB, never from WebSocket/realtime
  const loadFriendshipStatus = useCallback(async (targetUserId: string) => {
    try {
      // Fetch fresh data from DB
      // API client unwraps response.data, so we get { status: "accepted" | "pending" | "none" }
      const response = await api.getFriendshipStatus(targetUserId) as any;
      // Response structure: { status: "accepted" | "pending" | "none" } (after unwrap)
      const status = response?.status || response?.data?.status || "none";
      setFriendshipStatus(status);
    } catch {
      // If no friendship exists, status is "none"
      setFriendshipStatus("none");
    }
  }, [api]);

  const loadFriendsCount = useCallback(async (userId: string) => {
    try {
      const response = await api.getFriendsCount(userId);
      setFriendsCount({
        followers: response.followers || 0,
        following: response.following || 0,
      });
    } catch {
      // Ignore error, keep default 0
      console.error("Failed to load friends count");
    }
  }, [api]);

  const loadProfile = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get profile by user ID first (since posts use user_id)
      // If that fails, try to get by profile ID
      let response;
      try {
        response = await api.getProfileByUserId(id);
      } catch (userErr: any) {
        // If getProfileByUserId fails, try getProfile (in case it's a profile_id)
        try {
          response = await api.getProfile(id);
        } catch {
          // Both failed, throw the original error
          throw userErr;
        }
      }
      
      setProfile(response.profile);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load profile";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProfile(id);
    }
  }, [id, loadProfile]);

  useEffect(() => {
    if (profile?.user_id) {
      if (session?.user?.id && profile.user_id !== session.user.id) {
        loadFriendshipStatus(profile.user_id);
      }
      loadFriendsCount(profile.user_id);
    }
  }, [profile?.user_id, session?.user?.id, loadFriendshipStatus, loadFriendsCount]);

  // Listen for friendship changes - always refresh from DB when triggered
  // WebSocket only triggers the refresh, never provides the status data
  useEffect(() => {
    const handleFriendshipChange = () => {
      if (profile?.user_id) {
        // Always fetch fresh data from DB, not from WebSocket
        if (session?.user?.id && profile.user_id !== session.user.id) {
          loadFriendshipStatus(profile.user_id);
        }
        loadFriendsCount(profile.user_id);
      }
    };

    // Listen to custom event for friendship changes (triggered by WebSocket notification or user action)
    window.addEventListener('friendship-changed', handleFriendshipChange);
    return () => window.removeEventListener('friendship-changed', handleFriendshipChange);
  }, [profile?.user_id, session?.user?.id, loadFriendshipStatus, loadFriendsCount]);

  const handleAddFriend = async () => {
    if (!profile?.user_id) return;
    
    // Don't allow adding friend if already friends or pending
    if (friendshipStatus === "accepted" || friendshipStatus === "pending") {
      return;
    }
    
    try {
      await api.sendFriendRequest({ receiver_id: profile.user_id });
      toast({
        title: "Success",
        description: "Permintaan pertemanan telah dikirim",
      });
      // Reload friendship status and count from DB
      await loadFriendshipStatus(profile.user_id);
      await loadFriendsCount(profile.user_id);
    } catch (err: any) {
      const errorMessage = err.message || "Gagal mengirim permintaan pertemanan";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // If error is "already friends", refresh status from DB
      if (errorMessage.includes("already friends") || errorMessage.includes("already accepted")) {
        await loadFriendshipStatus(profile.user_id);
      }
    }
  };

  // Check if this is own profile
  const isOwnProfile = session?.user?.id === profile?.user_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Skeleton className="h-80 w-full mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Profile Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || "The profile you're looking for doesn't exist"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout
      profile={profile}
      isOwnProfile={isOwnProfile}
      friendshipStatus={isOwnProfile ? undefined : friendshipStatus}
      onAddFriend={isOwnProfile ? undefined : handleAddFriend}
      friendsCount={friendsCount}
    />
  );
};

export default ProfilePage;
