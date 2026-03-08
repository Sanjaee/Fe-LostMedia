"use client";

import React, { useEffect, useState } from "react";
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

  const orderId = typeof router.query.order_id === "string" ? router.query.order_id : "";

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent("/payment/success" + (orderId ? `?order_id=${orderId}` : ""))}`);
      return;
    }
    if (sessionStatus !== "authenticated" || !orderId) {
      if (router.isReady && !orderId) {
        queueMicrotask(() => {
          setState("error");
          setErrorMessage("Parameter order_id tidak ditemukan.");
        });
      }
      return;
    }

    let cancelled = false;
    (api as { verifyPlisioOrder: (id: string) => Promise<{ payment?: Payment; status?: string }> })
      .verifyPlisioOrder(orderId)
      .then((res: { payment?: Payment; status?: string }) => {
        if (cancelled) return;
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
        if (cancelled) return;
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

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, orderId, router.isReady, api, update, toast]);

  if (sessionStatus === "loading" || !router.isReady) {
    return (
      <div className="container max-w-md py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Memverifikasi pembayaran...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-8 w-8" />
              <CardTitle>Verifikasi gagal</CardTitle>
            </div>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default">
              <Link href="/role">Kembali ke halaman Role</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <CardTitle>Menunggu konfirmasi</CardTitle>
            </div>
            <CardDescription>
              Pembayaran Anda sedang diproses. Role akan diperbarui otomatis setelah konfirmasi. Anda dapat menutup halaman ini dan kembali nanti.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default">
              <Link href="/role">Ke halaman Role</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8" />
              <CardTitle>Pembayaran berhasil</CardTitle>
            </div>
            <CardDescription>
              Role Anda telah aktif. Session diperbarui—navbar dan halaman akan menampilkan role baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default">
              <Link href="/role">Ke halaman Role</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-12 flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
      <p className="text-muted-foreground">Memverifikasi pembayaran...</p>
    </div>
  );
}
