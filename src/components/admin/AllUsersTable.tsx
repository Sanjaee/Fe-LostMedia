"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/components/contex/ApiProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
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
import { Search, X, Ban, ShieldCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { id } from "date-fns/locale";

export interface AdminUser {
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
  login_type?: string;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "mod", label: "Moderator" },
  { value: "mvp", label: "MVP" },
  { value: "god", label: "God" },
  { value: "vip", label: "VIP" },
  { value: "member", label: "Member" },
] as const;

interface AllUsersTableProps {
  currentUserId?: string;
  onStatsRefresh?: () => void;
  /** Increment to trigger table refresh from parent (e.g. on new user WebSocket) */
  refreshTrigger?: number;
}

export function AllUsersTable({
  currentUserId,
  onStatsRefresh,
  refreshTrigger = 0,
}: AllUsersTableProps) {
  const router = useRouter();
  const { api } = useApi();
  const { toast } = useToast();
  const limit = 10;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banDuration, setBanDuration] = useState("60");
  const [banDurationUnit, setBanDurationUnit] = useState<"minutes" | "hours" | "days">("hours");
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (currentPage - 1) * limit;
      const response = await api.getAllUsers(limit, offset);
      setUsers(response.users || []);
      setTotal(response.total || 0);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number }; message?: string };
      console.error("Failed to load users:", err);
      if (e?.response?.status === 403) {
        setError("Access denied: Admin role required");
        router.push("/");
      } else {
        setError(e?.message || "Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setError(null);
      const offset = (currentPage - 1) * limit;
      const response = await api.getAllUsers(limit, offset);
      setUsers(response.users || []);
      setTotal(response.total || 0);
      toast({ title: "Tabel diperbarui", description: "Daftar user berhasil di-refresh." });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal refresh", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }, [api, currentPage, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (refreshTrigger > 0) loadUsers();
  }, [refreshTrigger, loadUsers]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchUsers(query.trim(), 10, 0);
      const list = res.users ?? (res as { data?: { users?: AdminUser[] } })?.data?.users ?? [];
      setSearchResults(Array.isArray(list) ? list : []);
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

  const updateUserInState = (userId: string, updates: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    setSearchResults((prev) =>
      prev ? prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)) : null
    );
  };

  const openBanDialog = (user: AdminUser) => {
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
      const res = await api.banUser(banTarget.id, minutes, banReason);
      const bannedUntil =
        res?.banned_until ?? new Date(Date.now() + minutes * 60 * 1000).toISOString();
      updateUserInState(banTarget.id, {
        is_banned: true,
        banned_until: bannedUntil,
        ban_reason: banReason || res?.reason,
      });
      toast({ title: "User dibanned", description: `${banTarget.full_name} telah dibanned.` });
      setBanDialogOpen(false);
      setBanTarget(null);
      loadUsers();
      onStatsRefresh?.();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal ban user", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async (user: AdminUser) => {
    try {
      await api.unbanUser(user.id);
      updateUserInState(user.id, {
        is_banned: false,
        banned_until: undefined,
        ban_reason: undefined,
      });
      toast({ title: "User di-unban", description: `${user.full_name} telah di-unban.` });
      loadUsers();
      onStatsRefresh?.();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: "Gagal unban user",
        description: e?.message || "Error",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    const currentRole = user.user_type || "member";
    if (newRole === currentRole) return;
    if (user.id === currentUserId) {
      toast({ title: "Tidak bisa mengubah role sendiri", variant: "destructive" });
      return;
    }
    setUpdatingRole(user.id);
    try {
      await api.updateUserRole(user.id, newRole);
      updateUserInState(user.id, { user_type: newRole });
      toast({
        title: "Role diubah",
        description: `${user.full_name} sekarang berperan sebagai ${newRole}.`,
      });
      loadUsers();
      onStatsRefresh?.();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal ubah role", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setUpdatingRole(null);
    }
  };

  const displayUsers = searchResults !== null ? searchResults : users;
  const isSearchMode = searchResults !== null;
  const totalPages = Math.ceil(total / limit);

  return (
    <Card className="py-6">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Memuat..." : "Refresh"}
            </Button>
            <div className="relative w-full sm:w-64">
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
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {displayUsers.length === 0 && !loading && !searching ? (
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
                  {loading || searching ? (
                    Array.from({ length: limit }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-12 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    displayUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                        onClick={() => router.push(`/profile/${user.username || user.id}`)}
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
                              <div className="font-medium">
                                <UserNameWithRole
                                  displayName={user.full_name || user.username || "User"}
                                  role={user.user_type}
                                  className="truncate inline-block max-w-full"
                                />
                              </div>
                              {user.username && (
                                <div className="text-sm text-zinc-500">@{user.username}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={user.user_type || "member"}
                            onValueChange={(v) => handleRoleChange(user, v)}
                            disabled={user.id === currentUserId || updatingRole === user.id}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              {updatingRole === user.id && (
                                <Skeleton className="h-3.5 w-3.5 mr-1 shrink-0" />
                              )}
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value} className="text-xs">
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "destructive"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_banned &&
                          user.banned_until &&
                          new Date(user.banned_until) > new Date() ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="destructive" className="text-xs">
                                <Ban className="h-3 w-3 mr-1" /> Banned
                              </Badge>
                              <span className="text-[10px] text-zinc-500">
                                s/d{" "}
                                {format(new Date(user.banned_until), "dd MMM yyyy HH:mm", {
                                  locale: id,
                                })}
                              </span>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600 border-green-300"
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" /> OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.login_type === "google" ? "default" : "secondary"
                            }
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
                          {user.user_type !== "owner" &&
                            (user.is_banned &&
                            user.banned_until &&
                            new Date(user.banned_until) > new Date() ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnban(user);
                                }}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Unban
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBanDialog(user);
                                }}
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" /> Ban
                              </Button>
                            ))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

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

      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Ban User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ban <span className="font-semibold">{banTarget?.full_name}</span> dari
              platform. User tidak bisa mengakses fitur apapun selama masa ban.
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
                <Select
                  value={banDurationUnit}
                  onValueChange={(v) => setBanDurationUnit(v as "minutes" | "hours" | "days")}
                >
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
                  <Skeleton className="h-4 w-4 mr-2 shrink-0" />
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
    </Card>
  );
}
