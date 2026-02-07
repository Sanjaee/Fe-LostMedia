"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { ContactsList } from "@/components/general/ContactsList";
import { useApi } from "@/components/contex/ApiProvider";
import { useChat } from "@/contexts/ChatContext";
import type { Friendship } from "@/types/friendship";

export default function MessagePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { api } = useApi();
  const { openChat } = useChat();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const response = (await api.getFriends()) as any;
      let friendsList: Friendship[] = [];
      if (Array.isArray(response)) friendsList = response;
      else if (response?.friends) friendsList = response.friends;
      else if (response?.data?.friends) friendsList = response.data.friends;
      else if (response?.data?.friendships) friendsList = response.data.friendships;
      else if (response?.friendships) friendsList = response.friendships;
      setFriends(friendsList);
    } catch {
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [api]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent("/message")}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadFriends();
    }
  }, [status, loadFriends]);

  useEffect(() => {
    const handleFriendshipChanged = () => setTimeout(loadFriends, 300);
    window.addEventListener("friendship-changed", handleFriendshipChanged);
    return () => window.removeEventListener("friendship-changed", handleFriendshipChanged);
  }, [loadFriends]);

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
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-blue-500" />
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Messenger</h1>
          </div>
        </div>
      </div>

      {/* Daftar teman */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pilih teman untuk memulai percakapan
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
