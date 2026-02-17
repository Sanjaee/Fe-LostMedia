"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useApi } from "@/components/contex/ApiProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, RefreshCw, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { id } from "date-fns/locale";

export interface AdminReport {
  id: string;
  user_id: string;
  description: string;
  admin_reply?: string;
  admin_replied_at?: string;
  admin_id?: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email?: string;
    user_type?: string;
    username?: string;
    profile_photo?: string;
  };
  admin?: {
    id: string;
    full_name: string;
    email?: string;
  };
}

interface AllReportsTableProps {
  refreshTrigger?: number;
}

export function AllReportsTable({ refreshTrigger = 0 }: AllReportsTableProps) {
  const router = useRouter();
  const { api } = useApi();
  const { toast } = useToast();
  const limit = 15;

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<AdminReport | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (currentPage - 1) * limit;
      const response = await api.getReports(limit, offset);
      setReports(response.reports || []);
      setTotal(response.total || 0);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number }; message?: string };
      if (e?.response?.status === 403) {
        setError("Akses ditolak: Admin diperlukan");
        router.push("/");
      } else {
        setError((e?.message as string) || "Gagal memuat report");
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
      const response = await api.getReports(limit, offset);
      setReports(response.reports || []);
      setTotal(response.total || 0);
      toast({ title: "Tabel diperbarui", description: "Daftar report berhasil di-refresh." });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal refresh", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }, [api, currentPage, toast]);

  const openReplyDialog = (report: AdminReport) => {
    setReplyTarget(report);
    setReplyText(report.admin_reply || "");
    setReplyDialogOpen(true);
  };

  const handleReply = async () => {
    if (!replyTarget) return;
    const text = replyText.trim();
    if (!text) {
      toast({ title: "Balasan wajib diisi", variant: "destructive" });
      return;
    }

    setReplying(true);
    try {
      await api.replyReport(replyTarget.id, text);
      setReports((prev) =>
        prev.map((r) =>
          r.id === replyTarget.id
            ? {
                ...r,
                admin_reply: text,
                admin_replied_at: new Date().toISOString(),
              }
            : r
        )
      );
      toast({
        title: "Balasan terkirim",
        description: "User yang melaporkan akan menerima notifikasi realtime.",
      });
      setReplyDialogOpen(false);
      setReplyTarget(null);
      setReplyText("");
      loadReports();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal mengirim balasan", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setReplying(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (refreshTrigger > 0) loadReports();
  }, [refreshTrigger, loadReports]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Card className="py-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Reports
            </CardTitle>
            <CardDescription>Daftar report dari pengguna - Admin dapat membalas report</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Memuat..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Belum ada report</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balasan Admin</TableHead>
                    <TableHead className="w-32">Waktu</TableHead>
                    <TableHead className="text-right w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow
                      key={r.id}
                      className="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={r.user?.profile_photo || ""} />
                            <AvatarFallback>
                              {(r.user?.full_name || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              <UserNameWithRole
                                displayName={r.user?.full_name || "—"}
                                role={r.user?.user_type}
                                className="truncate inline-block max-w-full"
                              />
                            </div>
                            {r.user?.email && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.user.email}</p>
                            )}
                            {r.user?.username && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">@{r.user.username}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-xs whitespace-pre-wrap break-words line-clamp-3">
                          {r.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        {r.admin_reply ? (
                          <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
                            Dibalas
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Belum dibalas
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.admin_reply ? (
                          <div className="space-y-0.5">
                            <p className="text-sm max-w-xs whitespace-pre-wrap break-words line-clamp-2">
                              {r.admin_reply}
                            </p>
                            {r.admin_replied_at && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {format(new Date(r.admin_replied_at), "dd MMM yyyy HH:mm", { locale: id })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                          locale: id,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReplyDialog(r)}
                          className="h-8"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          {r.admin_reply ? "Edit Balasan" : "Balas"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Halaman {currentPage} dari {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Balas Report
            </AlertDialogTitle>
            <AlertDialogDescription>
              Balasan akan dikirim ke user yang melaporkan dan mereka akan menerima notifikasi realtime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {replyTarget && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-zinc-500">Report dari: {replyTarget.user?.full_name || "—"}</Label>
                <p className="text-sm mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300">
                  {replyTarget.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Balasan Admin</Label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Tulis balasan untuk user yang melaporkan..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={replying}>Batal</AlertDialogCancel>
            <Button onClick={handleReply} disabled={replying || !replyText.trim()}>
              {replying ? (
                <>
                  <Skeleton className="h-4 w-4 mr-2 shrink-0 animate-pulse" />
                  Mengirim...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Kirim Balasan
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
