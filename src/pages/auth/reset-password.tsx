import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
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
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const router = useRouter();
  const { token, email: emailParam } = router.query;
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(true); // True if requesting reset, false if setting new password

  useEffect(() => {
    if (router.isReady) {
      // Check if we have token (user came from email link)
      if (token && typeof token === "string") {
        setIsRequesting(false);
        const emailFromQuery = emailParam as string;
        const emailFromStorage = sessionStorage.getItem("reset_password_email");
        
        if (emailFromQuery) {
          setEmail(emailFromQuery);
        } else if (emailFromStorage) {
          setEmail(emailFromStorage);
        }
      } else {
        // No token, show request form
        setIsRequesting(true);
      }
    }
  }, [router.isReady, token, emailParam]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "❌ Email Required",
        description: "Please enter your email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.requestResetPassword({ email });

      toast({
        title: "✅ OTP Code Sent!",
        description: "Please check your email for the password reset OTP code. The code will expire in 10 minutes.",
      });

      // Store email in session storage
      sessionStorage.setItem("reset_password_email", email);

      // Redirect to verify OTP page
      router.push("/auth/verify-otp-reset");
    } catch (error) {
      console.error("Request reset password error:", error);
      toast({
        title: "❌ Failed to Send OTP",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send password reset OTP code. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "❌ Password Required",
        description: "Please enter your new password and confirm password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "❌ Passwords Do Not Match",
        description: "New password and confirm password do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "❌ Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (!token || typeof token !== "string") {
      toast({
        title: "❌ Invalid Token",
        description: "Password reset token not found. Please request again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call reset password endpoint
      const response = await api.resetPassword({
        token: token,
        newPassword: newPassword,
      });

      toast({
        title: "🎉 Password Reset Successfully!",
        description: "Your password has been reset. Redirecting...",
      });

      // Auto-login using JWT tokens from response
      const { signIn } = await import("next-auth/react");
      const loginResult = await signIn("credentials", {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        redirect: false,
      });

      // Clear session storage
      sessionStorage.removeItem("reset_password_email");
      sessionStorage.removeItem("reset_password_token");

      if (loginResult?.ok) {
        router.push("/");
      } else {
        toast({
          title: "⚠️ Reset Successful",
          description: "Password has been reset. Please sign in to continue.",
        });
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "❌ Reset Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while resetting password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <Card className="w-full dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              {isRequesting ? (
                <Mail className="w-6 h-6 text-red-600 dark:text-red-400" />
              ) : (
                <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
              {isRequesting ? "Reset Password" : "Set New Password"}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {isRequesting ? (
                <>
                  Enter your email to receive the password reset OTP code
                  <br />
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                    We will send the OTP code to your email
                  </span>
                </>
              ) : (
                <>
                  Reset password untuk <br />
                  <span className="font-semibold text-blue-600 dark:text-blue-400 break-all">
                    {email}
                  </span>
                  <br />
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                    Enter your new password
                  </span>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isRequesting ? handleRequestReset : handleResetPassword}>
              <div className="flex flex-col gap-6">
                {isRequesting ? (
                  <>
                    <div className="grid gap-3">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && (
                          <Skeleton className="mr-2 h-4 w-4 shrink-0" />
                        )}
                        {loading ? "Sending..." : "Send OTP Code"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button type="submit" className="w-full" disabled={loading || !newPassword || !confirmPassword}>
                        {loading && (
                          <Skeleton className="mr-2 h-4 w-4 shrink-0" />
                        )}
                        {loading ? "Mereset Password..." : "Reset Password"}
                      </Button>
                    </div>
                  </>
                )}

                <div className="text-center px-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/auth/login")}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 w-full sm:w-auto"
                  >
                    ← Back to login
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
