import React, { useEffect, useRef } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/router";
import { LoginForm } from "@/components/auth/LoginForm";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LoginPage = () => {
  const router = useRouter();
  const sessionCheckedRef = useRef(false);

  // Message when redirect due to session/cookie mismatch (e.g. after BE update)
  useEffect(() => {
    const { reason } = router.query;
    if (reason === "session_expired") {
      toast({
        title: "Session expired",
        description: "Please sign in again. This may happen after a system update.",
        variant: "default",
      });
      router.replace("/auth/login", undefined, { shallow: true });
    }
  }, [router.query.reason]);

  // Handle OAuth errors from URL parameters
  useEffect(() => {
    const { error } = router.query;

    if (error) {
      let errorMessage = "An error occurred during authentication";

      switch (error) {
        case "AccessDenied":
          errorMessage =
            "This email is already registered with password. Please sign in with email and password.";
          break;
        case "Configuration":
          errorMessage = "A server configuration issue occurred. Please contact the administrator.";
          break;
        case "Verification":
          errorMessage =
            "Verification token has expired or has already been used.";
          break;
        case "CredentialsSignin":
          errorMessage =
            "This email is already registered with Google. Please use Google Sign In.";
          break;
        default:
          errorMessage = typeof error === 'string' ? error : "An error occurred during authentication. Please try again.";
      }

      toast({
        title: "❌ Authentication Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Clean up the URL by removing the error parameter
      router.replace("/auth/login", undefined, { shallow: true });
    }
  }, [router.query.error]);

  // Redirect if already logged in (run once on mount to avoid polling when JWT/secret mismatch)
  useEffect(() => {
    if (!router.isReady || sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;

    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        // Get callback URL from query params or default to dashboard
        let callbackUrl =
          (router.query.callbackUrl as string) || "/";

        // Decode callbackUrl if it's encoded
        try {
          callbackUrl = decodeURIComponent(callbackUrl);
        } catch {
          // If decoding fails, use as is
        }

        // Remove any duplicate query parameters (like ?id=) from profile URLs
        if (callbackUrl.includes("/profile/") && callbackUrl.includes("?")) {
          const url = new URL(callbackUrl, window.location.origin);
          const pathId = url.pathname.split("/profile/")[1]?.split("/")[0];
          const queryId = url.searchParams.get("id");
          if (pathId && queryId && pathId === queryId) {
            url.searchParams.delete("id");
            callbackUrl = url.pathname + (url.search ? url.search : "");
          }
        }

        router.push(callbackUrl);
      }
    };
    checkSession();
  }, [router.isReady]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Back Button */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
