"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { Ban, LogOut, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface BanInfo {
  is_banned: boolean;
  banned_until: string;
  ban_reason: string;
}

export default function BanDialog() {
  const { data: session, status } = useSession();
  const { api } = useApi();
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Real-time: listen for user_banned via WebSocket ----
  useWebSocketSubscription(
    useCallback((data: any) => {
      const payload = data?.payload || data;
      const innerType = payload?.type || payload?.payload?.type;
      const inner = innerType === "user_banned" ? payload : payload?.payload;

      if (inner?.type === "user_banned" && inner?.banned_until) {
        setBanInfo({
          is_banned: true,
          banned_until: inner.banned_until,
          ban_reason: inner.ban_reason || "Melanggar ketentuan layanan",
        });
      }
    }, [])
  );

  // ---- Listen for ban events dispatched by api.ts on 403 ----
  useEffect(() => {
    const handleBanEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.banned_until) {
        setBanInfo({
          is_banned: true,
          banned_until: detail.banned_until,
          ban_reason: detail.ban_reason || "Melanggar ketentuan layanan",
        });
      }
    };
    window.addEventListener("user-banned", handleBanEvent);
    return () => window.removeEventListener("user-banned", handleBanEvent);
  }, []);

  // ---- Initial check on mount via /auth/me (one-time, no polling) ----
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getMe();
        if (cancelled) return;
        const user = res.user ?? (res as any).data?.user;
        if (user && user.is_banned && user.banned_until) {
          const bannedUntil = new Date(user.banned_until);
          if (bannedUntil > new Date()) {
            setBanInfo({
              is_banned: true,
              banned_until: user.banned_until,
              ban_reason: user.ban_reason || "Melanggar ketentuan layanan",
            });
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        const d = err?.response?.data;
        if (d?.is_banned && d?.banned_until) {
          setBanInfo({
            is_banned: true,
            banned_until: d.banned_until,
            ban_reason: d.ban_reason || "Melanggar ketentuan layanan",
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [status, session, api]);

  // Countdown timer
  useEffect(() => {
    if (!banInfo?.banned_until) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const until = new Date(banInfo.banned_until);
      const diff = until.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("");
        setBanInfo(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days} hari`);
      if (hours > 0) parts.push(`${hours} jam`);
      if (minutes > 0) parts.push(`${minutes} menit`);
      parts.push(`${seconds} detik`);
      setTimeLeft(parts.join(" "));
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [banInfo]);

  if (!banInfo) return null;

  const bannedUntilDate = new Date(banInfo.banned_until);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-red-300 bg-white p-8 shadow-2xl dark:border-red-800 dark:bg-zinc-900">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <Ban className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-2xl font-bold text-red-600 dark:text-red-400">
          Akun Anda Dibanned
        </h2>

        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Akun Anda telah dibatasi aksesnya oleh administrator.
        </p>

        {/* Ban Details */}
        <div className="mb-6 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Alasan
            </span>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {banInfo.ban_reason}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Berakhir pada
            </span>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {format(bannedUntilDate, "dd MMMM yyyy, HH:mm", { locale: idLocale })}
            </p>
            <p className="text-xs text-zinc-500">
              ({formatDistanceToNow(bannedUntilDate, { addSuffix: true, locale: idLocale })})
            </p>
          </div>

          {/* Countdown */}
          {timeLeft && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Sisa Waktu
              </span>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-mono font-semibold text-orange-600 dark:text-orange-400">
                  {timeLeft}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>

        <p className="mt-4 text-center text-xs text-zinc-400">
          Jika Anda merasa ini adalah kesalahan, hubungi administrator.
        </p>
      </div>
    </div>
  );
}
