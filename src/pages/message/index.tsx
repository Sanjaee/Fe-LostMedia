"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { ContactsList } from "@/components/general/ContactsList";
import { useChat } from "@/contexts/ChatContext";
import { useSharedData } from "@/contexts/SharedDataContext";

export default function MessagePage() {
  const router = useRouter();
  const { status } = useSession();
  const { openChat } = useChat();
  const { friends, friendsLoading: loadingFriends } = useSharedData();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent("/message")}`);
    }
  }, [status, router]);

  const handleChatClick = (user: { id: string; full_name: string; username?: string; profile_photo?: string }) => {
    openChat(user);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header dengan tombol kembali */}
      <div className="sticky top-14 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0 rounded-full"
            title="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-blue-500" />
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Messenger</h1>
          </div>
        </div>
      </div>

      {/* Friends list */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Choose a friend to start a conversation
            </p>
          </div>
          <div className="p-2">
            <ContactsList
              friends={friends}
              loading={loadingFriends}
              onChatClick={handleChatClick}
              refreshUnreadTrigger={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
