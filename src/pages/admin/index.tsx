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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Shield, Users, UserCheck, UserX, Search, X, Ban, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { id } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  user_type: string;
  is_verified: boolean;
  is_active: boolean;
  is_banned?: boolean;
  banned_until?: string;
  ban_reason?: string;
  created_at: string;
  last_login?: string;
  profile_photo?: string;
  login_type?: string; // "credential" | "google"
}

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
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [banDuration, setBanDuration] = useState("60"); // minutes
  const [banDurationUnit, setBanDurationUnit] = useState<"minutes" | "hours" | "days">("hours");
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  const { toast } = useToast();
  const limit = 50;

  useEffect(() => {
    // Check if user is owner
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
    
    if (userType !== "owner") {
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchUsers(query.trim(), 50, 0);
      const users = res.users ?? (res as any).data?.users ?? [];
      setSearchResults(Array.isArray(users) ? users : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const openBanDialog = (user: User) => {
    setBanTarget(user);
    setBanDuration("1");
    setBanDurationUnit("hours");
    setBanReason("");
    setBanDialogOpen(true);
  };

  const handleBan = async () => {
    if (!banTarget) return;
    const durationNum = parseInt(banDuration) || 1;
    let minutes = durationNum;
    if (banDurationUnit === "hours") minutes = durationNum * 60;
    else if (banDurationUnit === "days") minutes = durationNum * 60 * 24;

    setBanning(true);
    try {
      await api.banUser(banTarget.id, minutes, banReason);
      toast({ title: "User dibanned", description: `${banTarget.full_name} telah dibanned.` });
      setBanDialogOpen(false);
      setBanTarget(null);
      loadUsers();
    } catch (err: any) {
      toast({ title: "Gagal ban user", description: err?.message || "Error", variant: "destructive" });
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async (user: User) => {
    try {
      await api.unbanUser(user.id);
      toast({ title: "User di-unban", description: `${user.full_name} telah di-unban.` });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Gagal unban user", description: err?.message || "Error", variant: "destructive" });
    }
  };

  const displayUsers = searchResults !== null ? searchResults : users;
  const isSearchMode = searchResults !== null;

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
                <CardTitle className="text-sm font-medium">Owners</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_type.owner}</div>
                <p className="text-xs text-muted-foreground">Owner users</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {isSearchMode
                    ? `Hasil pencarian: ${displayUsers.length} user ditemukan`
                    : `Daftar semua pengguna yang terdaftar (${total} total)`}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Cari nama, username, atau email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && !error.includes("Access denied") && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                <span className="ml-2 text-sm text-zinc-500">Mencari...</span>
              </div>
            ) : displayUsers.length === 0 && !loading ? (
              <div className="text-center py-8 text-zinc-500">
                <p>{isSearchMode ? "Tidak ada user ditemukan" : "No users found"}</p>
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
                        <TableHead>Ban</TableHead>
                        <TableHead>Login</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayUsers.map((user) => (
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
                              variant={user.user_type === "owner" ? "default" : "secondary"}
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
                            {user.is_banned && user.banned_until && new Date(user.banned_until) > new Date() ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge variant="destructive" className="text-xs">
                                  <Ban className="h-3 w-3 mr-1" /> Banned
                                </Badge>
                                <span className="text-[10px] text-zinc-500">
                                  s/d {format(new Date(user.banned_until), "dd MMM yyyy HH:mm", { locale: id })}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                <ShieldCheck className="h-3 w-3 mr-1" /> OK
                              </Badge>
                            )}
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
                          <TableCell className="text-right">
                            {user.user_type !== "owner" && (
                              user.is_banned && user.banned_until && new Date(user.banned_until) > new Date() ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  onClick={(e) => { e.stopPropagation(); handleUnban(user); }}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Unban
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={(e) => { e.stopPropagation(); openBanDialog(user); }}
                                >
                                  <Ban className="h-3.5 w-3.5 mr-1" /> Ban
                                </Button>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination - hide during search */}
                {!isSearchMode && totalPages > 1 && (
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

      {/* Ban User Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Ban User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ban <span className="font-semibold">{banTarget?.full_name}</span> dari platform.
              User tidak bisa mengakses fitur apapun selama masa ban.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Durasi Ban</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-24"
                  placeholder="1"
                />
                <Select value={banDurationUnit} onValueChange={(v) => setBanDurationUnit(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Menit</SelectItem>
                    <SelectItem value="hours">Jam</SelectItem>
                    <SelectItem value="days">Hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alasan (opsional)</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Contoh: Melanggar ketentuan layanan, spam, dll."
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={banning}>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleBan}
              disabled={banning || !banDuration || parseInt(banDuration) < 1}
            >
              {banning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Ban User
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
