"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleBadge, getRoleDisplayName } from "@/utils/roleStyles";
import type { Payment } from "@/types/payment";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus, update } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [state, setState] = useState<"loading" | "success" | "pending" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [successPayment, setSuccessPayment] = useState<Payment | null>(null);
  const verifyStartedRef = useRef(false);

  const orderId = typeof router.query.order_id === "string" ? router.query.order_id : "";
  const userName =
    successPayment?.customer_name ||
    (session?.user as { name?: string })?.name ||
    (session?.user as { full_name?: string })?.full_name ||
    "";
  const targetRole = successPayment?.target_role ?? "";
  const roleLabel = targetRole ? getRoleDisplayName(targetRole) : "";

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
          if (payment) setSuccessPayment(payment);
          setState("success");
          update().then(() => {
            const roleName = payment?.target_role ? getRoleDisplayName(payment.target_role) : "role baru";
            toast({
              title: "Selamat! Upgrade Anda berhasil.",
              description: `${roleName} sudah aktif. Terima kasih telah mempercayakan kami!`,
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
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  const cardWrapper = "min-h-[60vh] sm:min-h-[70vh] flex items-center justify-center px-4 py-8 sm:py-12";
  const cardInner = "w-full max-w-md mx-auto";

  if (!orderId) {
    return (
      <div className={cardWrapper}>
        <div className={cardInner}>
          <Card className="shadow-lg">
            <CardHeader className="text-center sm:text-left">
              <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                Verifikasi gagal
              </CardTitle>
              <CardDescription className="text-center sm:text-left">
                Parameter order_id tidak ditemukan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center sm:justify-start">
              <Button asChild>
                <Link href="/">Kembali ke Beranda</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Satu layout card untuk semua state — di tengah, responsif
  return (
    <div className={cardWrapper}>
      <div className={cardInner}>
        <Card className="shadow-lg overflow-hidden">
          {state === "loading" && (
            <CardHeader className="text-center py-10 sm:py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Memverifikasi pembayaran...</p>
              </div>
            </CardHeader>
          )}

          {state === "error" && (
            <>
              <CardHeader className="text-center sm:text-left">
                <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-destructive">
                  <XCircle className="h-5 w-5 shrink-0" />
                  Verifikasi gagal
                </CardTitle>
                <CardDescription className="text-center sm:text-left">{errorMessage}</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center sm:justify-start">
                <Button asChild>
                  <Link href="/">Kembali ke Beranda</Link>
                </Button>
              </CardContent>
            </>
          )}

          {state === "pending" && (
            <>
              <CardHeader className="text-center sm:text-left">
                <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  Menunggu konfirmasi
                </CardTitle>
                <CardDescription className="text-center sm:text-left">
                  Pembayaran sedang diproses. Role akan diperbarui setelah konfirmasi. Anda bisa menutup halaman ini dan kembali nanti.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center sm:justify-start">
                <Button asChild variant="outline">
                  <Link href="/">Kembali ke Beranda</Link>
                </Button>
              </CardContent>
            </>
          )}

          {state === "success" && (
            <>
              <CardHeader className="text-center space-y-5 pt-8 sm:pt-10 pb-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 ring-4 ring-green-200/50 dark:ring-green-800/30">
                  <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                    {userName ? (
                      <>
                        Selamat, <span className="text-green-600 dark:text-green-400">{userName}</span>!
                      </>
                    ) : (
                      "Selamat! Upgrade Anda berhasil."
                    )}
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {roleLabel ? (
                      <>
                        Anda sekarang resmi sebagai{" "}
                        <Badge variant="secondary" className={cn(getRoleBadge(targetRole), "font-semibold mx-0.5")}>{roleLabel}</Badge>
                        . Terima kasih telah mempercayakan kami—selamat menikmati manfaatnya!
                      </>
                    ) : (
                      "Terima kasih telah mempercayakan upgrade Anda. Selamat menikmati manfaatnya!"
                    )}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center pb-8 sm:pb-10">
                <Button asChild size="lg" className="min-w-[200px]">
                  <Link href="/">Kembali ke Beranda</Link>
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
