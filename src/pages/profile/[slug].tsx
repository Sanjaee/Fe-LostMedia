import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { ProfileLayout } from "@/components/profile/organisms/ProfileLayout";
import { Profile } from "@/types/profile";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { slug } = router.query;
  const { data: session } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string>("none");
  const [friendsCount, setFriendsCount] = useState({ followers: 0, following: 0 });

  const loadFriendshipStatus = useCallback(async (targetUserId: string) => {
    try {
      const response = (await api.getFriendshipStatus(targetUserId)) as any;
      const status = response?.status || response?.data?.status || "none";
      setFriendshipStatus(status);
    } catch {
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
      console.error("Failed to load friends count");
    }
  }, [api]);

  const loadProfile = useCallback(
    async (param: string) => {
      try {
        setLoading(true);
        setError(null);

        let response;
        if (param === "me") {
          response = await api.getMyProfile();
          setProfile(response.profile);
          // Redirect to /profile/username to hide "me" in URL
          const profileUsername = response.profile?.user?.username;
          if (profileUsername && typeof window !== "undefined") {
            router.replace(`/profile/${profileUsername}`, undefined, { shallow: true });
            return;
          }
        } else if (UUID_REGEX.test(param)) {
          try {
            response = await api.getProfileByUserId(param);
          } catch {
            response = await api.getProfile(param);
          }
        } else {
          response = await api.getProfileByUsername(param);
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
    },
    [api, toast]
  );

  useEffect(() => {
    if (slug && typeof slug === "string") {
      loadProfile(slug);
    }
  }, [slug, loadProfile]);

  useEffect(() => {
    if (profile?.user_id) {
      if (session?.user?.id && profile.user_id !== session.user.id) {
        loadFriendshipStatus(profile.user_id);
      }
      loadFriendsCount(profile.user_id);
    }
  }, [profile?.user_id, session?.user?.id, loadFriendshipStatus, loadFriendsCount]);

  useEffect(() => {
    const handleFriendshipChange = () => {
      if (profile?.user_id) {
        if (session?.user?.id && profile.user_id !== session.user.id) {
          loadFriendshipStatus(profile.user_id);
        }
        loadFriendsCount(profile.user_id);
      }
    };
    window.addEventListener("friendship-changed", handleFriendshipChange);
    return () => window.removeEventListener("friendship-changed", handleFriendshipChange);
  }, [profile?.user_id, session?.user?.id, loadFriendshipStatus, loadFriendsCount]);

  const handleAddFriend = async () => {
    if (!profile?.user_id) return;
    if (friendshipStatus === "accepted" || friendshipStatus === "pending") return;

    try {
      await api.sendFriendRequest({ receiver_id: profile.user_id });
      toast({
        title: "Success",
        description: "Permintaan pertemanan telah dikirim",
      });
      await loadFriendshipStatus(profile.user_id);
      await loadFriendsCount(profile.user_id);
    } catch (err: any) {
      const errorMessage = err.message || "Gagal mengirim permintaan pertemanan";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      if (
        errorMessage.includes("already friends") ||
        errorMessage.includes("already accepted")
      ) {
        await loadFriendshipStatus(profile.user_id);
      }
    }
  };

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
