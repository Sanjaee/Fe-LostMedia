"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, MessageSquare, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface MyReport {
  id: string;
  description: string;
  admin_reply?: string;
  admin_replied_at?: string;
  admin?: { full_name?: string; email?: string };
  created_at: string;
}

export default function ReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { api } = useApi();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsTotal, setReportsTotal] = useState(0);

  const loadMyReports = useCallback(async () => {
    if (!session?.user) return;
    setReportsLoading(true);
    try {
      const res = await api.getMyReports(20, 0);
      setMyReports(res.reports || []);
      setReportsTotal(res.total || 0);
    } catch {
      setMyReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [api, session?.user]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      loadMyReports();
    }
  }, [status, session?.user, loadMyReports]);

  useWebSocketSubscription((data: { type?: string; payload?: { type?: string } }) => {
    const notif = data.type === "notification" && data.payload ? data.payload : data;
    if ((notif as { type?: string })?.type === "report_reply") {
      loadMyReports();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      toast({ title: "Login diperlukan", description: "Silakan login untuk mengirim report", variant: "destructive" });
      router.push("/auth/login");
      return;
    }

    const desc = description.trim();
    if (!desc) {
      toast({ title: "Deskripsi wajib", description: "Isi deskripsi report Anda", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await api.createReport(desc);
      setSubmitted(true);
      setThankYouOpen(true);
      setDescription("");
      loadMyReports();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: "Gagal",
        description: e?.message || "Gagal mengirim report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <CardTitle className="text-xl">Kirim Report</CardTitle>
            </div>
            <CardDescription>
              Laporkan masalah, saran, atau keluhan. Tim kami akan meninjau sesegera mungkin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "unauthenticated" ? (
              <div className="text-center py-6">
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Login terlebih dahulu untuk mengirim report
                </p>
                <Button asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
              </div>
            ) : submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Report Anda telah kami terima
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Terima kasih atas kontribusi Anda. Tim kami akan meninjau sesegera mungkin.
                </p>
                <Button onClick={() => setSubmitted(false)} variant="outline" className="mr-2">
                  Kirim Report Lain
                </Button>
                <Button asChild>
                  <Link href="/">Kembali ke Beranda</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tuliskan masalah, saran, atau keluhan Anda..."
                    rows={5}
                    className="mt-2"
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Mengirim..." : "Kirim Report"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/">Batal</Link>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {status === "authenticated" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Saya</CardTitle>
              <CardDescription>
                Daftar report yang telah Anda kirim beserta balasan dari admin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : myReports.length === 0 ? (
                <p className="text-center text-zinc-500 dark:text-zinc-400 py-6">
                  Belum ada report. Kirim report pertama Anda di atas.
                </p>
              ) : (
                <div className="space-y-4">
                  {myReports.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(r.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                        </span>
                        {r.admin_reply ? (
                          <Badge variant="default" className="text-xs bg-green-600">Dibalas</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Menunggu</Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {r.description}
                      </p>
                      {r.admin_reply && (
                        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>
                              Balasan Admin
                              {r.admin?.full_name && ` (${r.admin.full_name})`}
                              {r.admin_replied_at && ` · ${format(new Date(r.admin_replied_at), "dd MMM yyyy", { locale: id })}`}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 rounded p-3 whitespace-pre-wrap">
                            {r.admin_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={thankYouOpen} onOpenChange={setThankYouOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Terima Kasih
              </DialogTitle>
            </DialogHeader>
            <p className="text-zinc-600 dark:text-zinc-400">
              Report Anda berhasil dikirim. Tim kami akan meninjau sesegera mungkin.
            </p>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
