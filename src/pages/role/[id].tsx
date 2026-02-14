"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoleBadge } from "@/utils/roleStyles";
import type { RolePrice } from "@/types/role";
import type { Payment } from "@/types/payment";

const getPaymentMethodLogo = (method: string, bankType?: string): string | null => {
  const base = "https://simulator.sandbox.midtrans.com/assets/images/payment_partners";
  if (method === "qris") return `${base}/e_wallet/qris.png`;
  if (method === "gopay") return `${base}/e_wallet/gopay.png`;
  if (method === "credit_card") return `${base}/card/credit_card.png`;
  if (method === "bank_transfer" && bankType) {
    const banks: Record<string, string> = {
      bca: `${base}/bank_transfer/bca_va.png`,
      bri: `${base}/bank_transfer/bri_va.png`,
      bni: `${base}/bank_transfer/bni_va.png`,
      permata: `${base}/bank_transfer/permata_va.svg`,
      mandiri: `${base}/bank_transfer/mandiri_va.png`,
    };
    return banks[bankType.toLowerCase()] || null;
  }
  return null;
};

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    qris: "QRIS",
    gopay: "GoPay",
    bank_transfer: "Bank Transfer",
    credit_card: "Credit Card",
  };
  return labels[method] || method.toUpperCase();
};

export default function RoleIdPage() {
  const router = useRouter();
  const { id } = router.query;
  const { api } = useApi();
  const { data: session, update: updateSession } = useSession();
  const [rolePrice, setRolePrice] = useState<RolePrice | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [statusChanged, setStatusChanged] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRefreshedForPaymentRef = useRef(false);

  const isPaymentOrderId = typeof id === "string" && id.startsWith("PAY_");

  const fetchPayment = useCallback(async () => {
    if (!id || typeof id !== "string" || !isPaymentOrderId) return;
    try {
      const { payment: p } = await api.getPaymentByOrderId(id);
      setPreviousStatus(p.status);
      setPayment(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pembayaran");
    } finally {
      setLoading(false);
    }
  }, [id, isPaymentOrderId, api]);

  const loadRole = useCallback(async () => {
    if (!id || typeof id !== "string" || isPaymentOrderId) return;
    try {
      const { role_price } = await api.getRolePrice(id);
      setRolePrice(role_price);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat role");
    } finally {
      setLoading(false);
    }
  }, [id, isPaymentOrderId, api]);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    setLoading(true);
    setError(null);
    if (isPaymentOrderId) {
      fetchPayment();
    } else {
      loadRole();
    }
  }, [id, isPaymentOrderId, fetchPayment, loadRole]);

  // Poll payment status if pending
  useEffect(() => {
    if (!payment || payment.status !== "pending" || !isPaymentOrderId) return;
    const pollInterval = setInterval(async () => {
      try {
        const { payment: updated } = await api.checkPaymentStatus(payment.order_id);
        setPayment((prev) => {
          if (!prev) return updated;
          if (prev.status !== updated.status) {
            setPreviousStatus(prev.status);
            setStatusChanged(true);
            setTimeout(() => setStatusChanged(false), 1000);
          }
          return updated;
        });
        if (updated.status !== "pending") clearInterval(pollInterval);
      } catch {
        // ignore poll errors
      }
    }, 5000);
    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.id, payment?.status, isPaymentOrderId, api]);

  // WebSocket for real-time payment status
  useEffect(() => {
    if (!id || !payment || payment.status !== "pending" || !session?.accessToken) return;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    const wsUrl = `${wsProtocol}//${wsHost}/ws?token=${encodeURIComponent(session.accessToken)}`;

    const connect = () => {
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };
        ws.onmessage = (event) => {
          try {
            const raw = event.data.toString().trim();
            if (!raw) return;
            const msgs = raw.includes("\n") ? raw.split("\n").filter((m: string) => m.trim()) : [raw];
            for (const msg of msgs) {
              const data = JSON.parse(msg.trim());
              const payload = data.payload || data;
              const isPaymentStatus = payload.type === "payment_status" || data.type === "payment_status";
              const p = payload.payment || payload;
              const matchesOrder = p?.order_id === id;
              if (isPaymentStatus && matchesOrder && p && p.status !== payment.status) {
                setPreviousStatus(payment.status);
                setStatusChanged(true);
                setTimeout(() => setStatusChanged(false), 1000);
                setPayment((prev) => (prev ? { ...prev, ...p } : prev));
              }
            }
          } catch {
            /* ignore */
          }
        };
        ws.onclose = (e) => {
          if (e.code !== 1000 && payment?.status === "pending" && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
          }
        };
        wsRef.current = ws;
      } catch {
        if (payment?.status === "pending" && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    };
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, payment?.status, session?.accessToken]);

  const formatAmount = (amount: number) => `Rp${amount.toLocaleString("id-ID")}`;
  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => n.toString().padStart(2, "0"))
      .join(":");
  };
  const formatExpiryDate = (expiry?: string) => {
    if (!expiry) return "";
    const d = new Date(expiry);
    return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}, ${formatTime(expiry)}`;
  };
  const getRemainingTime = (expiry?: string) => {
    if (!expiry) return "";
    const diff = new Date(expiry).getTime() - Date.now();
    if (diff <= 0) return "00:00:00";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
  };

  useEffect(() => {
    if (!payment?.expiry_time || payment.status !== "pending") return;
    const tick = () => setCountdown(getRemainingTime(payment.expiry_time));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [payment?.expiry_time, payment?.status]);

  // Refresh session once when payment succeeds (single hit, no loop)
  useEffect(() => {
    if (
      payment?.status === "success" &&
      updateSession &&
      !sessionRefreshedForPaymentRef.current
    ) {
      sessionRefreshedForPaymentRef.current = true;
      updateSession().catch(() => {});
    }
  }, [payment?.status, updateSession]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const downloadQRCode = () => {
    if (!payment?.qr_code_url) return;
    fetch(payment.qr_code_url)
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `qr-${payment.order_id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      success: "Berhasil",
      pending: "Menunggu Pembayaran",
      failed: "Gagal",
      cancelled: "Dibatalkan",
      expired: "Kedaluwarsa",
    };
    return map[status] || status;
  };

  if (!id || typeof id !== "string") {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center px-4">
        <p className="text-muted-foreground text-center">ID tidak valid</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4 flex justify-center">
        <div className="w-full max-w-md">
          <Skeleton className="h-48 w-full rounded-xl mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Payment detail page (order_id = PAY_xxx)
  if (isPaymentOrderId && payment) {
    const logo = getPaymentMethodLogo(payment.payment_method, payment.bank_type);
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4">
        <div className="w-full max-w-md mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
            <div className="py-4 flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/role")}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <h1 className="text-lg font-semibold">Payment</h1>
            </div>

            {payment.status === "pending" && payment.expiry_time && (
              <div className="bg-black text-white dark:bg-zinc-900 px-4 py-3 mb-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-300">Selesaikan sebelum </span>
                    <span className="text-sm font-medium">{formatExpiryDate(payment.expiry_time)}</span>
                  </div>
                  {countdown && (
                    <div className="bg-zinc-800 px-3 py-1 rounded-lg">
                      <span className="text-sm font-mono font-semibold">{countdown}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {payment.status === "pending" && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden mb-4">
                <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                  {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={getPaymentMethodLabel(payment.payment_method)} className="h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
                <div className="px-6 pb-4">
                  <p className="text-sm font-semibold">{payment.customer_name || "Upgrade Role"}</p>
                  <p className="text-xs text-gray-500 mt-1">Order ID: {payment.order_id}</p>
                </div>

                {/* QR Code untuk QRIS / GoPay */}
                {(payment.payment_method === "qris" || payment.payment_method === "gopay") && payment.qr_code_url && (
                  <div className="px-6 pb-4 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={payment.qr_code_url} alt="QR Code" className="w-64 h-64 border-2 border-gray-100 dark:border-zinc-800 rounded-xl" />
                  </div>
                )}

                {/* VA Number untuk Bank Transfer */}
                {payment.payment_method === "bank_transfer" && payment.va_number && (
                  <div className="px-6 pb-4">
                    <div className="bg-gray-50 dark:bg-zinc-800 py-6 rounded-xl text-center">
                      <p className="text-black dark:text-white font-bold font-mono tracking-wider break-all text-lg">
                        {payment.va_number}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Bank: {payment.bank_type?.toUpperCase()}
                      </p>
                      <Button onClick={() => copyToClipboard(payment.va_number!, "va")} className="mt-4">
                        {copied === "va" ? "✓ Disalin" : "Salin VA"}
                      </Button>
                    </div>
                  </div>
                )}

                {payment.payment_method === "credit_card" && payment.redirect_url && (
                  <div className="px-6 pb-4">
                    <div className="bg-gray-50 dark:bg-zinc-800 py-6 rounded-xl text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selesaikan verifikasi 3D Secure</p>
                      {payment.masked_card && <p className="text-black dark:text-white font-mono text-sm mb-3">{payment.masked_card}</p>}
                      <a href={payment.redirect_url} target="_blank" rel="noopener noreferrer">
                        <Button>Lanjutkan ke 3D Secure →</Button>
                      </a>
                    </div>
                  </div>
                )}

                <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                    <span className="text-lg font-bold">{formatAmount(payment.total_amount || payment.amount)}</span>
                  </div>
                  {(payment.payment_method === "qris" || payment.payment_method === "gopay") && payment.qr_code_url && (
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => copyToClipboard(payment.qr_code_url!, "qr")}>
                        {copied === "qr" ? "✓ Disalin" : "Salin URL QR"}
                      </Button>
                      <Button className="flex-1" onClick={downloadQRCode}>
                        Download QR
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {payment.status === "success" && (
              <div className={`transition-all duration-500 ${statusChanged && previousStatus === "pending" ? "animate-in fade-in" : ""}`}>
                <div className="flex flex-col items-center py-5">
                  <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">Pembayaran Berhasil</h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border p-6 mb-4">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Tanggal</span>
                      <span className="text-sm font-medium">{new Date(payment.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Item</span>
                      <span className="text-sm font-medium">{payment.item_name}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="text-sm font-bold">{formatAmount(payment.total_amount || payment.amount)}</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => router.push("/role")}>
                  Selesai
                </Button>
              </div>
            )}

            {["failed", "cancelled", "expired"].includes(payment.status) && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
                <div className="flex flex-col items-center py-4">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold">Pembayaran {getStatusText(payment.status)}</h2>
                </div>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Silakan coba lagi atau hubungi support.</p>
                <Button className="w-full" onClick={() => router.push("/role")}>
                  Kembali
                </Button>
              </div>
            )}
        </div>
      </div>
    );
  }

  if (isPaymentOrderId && error) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
        <p className="text-destructive mb-4 text-center">{error}</p>
        <Button asChild variant="outline">
          <Link href="/role">Kembali ke Role</Link>
        </Button>
      </div>
    );
  }

  // Role price detail page
  if (!rolePrice) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
        <p className="text-destructive mb-4 text-center">{error || "Role tidak ditemukan"}</p>
        <Button asChild variant="outline">
          <Link href="/role">Kembali ke Daftar Role</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4">
      <div className="w-full max-w-md sm:max-w-lg mx-auto">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className={getRoleBadge(rolePrice.role)} />
              <h1 className="text-2xl font-bold">{rolePrice.name}</h1>
            </div>
            {rolePrice.description && <p className="text-muted-foreground mb-6">{rolePrice.description}</p>}
            <p className="text-3xl font-bold text-blue-600 mb-6">Rp {rolePrice.price.toLocaleString("id-ID")}</p>
            <Button asChild>
              <Link href={`/role?select=${rolePrice.id}`}>Upgrade Sekarang</Link>
            </Button>
          </div>
        </div>
    </div>
  );
}
