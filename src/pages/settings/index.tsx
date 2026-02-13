"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Settings, User, Shield, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loginType, setLoginType] = useState<string>("credential");

  const CONFIRM_TEXT = "HAPUS";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      api
        .getMe()
        .then((res: any) => {
          const user = res?.user ?? res?.data?.user ?? res;
          setLoginType(user?.login_type || user?.loginType || "credential");
        })
        .catch(() => {
          setLoginType("credential");
        });
    }
  }, [status, session?.user?.id, api]);

  const needsPassword = loginType === "credential";
  const canDelete =
    deleteConfirm === CONFIRM_TEXT && (needsPassword ? deletePassword.length >= 8 : true);

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await api.deleteAccount(needsPassword ? deletePassword : undefined);
      toast({
        title: "Akun berhasil dihapus",
        description: "Anda akan diarahkan ke halaman login.",
      });
      await signOut({ callbackUrl: "/auth/login" });
      router.push("/auth/login");
    } catch (err: any) {
      toast({
        title: "Gagal menghapus akun",
        description: err?.message || "Terjadi kesalahan. Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setDeleteConfirm("");
    }
  };

  const openDeleteDialog = () => {
    setDeletePassword("");
    setDeleteConfirm("");
    setDeleteDialogOpen(true);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Settings className="h-7 w-7" />
            Pengaturan
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Kelola pengaturan akun dan preferensi Anda
          </p>
        </div>

        <div className="space-y-6">
          {/* General Section - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Umum
              </CardTitle>
              <CardDescription>Informasi dasar dan preferensi akun</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Pengaturan umum akan tersedia segera.
              </p>
            </CardContent>
          </Card>

          {/* Privacy Section - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privasi & Keamanan
              </CardTitle>
              <CardDescription>Kontrol privasi dan keamanan akun</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Pengaturan privasi akan tersedia segera.
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone - Delete Account */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
                Zona Bahaya
              </CardTitle>
              <CardDescription>
                Tindakan permanen yang tidak dapat dibatalkan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
                Menghapus akun akan menghapus permanen semua data termasuk profil, postingan,
                dan percakapan. Tindakan ini tidak dapat dibatalkan.
              </p>
              <Button
                variant="destructive"
                onClick={openDeleteDialog}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Akun
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data akun Anda akan dihapus permanen.
              Ketik <strong>{CONFIRM_TEXT}</strong> untuk mengonfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {needsPassword && (
              <div className="space-y-2">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  placeholder="Masukkan password Anda"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="border-zinc-300 dark:border-zinc-700"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Ketik {CONFIRM_TEXT} untuk konfirmasi
              </Label>
              <Input
                id="delete-confirm"
                type="text"
                placeholder={CONFIRM_TEXT}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
                className="border-zinc-300 dark:border-zinc-700 font-mono uppercase"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!canDelete || deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Skeleton className="mr-2 h-4 w-4 shrink-0" />
                  Menghapus...
                </>
              ) : (
                "Hapus Akun"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
