"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi } from "@/components/contex/ApiProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, UserCheck, UserX, DollarSign } from "lucide-react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { AllUsersTable } from "@/components/admin/AllUsersTable";
import { AllReportsTable } from "@/components/admin/AllReportsTable";

interface UserStats {
  total: number;
  by_type: {
    owner: number;
    member: number;
  };
  by_verification: {
    verified: number;
    unverified: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { api } = useApi();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const loadStats = useCallback(async () => {
    try {
      const response = await api.getUserStats();
      setStats(response);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, [api]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session) {
      router.push("/auth/login");
      return;
    }

    const userType =
      session.userType ||
      session.user?.userType ||
      session.user?.user_type ||
      session.user?.role ||
      (session.user as { user_type?: string })?.user_type ||
      (session.user as { userType?: string })?.userType;

    if (userType !== "owner") {
      router.push("/");
      return;
    }

    const t = setTimeout(() => loadStats(), 0);
    return () => clearTimeout(t);
  }, [session, status, router, loadStats]);

  useWebSocketSubscription((data: { type?: string; payload?: Record<string, unknown> }) => {
    const messageData = (data.type === "broadcast" && data.payload ? data.payload : data) as {
      type?: string;
      user_id?: string;
      full_name?: string;
      email?: string;
    };
    if (messageData?.type === "new_user" && messageData?.user_id) {
      setTableRefreshTrigger((prev) => prev + 1);
      loadStats();
      const name = messageData?.full_name || messageData?.email || "User baru";
      toast({
        title: "User baru terdaftar",
        description: `${name} baru saja mendaftar. Daftar user diperbarui.`,
      });
    }
  });

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4 pb-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Kelola pengguna dan lihat statistik platform
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/role-prices">
              <DollarSign className="h-4 w-4 mr-2" />
              Kelola Role Prices
            </Link>
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="py-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Semua pengguna terdaftar</p>
              </CardContent>
            </Card>

            <Card className="py-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Owners</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_type.owner}</div>
                <p className="text-xs text-muted-foreground">Owner users</p>
              </CardContent>
            </Card>

            <Card className="py-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_verification.verified}</div>
                <p className="text-xs text-muted-foreground">Email terverifikasi</p>
              </CardContent>
            </Card>

            <Card className="py-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unverified</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_verification.unverified}</div>
                <p className="text-xs text-muted-foreground">Belum verifikasi</p>
              </CardContent>
            </Card>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="py-6">
              <CardHeader>
                <CardTitle>User Distribution by Type</CardTitle>
                <CardDescription>Distribusi pengguna berdasarkan tipe</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Owner</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(stats.by_type.owner / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {stats.by_type.owner}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Member</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(stats.by_type.member / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {stats.by_type.member}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="py-6">
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>Status verifikasi email pengguna</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Verified</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(stats.by_verification.verified / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {stats.by_verification.verified}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Unverified</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{
                            width: `${(stats.by_verification.unverified / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {stats.by_verification.unverified}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <AllUsersTable
          currentUserId={session?.user?.id}
          onStatsRefresh={loadStats}
          refreshTrigger={tableRefreshTrigger}
        />

        <div className="mt-6">
          <AllReportsTable refreshTrigger={tableRefreshTrigger} />
        </div>
      </div>
    </div>
  );
}
