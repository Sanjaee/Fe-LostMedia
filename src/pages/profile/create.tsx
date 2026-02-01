import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { ProfileForm } from "@/components/profile/organisms/ProfileForm";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CreateProfilePage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    } else if (status === "authenticated") {
      // Wait a bit for token to be set in API client
      const timer = setTimeout(() => {
        const token = session?.accessToken || api.getAccessToken();
        if (token) {
          if (!api.getAccessToken()) {
            api.setAccessToken(token);
          }
          // Check if profile already exists
          checkExistingProfile();
        } else {
          setLoading(false);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [status, session, api, router]);

  const checkExistingProfile = async () => {
    try {
      const response = await api.getMyProfile();
      // If profile exists, redirect to profile page
      if (response.profile) {
        router.push("/profile/me");
        return;
      }
    } catch (err: any) {
      // 404 means profile doesn't exist, which is fine
      if (err.response?.status !== 404) {
        toast({
          title: "Error",
          description: err.message || "Failed to check profile",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "Profile created successfully!",
    });
    router.push("/profile/me");
  };

  const handleClose = () => {
    router.push("/profile/me");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/profile/me")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Fill in your profile information to get started
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <ProfileForm
            isOpen={isFormOpen}
            onClose={handleClose}
            onSuccess={handleSuccess}
            showDialog={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateProfilePage;
