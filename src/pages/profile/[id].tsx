import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ProfileLayout } from "@/components/profile/organisms/ProfileLayout";
import { Profile } from "@/types/profile";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { api } = useApi();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProfile(id);
    }
  }, [id]);

  const loadProfile = async (id: string) => {
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
        } catch (profileErr: any) {
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
  };

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
      isOwnProfile={false}
    />
  );
};

export default ProfilePage;
