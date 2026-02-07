"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi } from "@/components/contex/ApiProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Users, UserCheck, UserX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  user_type: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  profile_photo?: string;
  login_type?: string; // "credential" | "google"
}

interface UserStats {
  total: number;
  by_type: {
    admin: number;
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
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    // Check if user is admin
    if (status === "loading") return;

    if (status === "unauthenticated" || !session) {
      router.push("/auth/login");
      return;
    }

    // Check user type from session (check multiple possible locations)
    const userType = 
      session.userType || 
      session.user?.userType || 
      session.user?.user_type || 
      session.user?.role || 
      (session.user as any)?.user_type || 
      (session.user as any)?.userType;
    
    if (userType !== "admin") {
      router.push("/");
      return;
    }

    loadUsers();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (currentPage - 1) * limit;
      const response = await api.getAllUsers(limit, offset);
      
      // Response is already unwrapped by api.ts
      setUsers(response.users || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      if (err?.response?.status === 403) {
        setError("Access denied: Admin role required");
        router.push("/");
      } else {
        setError(err.message || "Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.getUserStats();
      // Response is already unwrapped by api.ts
      setStats(response);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error && error.includes("Access denied")) {
    return null; // Will redirect
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4 pb-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Kelola pengguna dan lihat statistik platform
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Semua pengguna terdaftar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_type.admin}</div>
                <p className="text-xs text-muted-foreground">Admin users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_verification.verified}</div>
                <p className="text-xs text-muted-foreground">Email terverifikasi</p>
              </CardContent>
            </Card>

            <Card>
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

        {/* Chart Section */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Type</CardTitle>
                <CardDescription>Distribusi pengguna berdasarkan tipe</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Admin</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(stats.by_type.admin / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {stats.by_type.admin}
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

            <Card>
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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Daftar semua pengguna yang terdaftar ({total} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && !error.includes("Access denied") && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {users.length === 0 && !loading ? (
              <div className="text-center py-8 text-zinc-500">
                <p>No users found</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Login</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                          onClick={() => router.push(`/profile/${user.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profile_photo || ""} />
                                <AvatarFallback>
                                  {user.full_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.full_name}</div>
                                {user.username && (
                                  <div className="text-sm text-zinc-500">@{user.username}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.user_type === "admin" ? "default" : "secondary"}
                            >
                              {user.user_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? "default" : "destructive"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.login_type === "google" ? "default" : "secondary"}
                            >
                              {user.login_type === "google" ? "Google" : "Credential"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-zinc-500">
                            {formatDistanceToNow(new Date(user.created_at), {
                              addSuffix: true,
                              locale: id,
                            })}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-500">
                            {user.last_login
                              ? formatDistanceToNow(new Date(user.last_login), {
                                  addSuffix: true,
                                  locale: id,
                                })
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-zinc-500">
                      Showing {(currentPage - 1) * limit + 1} to{" "}
                      {Math.min(currentPage * limit, total)} of {total} users
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
