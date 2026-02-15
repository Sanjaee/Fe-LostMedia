"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useApi } from "@/components/contex/ApiProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export interface AdminReport {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  user?: {
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

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (refreshTrigger > 0) loadReports();
  }, [refreshTrigger, loadReports]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Reports
          </CardTitle>
          <CardDescription>Daftar report dari pengguna</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error}</p>
        )}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
            Belum ada report
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="w-32">Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">
                          {r.user?.full_name || "—"}
                        </p>
                        {r.user?.email && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {r.user.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-md whitespace-pre-wrap break-words">
                        {r.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </Card>
  );
}
