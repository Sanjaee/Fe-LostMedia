"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoleBadge, getRoleNameClass } from "@/utils/roleStyles";
import type { RolePrice } from "@/types/role";

declare global {
  interface Window {
    MidtransNew3ds?: {
      getCardToken: (
        cardData: Record<string, unknown>,
        callbacks: {
          onSuccess: (response: { token_id: string }) => void;
          onFailure: (response: unknown) => void;
        }
      ) => void;
      authenticate: (
        url: string,
        options: {
          performAuthentication: (url: string) => void;
          onSuccess: (response: unknown) => void;
          onFailure: () => void;
          onPending: (response: unknown) => void;
        }
      ) => void;
    };
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "SB-Mid-client-AyXigF7mydBiMeLq";
const midtransEnv = process.env.NEXT_PUBLIC_MIDTRANS_ENV || "sandbox";

const getPaymentMethodLogo = (method: string, bank?: string): string | null => {
  const base = "https://simulator.sandbox.midtrans.com/assets/images/payment_partners";
  if (method === "qris") return `${base}/e_wallet/qris.png`;
  if (method === "gopay") return `${base}/e_wallet/gopay.png`;
  if (method === "credit_card") return `${base}/card/credit_card.png`;
  if (method === "bank_transfer" && bank) {
    const banks: Record<string, string> = {
      bca: `${base}/bank_transfer/bca_va.png`,
      bni: `${base}/bank_transfer/bni_va.png`,
      bri: `${base}/bank_transfer/bri_va.png`,
      permata: `${base}/bank_transfer/permata_va.svg`,
      mandiri: `${base}/bank_transfer/mandiri_va.png`,
    };
    return banks[bank.toLowerCase()] || null;
  }
  return null;
};

const PAYMENT_METHODS = [
  { id: "qris" as const, label: "QRIS" },
  { id: "gopay" as const, label: "GoPay" },
  { id: "bank_transfer" as const, label: "Bank Transfer" },
  { id: "credit_card" as const, label: "Kartu Kredit" },
];

const BANKS = ["bca", "bni", "bri", "permata", "mandiri"];

const CARD_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const mm = String(i + 1).padStart(2, "0");
  const names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return { value: mm, label: `${mm} - ${names[i]}` };
});

const CARD_YEARS = (() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => {
    const y = current + i;
    return { value: String(y), label: String(y) };
  });
})();

export default function RolePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [rolePrices, setRolePrices] = useState<RolePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RolePrice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "gopay" | "qris" | "credit_card">("gopay");
  const [bank, setBank] = useState("bca");
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [show3DSModal, setShow3DSModal] = useState(false);
  const [url3DS, setUrl3DS] = useState("");

  const close3DSModal = () => {
    setShow3DSModal(false);
    setUrl3DS("");
  };

  const loadRolePrices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/role-prices?include_inactive=false`);
      const data = await res.json();
      const list = data?.role_prices ?? data?.data?.role_prices ?? [];
      setRolePrices(list);
    } catch (err) {
      console.error("Failed to load role prices:", err);
      toast({ title: "Error", description: "Gagal memuat daftar role", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRolePrices();
  }, [loadRolePrices]);

  // Pre-select role from ?select=id query
  useEffect(() => {
    const selectId = router.query.select as string | undefined;
    if (selectId && rolePrices.length > 0 && !selectedRole) {
      const rp = rolePrices.find((r) => r.id === selectId);
      if (rp) setSelectedRole(rp);
    }
  }, [router.query.select, rolePrices, selectedRole]);

  // Load Midtrans script for credit card
  useEffect(() => {
    if (paymentMethod !== "credit_card" || !midtransClientKey) return;
    const scriptId = "midtrans-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "text/javascript";
    script.src = "https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js";
    script.setAttribute("data-environment", midtransEnv);
    script.setAttribute("data-client-key", midtransClientKey);
    script.async = true;
    script.onload = () => {
      /* Midtrans script ready */
    };
    document.body.appendChild(script);
    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [paymentMethod]);

  const handlePay = async () => {
    if (!selectedRole) return;
    if (!session?.user) {
      toast({ title: "Login diperlukan", description: "Silakan login untuk upgrade role", variant: "destructive" });
      router.push("/auth/login");
      return;
    }

    setLoadingPayment(true);
    setShowConfirm(false);

    try {
      if (paymentMethod === "credit_card") {
        if (!midtransClientKey || !window.MidtransNew3ds) {
          toast({ title: "Error", description: "Midtrans belum siap. Coba lagi.", variant: "destructive" });
          setLoadingPayment(false);
          return;
        }
        const cardNum = (cardNumber || "").replace(/\s/g, "");
        if (!cardNum || cardNum.length < 15) {
          toast({ title: "Error", description: "Nomor kartu tidak valid", variant: "destructive" });
          setLoadingPayment(false);
          return;
        }
        window.MidtransNew3ds.getCardToken(
          {
            card_number: cardNum,
            card_exp_month: parseInt(cardExpMonth || "0", 10) || 1,
            card_exp_year: parseInt(cardExpYear || "0", 10) || new Date().getFullYear(),
            card_cvv: cardCvv || "",
          },
          {
            onSuccess: async (response) => {
              try {
                const { payment } = await api.createPaymentForRole({
                  target_role: selectedRole.role,
                  payment_method: "credit_card",
                  card_token_id: response.token_id,
                  save_card: saveCard,
                });
                if (payment.redirect_url && window.MidtransNew3ds) {
                  window.MidtransNew3ds.authenticate(payment.redirect_url, {
                    performAuthentication: (url: string) => {
                      setUrl3DS(url);
                      setShow3DSModal(true);
                    },
                    onSuccess: () => {
                      close3DSModal();
                      setLoadingPayment(false);
                      router.push(`/role/${payment.order_id}`);
                    },
                    onFailure: () => {
                      close3DSModal();
                      setLoadingPayment(false);
                      toast({
                        title: "Verifikasi 3DS Gagal",
                        description: "Pembayaran ditolak atau dibatalkan.",
                        variant: "destructive",
                      });
                    },
                    onPending: () => {
                      close3DSModal();
                      setLoadingPayment(false);
                      router.push(`/role/${payment.order_id}`);
                    },
                  });
                } else {
                  setLoadingPayment(false);
                  if (payment.redirect_url) window.open(payment.redirect_url, "_blank");
                  router.push(`/role/${payment.order_id}`);
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Gagal membuat pembayaran";
                toast({ title: "Error", description: msg, variant: "destructive" });
              } finally {
                setLoadingPayment(false);
              }
            },
            onFailure: () => {
              toast({ title: "Token gagal", description: "Data kartu tidak valid", variant: "destructive" });
              setLoadingPayment(false);
            },
          }
        );
        return;
      }

      const { payment } = await api.createPaymentForRole({
        target_role: selectedRole.role,
        payment_method: paymentMethod,
        bank: paymentMethod === "bank_transfer" ? bank : undefined,
      });
      router.push(`/role/${payment.order_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat pembayaran";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoadingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upgrade Role</CardTitle>
              <CardDescription>
                Pilih role dan bayar untuk upgrade akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-lg" />
                  ))}
                </div>
              ) : rolePrices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada role tersedia untuk upgrade. Hubungi admin.
                </p>
              ) : !selectedRole ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rolePrices.map((rp) => (
                    <button
                      key={rp.id}
                      type="button"
                      onClick={() => setSelectedRole(rp)}
                      className="role-card p-6 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all cursor-pointer bg-zinc-50 dark:bg-zinc-900/50"
                    >
                      <div className="flex items-center gap-2 mb-2 line-height-30">
                        <span className={getRoleBadge(rp.role)} />
                        <span className={`font-semibold text-lg ${getRoleNameClass(rp.role)}`}>
                          {rp.name}
                        </span>
                      </div>
                      {rp.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {rp.description}
                        </p>
                      )}
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        Rp {rp.price.toLocaleString("id-ID")}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                    <div>
                      <div className="flex items-center gap-2 line-height-30">
                        <span className={getRoleBadge(selectedRole.role)} />
                        <span className={`font-semibold ${getRoleNameClass(selectedRole.role)}`}>{selectedRole.name}</span>
                      </div>
                      <p className="text-lg font-bold text-blue-600 mt-1">
                        Rp {selectedRole.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedRole(null)}>
                      Ganti
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Label>Metode Pembayaran</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PAYMENT_METHODS.map((pm) => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            paymentMethod === pm.id
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-950/50"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                          }`}
                        >
                          {getPaymentMethodLogo(pm.id, bank) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getPaymentMethodLogo(pm.id, bank)!}
                              alt={pm.label}
                              className="h-10 w-10 object-contain"
                            />
                          )}
                          <span className="text-xs font-medium">{pm.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === "bank_transfer" && (
                    <div className="space-y-2">
                      <Label>Pilih Bank</Label>
                      <div className="flex flex-wrap gap-2">
                        {BANKS.map((b) => (
                          <Button
                            key={b}
                            type="button"
                            variant={bank === b ? "default" : "outline"}
                            size="sm"
                            onClick={() => setBank(b)}
                          >
                            {b.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {paymentMethod === "credit_card" && (
                    <div className="space-y-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      {!midtransClientKey && (
                        <p className="text-sm text-amber-600">
                          Set NEXT_PUBLIC_MIDTRANS_CLIENT_KEY untuk kartu kredit.
                        </p>
                      )}
                      <div className="grid gap-3">
                        <div>
                          <Label>Nomor Kartu</Label>
                          <Input
                            placeholder="4811 1111 1111 1114"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 19))}
                            maxLength={19}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Bulan (MM)</Label>
                            <Select value={cardExpMonth || undefined} onValueChange={setCardExpMonth}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Bulan" />
                              </SelectTrigger>
                              <SelectContent>
                                {CARD_MONTHS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tahun (YYYY)</Label>
                            <Select value={cardExpYear || undefined} onValueChange={setCardExpYear}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tahun" />
                              </SelectTrigger>
                              <SelectContent>
                                {CARD_YEARS.map((y) => (
                                  <SelectItem key={y.value} value={y.value}>
                                    {y.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>CVV</Label>
                          <Input
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            maxLength={4}
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveCard}
                            onChange={(e) => setSaveCard(e.target.checked)}
                          />
                          <span className="text-sm">Simpan kartu</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowConfirm(true)}
                      disabled={loadingPayment}
                      className="flex-1"
                    >
                      {loadingPayment ? "Memproses..." : "Bayar Rp " + selectedRole.price.toLocaleString("id-ID")}
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedRole(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {status === "unauthenticated" && (
            <p className="text-center text-muted-foreground mt-4">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Login
              </Link>
              {" "}untuk upgrade role.
            </p>
          )}
        </div>

      {/* Konfirmasi */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembayaran</AlertDialogTitle>
            <AlertDialogDescription>
              Upgrade ke <strong>{selectedRole?.name}</strong> sebesar Rp{" "}
              {selectedRole?.price.toLocaleString("id-ID")}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handlePay} disabled={loadingPayment}>
              {loadingPayment ? "Memproses..." : "Ya, Bayar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog 3D Secure OTP - Verifikasi Issuing Bank */}
      {show3DSModal && url3DS && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col w-full max-w-[480px] sm:max-w-[520px] overflow-hidden border border-zinc-200 dark:border-zinc-800"
            style={{ height: "90vh", maxHeight: "640px" }}
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Verifikasi 3D Secure</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Issuing Bank</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close3DSModal}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                aria-label="Tutup"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/50 shrink-0">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Sandbox: masukkan <strong className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">112233</strong> di kolom Password pada halaman bank di bawah.
              </p>
            </div>
            <div className="flex-1 min-h-0 relative bg-zinc-50 dark:bg-zinc-950">
              <iframe
                title="Issuing Bank - 3D Secure"
                src={url3DS}
                className="absolute inset-0 w-full h-full border-0 bg-white dark:bg-zinc-900 rounded-b-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
