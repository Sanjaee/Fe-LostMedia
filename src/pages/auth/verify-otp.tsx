import { useState, useEffect, useCallback } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function VerifyOtp() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerificationTime, setLastVerificationTime] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [callbackUrl, setCallbackUrl] = useState<string>("/");

  const syncCountdownFromBE = useCallback(async () => {
    if (!userEmail) return;
    try {
      const res = await api.getOTPResendStatus(userEmail) as { next_resend_at?: number; can_resend?: boolean };
      if (res.can_resend) {
        setTimeLeft(0);
        setCanResend(true);
      } else if (res.next_resend_at) {
        const remaining = Math.max(0, Math.floor(res.next_resend_at - Date.now() / 1000));
        setTimeLeft(remaining);
        setCanResend(remaining <= 0);
      }
    } catch {
      setCanResend(true);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) syncCountdownFromBE();
  }, [userEmail, syncCountdownFromBE]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) setCanResend(true);
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Get email and callbackUrl from query params or session storage
  useEffect(() => {
    if (router.isReady) {
      const { email, token, callbackUrl } = router.query;
      
      // Check if we have token in query (email verification via link - legacy)
      if (token && typeof token === "string") {
        // Auto-verify if token exists
        handleVerifyEmail(token);
        return;
      }

      // Get email and callbackUrl from query params or session storage
      const emailFromQuery = email as string;
      const callbackUrlFromQuery = (callbackUrl as string) || "/";
      setCallbackUrl(callbackUrlFromQuery);
      const emailFromStorage = sessionStorage.getItem("registration_email") || 
                              sessionStorage.getItem("reset_password_email");

      if (emailFromQuery) {
        setUserEmail(emailFromQuery);
        sessionStorage.setItem("registration_email", emailFromQuery);
      } else if (emailFromStorage) {
        setUserEmail(emailFromStorage);
      } else {
        // No email found, redirect to register
        router.push("/auth/register");
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.email, router.query.token]);

  const handleVerifyEmail = async (verificationToken: string) => {
    setLoading(true);
    setIsVerifying(true);

    try {
      const response = await api.verifyEmail(verificationToken);

      // Auto-login using the JWT tokens from verification
      const loginResult = await signIn("credentials", {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        redirect: false,
      });

      if (loginResult?.ok) {
        toast({
          title: "🎉 Email Verified Successfully!",
          description: "Your account has been verified. Redirecting to home...",
        });
        sessionStorage.removeItem("registration_email");
        router.push(callbackUrl);
      } else {
        toast({
          title: "⚠️ Verification Successful",
          description: "Email verified successfully. Please sign in to continue.",
        });
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    } catch (error) {
      console.error("Email verification error:", error);
      toast({
        title: "❌ Verification Failed",
        description:
          error instanceof Error
            ? error.message
            : "Invalid or expired token. Please request again.",
        variant: "destructive",
      });
      router.push("/auth/register");
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds >= 86400) {
      const d = Math.floor(totalSeconds / 86400);
      const h = Math.floor((totalSeconds % 86400) / 3600);
      return `${d} day(s) ${h} hour(s)`;
    }
    if (totalSeconds >= 3600) {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      return `${h} hr ${m} min`;
    }
    if (totalSeconds >= 60) {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m} min ${s} sec`;
    }
    return `${totalSeconds} sec`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value.replace(/[^0-9]/g, ""); // Only allow numbers
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (value && index === 5) {
      const updatedOtp = [...newOtp];
      updatedOtp[index] = value.replace(/[^0-9]/g, "");
      const otpString = updatedOtp.join("");

      if (otpString.length === 6 && !isVerifying) {
        const now = Date.now();
        // Prevent multiple rapid verifications (debounce)
        if (now - lastVerificationTime > 1000) {
          setLastVerificationTime(now);
          // Small delay to ensure the last digit is set
          setTimeout(() => {
            verifyOtp(otpString);
          }, 100);
        }
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    const newOtp = [...otp];

    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) newOtp[i] = pastedData[i];
    }

    setOtp(newOtp);

    // Auto-verify if 6 digits are pasted
    if (pastedData.length === 6 && !isVerifying) {
      const now = Date.now();
      // Prevent multiple rapid verifications (debounce)
      if (now - lastVerificationTime > 1000) {
        setLastVerificationTime(now);
        setTimeout(() => {
          verifyOtp(pastedData);
        }, 100);
      }
    }
  };

  const verifyOtp = async (otpString: string) => {
    setIsVerifying(true);
    setLoading(true);

    try {
      // Get token from query params if available
      const { token } = router.query;
      
      if (token && typeof token === "string") {
        // Verify using token (for email verification)
        const response = await api.verifyEmail(token);

        // Auto-login using the JWT tokens from verification
        const loginResult = await signIn("credentials", {
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          redirect: false,
        });

        if (loginResult?.ok) {
          toast({
            title: "🎉 Success!",
            description:
              "Email verified successfully! Welcome. Redirecting...",
          });
          // Clear session storage
          sessionStorage.removeItem("registration_email");
          router.push("/");
        } else {
          toast({
title: "⚠️ Verification Successful",
          description:
              "Email verified successfully. Please sign in to continue.",
          });
          router.push("/auth/login");
        }
      } else {
        // Verify using OTP code
        const data = await api.verifyOTP({
          email: userEmail,
          otp_code: otpString,
        });

        // Auto-login using the JWT tokens from verification
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        
        if (accessToken && refreshToken) {
          const loginResult = await signIn("credentials", {
            accessToken: accessToken,
            refreshToken: refreshToken,
            redirect: false,
          });

          if (loginResult?.ok) {
            toast({
              title: "🎉 Success!",
              description:
                "Email verified successfully! Welcome. Redirecting...",
            });
            // Clear session storage
            sessionStorage.removeItem("registration_email");
            sessionStorage.removeItem("reset_password_email");
            router.push(callbackUrl);
          } else {
            toast({
title: "⚠️ Verification Successful",
          description:
              "Email verified successfully. Please sign in to continue.",
            });
            router.push("/auth/login");
          }
        } else {
          toast({
title: "⚠️ Verification Successful",
          description:
              "Email verified successfully. Please sign in to continue.",
          });
          router.push("/auth/login");
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "❌ Verification Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during verification. Please try again or contact support.",
        variant: "destructive",
      });
      // Clear OTP on error and reset verification state
      setOtp(["", "", "", "", "", ""]);
      setIsVerifying(false);
      setLastVerificationTime(0);
      // Focus on first input
      const firstInput = document.getElementById("otp-0");
      firstInput?.focus();
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast({
        title: "❌ Invalid OTP",
        description: "Please enter a valid 6-digit OTP code",
        variant: "destructive",
      });
      return;
    }

    await verifyOtp(otpString);
  };

  const handleResendOtp = async () => {
    if (!canResend || !userEmail) return;

    setResendLoading(true);

    try {
      const res = await api.resendOTP({ email: userEmail }) as { next_resend_at?: number };
      toast({
        title: "✅ OTP Sent!",
        description: `New OTP code is being sent to ${userEmail}. Please check your email.`,
      });
      setOtp(["", "", "", "", "", ""]);
      setLastVerificationTime(0);
      if (res?.next_resend_at) {
        const remaining = Math.max(0, Math.floor(res.next_resend_at - Date.now() / 1000));
        setTimeLeft(remaining);
        setCanResend(false);
      }
    } catch (error: unknown) {
      const err = error as Error & { next_resend_at?: number };
      if (err?.next_resend_at) {
        const remaining = Math.max(0, Math.floor(err.next_resend_at - Date.now() / 1000));
        setTimeLeft(remaining);
        setCanResend(false);
      }
      toast({
        title: "❌ Send Failed",
        description: err instanceof Error ? err.message : "Failed to resend OTP.",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <Card className="w-full dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
              Verifikasi Email
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {userEmail ? (
                <>
                  OTP has been sent to{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400 break-all">
                    {userEmail}
                  </span>
                </>
              ) : (
                "Verification code has been sent to your email"
              )}
              <br />
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                Email verification is required to access your account
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                  <div
                    className="flex gap-2 items-center justify-center"
                    onPaste={handlePaste}
                  >
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 text-center text-base sm:text-lg font-semibold ${
                          isVerifying ? "opacity-50" : ""
                        }`}
                        disabled={loading || isVerifying}
                      />
                    ))}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-2">
                    {isVerifying && (
                      <Skeleton className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    )}
                    <span className="text-center">
                      {isVerifying
                        ? "Verifying code..."
                        : "Enter the 6-digit code sent to your email"}
                    </span>
                  </div>
                  {otp.join("").length === 6 && !isVerifying && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                      ✨ Code will be verified automatically
                    </p>
                  )}
                  {userEmail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 px-2">
                      Check spam folder if email is not found
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      loading || isVerifying || otp.join("").length !== 6
                    }
                  >
                    {(loading || isVerifying) && (
                      <Skeleton className="mr-2 h-4 w-4 shrink-0" />
                    )}
                    {loading || isVerifying
                      ? "Memverifikasi..."
                      : "Verifikasi Email"}
                  </Button>
                </div>

                <div className="text-center px-2">
                  {!canResend ? (
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm  dark:text-gray-400">
                        Resend code in {formatTime(timeLeft)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm  dark:text-gray-400">
                        Didn't receive the email?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                        className="text-xs sm:text-sm w-full sm:w-auto"
                      >
                        {resendLoading ? "Sending..." : "Resend OTP"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-center px-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/auth/register")}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 w-full sm:w-auto"
                  >
                    ← Back to registration
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
