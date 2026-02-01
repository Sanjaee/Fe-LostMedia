import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { ProfileLayout } from "@/components/profile/organisms/ProfileLayout";
import { Profile } from "@/types/profile";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ProfileMePage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      // Wait a bit for token to be set in API client
      const timer = setTimeout(() => {
        const token = session?.accessToken || api.getAccessToken();
        if (token) {
          if (!api.getAccessToken()) {
            api.setAccessToken(token);
          }
          loadProfile();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, api]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getMyProfile();
      setProfile(response.profile);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load profile";
      setError(errorMessage);
      
      // If profile doesn't exist, we can still show the page with create option
      if (err.response?.status === 404) {
        toast({
          title: "Profile not found",
          description: "Create your profile to get started",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    loadProfile();
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

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Profile Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/profile/create")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <ProfileLayout
      profile={profile}
      isOwnProfile={true}
      sessionName={session?.user?.name || null}
      sessionImage={session?.user?.image || null}
      onProfileUpdate={handleProfileUpdate}
    />
  );
};

export default ProfileMePage;
