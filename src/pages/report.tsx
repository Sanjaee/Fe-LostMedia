"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function ReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { api } = useApi();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);

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
    } catch (err: any) {
      toast({
        title: "Gagal",
        description: err.message || "Gagal mengirim report",
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
      <div className="max-w-xl mx-auto">
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
