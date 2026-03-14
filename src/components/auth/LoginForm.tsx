import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { signIn, getSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useApi } from "@/components/contex/ApiProvider";

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm = () => {
  const router = useRouter();
  const { api } = useApi();

  // Get callback URL from query params or default to dashboard
  let callbackUrl = (router.query.callbackUrl as string) || "/";
  
  // Decode callbackUrl if it's encoded
  try {
    callbackUrl = decodeURIComponent(callbackUrl);
  } catch {
    // If decoding fails, use as is
  }
  
  // Remove any duplicate query parameters (like ?id=) from profile URLs
  if (callbackUrl.includes("/profile/") && callbackUrl.includes("?")) {
    try {
      const url = new URL(callbackUrl, window.location.origin);
      // Remove id query param if it matches the pathname id
      const pathId = url.pathname.split("/profile/")[1]?.split("/")[0];
      const queryId = url.searchParams.get("id");
      if (pathId && queryId && pathId === queryId) {
        url.searchParams.delete("id");
        callbackUrl = url.pathname + (url.search ? url.search : "");
      }
    } catch {
      // If URL parsing fails, use as is
    }
  }
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const sessionCheckDoneRef = useRef(false);

  // Clear invalid/corrupt session on mount to stop looping
  useEffect(() => {
    if (sessionCheckDoneRef.current) return;
    sessionCheckDoneRef.current = true;
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session && !session.user) {
          await signOut({ redirect: false });
        }
      } catch {
        try {
          await signOut({ redirect: false });
        } catch {
          // ignore
        }
      }
    };
    checkSession();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.email.includes("@")) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.password) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Check if email needs verification by calling API directly first
      try {
        const authResponse = await api.login({
          email: formData.email,
          password: formData.password,
        });

        // Check if verification is required
        if (authResponse.requires_verification) {
          toast({
            title: "📧 Email Not Verified",
            description: "OTP has been sent to your email. Please verify your email to continue.",
          });

          // Store email in session storage
          sessionStorage.setItem("registration_email", formData.email);

          // Redirect to verify-otp page for OTP input
          router.push(`/auth/verify-otp?email=${encodeURIComponent(formData.email)}`);
          return;
        }

        // If verified, proceed with NextAuth login
        const result = await signIn("credentials", {
          redirect: false,
          accessToken: authResponse.access_token,
          refreshToken: authResponse.refresh_token,
        });

        if (result?.ok) {
          toast({
            title: "✅ Login Successful!",
            description: "Welcome back to Lost Media!",
          });
          router.push(callbackUrl);
        } else {
          toast({
            title: "❌ Login Failed",
            description: "An error occurred while signing in. Please try again.",
            variant: "destructive",
          });
        }
      } catch (apiError: unknown) {
        // Handle API error response
        const error = apiError as Error & {
          message?: string;
          user_email?: string;
          response?: {
            status: number;
            data?: {
              error?: {
                email?: string;
                requires_verification?: boolean;
                message?: string;
              };
              message?: string;
            };
          };
        };

        // Check if it's email not verified error from backend (401 with requires_verification)
        if (
          error.response?.status === 401 &&
          error.response?.data?.error?.requires_verification
        ) {
          const email = error.response.data.error.email || formData.email;
          const errorMessage = error.response.data.error.message || 
            error.response.data.message || 
            "OTP has been sent to your email. Please verify your email to continue.";

          toast({
            title: "📧 Email Not Verified",
            description: errorMessage,
          });

          sessionStorage.setItem("registration_email", email);
          router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return;
        }

        // If it's EMAIL_NOT_VERIFIED error from NextAuth handler
        if (error.message === "EMAIL_NOT_VERIFIED") {
          toast({
            title: "📧 Email Not Verified",
            description: "OTP has been sent to your email. Please verify your email to continue.",
          });

          sessionStorage.setItem("registration_email", error.user_email || formData.email);
          router.push(`/auth/verify-otp?email=${encodeURIComponent(error.user_email || formData.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return;
        }

        // Try NextAuth login for other cases
        const result = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
        });

        if (result?.ok) {
          toast({
            title: "✅ Login Successful!",
            description: "Welcome back to Lost Media!",
          });
          router.push(callbackUrl);
        } else {
          let errorMessage = "Invalid email or password. Please try again.";
          let errorTitle = "❌ Login Failed";

          // Handle specific error messages
          if (result?.error) {
            const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
            
            // Check for specific error messages from our backend
            if (
              errorStr.includes("registered with Google") ||
              errorStr.includes("Please use Google sign in") ||
              errorStr.includes("Account type mismatch")
            ) {
              errorMessage =
                "This email is already registered with Google. Please use the 'Sign in with Google' button to log in.";
              errorTitle = "⚠️ Account Type Mismatch";
            } else if (
              errorStr.includes("Password yang Anda masukkan salah") ||
              errorStr.includes("Invalid password") ||
              errorStr.includes("invalid email or password")
            ) {
              errorMessage =
                "Invalid email or password. Please try again.";
              errorTitle = "🔒 Login Failed";
            } else if (errorStr.includes("Email tidak terdaftar") ||
                       errorStr.includes("User not found") ||
                       errorStr.includes("user not found")) {
              errorMessage =
                "Email is not registered. Please check your email or register a new account.";
              errorTitle = "👤 Email Not Found";
            } else if (errorStr.includes("Invalid credentials") ||
                       errorStr === "CredentialsSignin") {
              errorMessage = "Invalid email or password. Please try again.";
              errorTitle = "❌ Login Failed";
            } else if (errorStr.includes("account is banned")) {
              errorMessage = "Your account has been deactivated. Please contact the administrator.";
              errorTitle = "🚫 Account Deactivated";
            } else if (typeof result.error === 'string' && result.error.trim() !== '') {
              // Use the error message directly if it's a valid string
              errorMessage = result.error;
            }
          }

          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "❌ Login Failed",
        description: "An error occurred while signing in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signIn("google", {
        callbackUrl: callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        let errorMessage = "An error occurred during Google authentication. Please try again.";
        let errorTitle = "❌ Google Sign-In Failed";

        const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);

        // Check for specific error messages
        if (errorStr.includes("already registered with password") || 
            errorStr === "AccessDenied") {
          errorMessage = "This email is already registered with password. Please sign in with email and password.";
          errorTitle = "⚠️ Email Already Registered";
        } else if (errorStr.includes("different Google account")) {
          errorMessage = "This email is already registered with a different Google account.";
          errorTitle = "⚠️ Email Already Registered";
        } else if (errorStr === "Configuration") {
          errorMessage = "A server configuration issue occurred. Please contact the administrator.";
        } else if (errorStr === "Verification") {
          errorMessage = "Verification token has expired or has already been used.";
        } else if (typeof result.error === 'string' && result.error.trim() !== '') {
          errorMessage = result.error;
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      } else if (result?.ok) {
        // Success - redirect to callback URL
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      
      let errorMessage = "An error occurred during Google authentication. Please try again.";
      
      // Handle error object
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as { message?: string };
        if (errorObj.message && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        }
      }
      
      toast({
        title: "❌ Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Lost Media
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                onClick={() => router.push("/auth/reset-password")}
              >
                Forgot password?
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >
          <svg
            className="mr-2 h-4 w-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? "Processing..." : "Sign in with Google"}
        </Button>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              onClick={() => router.push("/auth/register")}
            >
              Sign up here
            </Button>
          </p>
        </div>

        {/* Emergency: reset session if still looping */}
        <div className="text-center mt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await signOut({ redirect: false });
              if (typeof window !== "undefined") {
                sessionStorage.clear();
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            Reset Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
