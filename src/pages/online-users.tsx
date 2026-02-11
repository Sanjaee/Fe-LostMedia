"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { OnlineUsers } from "@/components/general/OnlineUsers";

export default function OnlineUsersPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent("/online-users")}`);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 md:hidden">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0 rounded-full"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <Users className="h-6 w-6 text-green-500" />
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Sedang Online
            </h1>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Daftar user yang sedang online
            </p>
          </div>
          <div className="p-2">
            <OnlineUsers />
          </div>
        </div>
      </div>
    </div>
  );
}
