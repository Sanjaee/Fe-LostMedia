"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { Payment } from "@/types/payment";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { status: sessionStatus, update } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [state, setState] = useState<"loading" | "success" | "pending" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const verifyStartedRef = useRef(false);

  const orderId = typeof router.query.order_id === "string" ? router.query.order_id : "";

  // Satu kali verifikasi saat sudah login dan ada order_id — tanpa polling/loop
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace(
        `/auth/login?callbackUrl=${encodeURIComponent("/payment/success" + (orderId ? `?order_id=${orderId}` : ""))}`
      );
      return;
    }
    if (sessionStatus !== "authenticated" || !orderId) {
      return;
    }
    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;

    (api as { verifyPlisioOrder: (id: string) => Promise<{ payment?: Payment; status?: string }> })
      .verifyPlisioOrder(orderId)
      .then((res: { payment?: Payment; status?: string }) => {
        const status = res?.status ?? "pending";
        const payment = res?.payment;
        if (status === "success") {
          setState("success");
          update().then(() => {
            toast({
              title: "Pembayaran berhasil",
              description: payment?.target_role
                ? `Role ${payment.target_role} telah aktif. Session diperbarui.`
                : "Session diperbarui.",
            });
          }).catch(() => {});
        } else {
          setState("pending");
        }
      })
      .catch((err: Error & { response?: { status: number } }) => {
        const msg = err?.message || "Gagal memverifikasi pembayaran.";
        const status = err?.response?.status ?? 0;
        if (status === 403) {
          setErrorMessage("Pembayaran ini milik akun lain. Anda tidak dapat mengklaimnya.");
        } else if (status === 404) {
          setErrorMessage("Pembayaran tidak ditemukan.");
        } else {
          setErrorMessage(msg);
        }
        setState("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- verify once only, no api/update/toast to avoid re-run
  }, [sessionStatus, orderId, router.isReady]);

  // Redirect / tampilkan error jika belum login atau tidak ada order_id
  if (sessionStatus === "unauthenticated") return null;
  if (sessionStatus !== "authenticated" || !router.isReady) {
    return (
      <div className="container max-w-md py-12 flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Verifikasi gagal
            </CardTitle>
            <CardDescription>Parameter order_id tidak ditemukan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/role">Kembali ke halaman Role</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Satu layout card untuk semua state (loading / success / pending / error)
  return (
    <div className="container max-w-md py-12">
      <Card>
        {state === "loading" && (
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Memverifikasi pembayaran...</p>
            </div>
          </CardHeader>
        )}

        {state === "error" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Verifikasi gagal
              </CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/role">Kembali ke halaman Role</Link>
              </Button>
            </CardContent>
          </>
        )}

        {state === "pending" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Menunggu konfirmasi
              </CardTitle>
              <CardDescription>
                Pembayaran sedang diproses. Role akan diperbarui setelah konfirmasi. Anda bisa menutup halaman ini dan kembali nanti.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/role">Ke halaman Role</Link>
              </Button>
            </CardContent>
          </>
        )}

        {state === "success" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Pembayaran berhasil
              </CardTitle>
              <CardDescription>
                Role Anda telah aktif. Session diperbarui—navbar dan halaman akan menampilkan role baru.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/role">Ke halaman Role</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
