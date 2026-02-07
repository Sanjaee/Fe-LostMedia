"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { PeopleSearchList } from "@/components/search/PeopleSearchList";
import { PostSearchList } from "@/components/search/PostSearchList";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Users, FileText, ArrowLeft, Search } from "lucide-react";
import { useApi } from "@/components/contex/ApiProvider";
import { useChat } from "@/contexts/ChatContext";
import type { Friendship } from "@/types/friendship";

const SearchPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { api } = useApi();
  const { openChat } = useChat();
  const [activeTab, setActiveTab] = useState<"people" | "posts">("people");
  const query = (router.query.q as string) || "";
  const [friends, setFriends] = React.useState<Friendship[]>([]);
  const [loadingFriends, setLoadingFriends] = React.useState(false);
  const [peopleCount, setPeopleCount] = React.useState<number | null>(null);
  const [postsCount, setPostsCount] = React.useState<number | null>(null);

  // Reset counts when query changes
  useEffect(() => {
    if (!query?.trim()) {
      setPeopleCount(null);
      setPostsCount(null);
    }
  }, [query]);

  // Load friends for contacts sidebar
  useEffect(() => {
    const loadFriends = async () => {
      if (!session?.user?.id) return;
      
      try {
        setLoadingFriends(true);
        const response = await api.getFriends() as any;
        let friendsList: typeof friends = [];
        
        if (Array.isArray(response)) {
          friendsList = response;
        } else if (response && typeof response === 'object') {
          if ('friends' in response && Array.isArray(response.friends)) {
            friendsList = response.friends;
          } else if ('data' in response && response.data && typeof response.data === 'object') {
            const data = response.data;
            if ('friends' in data && Array.isArray(data.friends)) {
              friendsList = data.friends;
            } else if ('friendships' in data && Array.isArray(data.friendships)) {
              friendsList = data.friendships;
            }
          } else if ('friendships' in response && Array.isArray(response.friendships)) {
            friendsList = response.friendships;
          }
        }
        
        setFriends(friendsList);
      } catch (error) {
        console.error("Failed to load friends:", error);
    } finally {
        setLoadingFriends(false);
      }
    };

    if (session?.user?.id) {
      loadFriends();
    }
  }, [session?.user?.id, api]);

  return (
    <AppLayout
      friends={friends}
      loadingFriends={loadingFriends}
      showCreatePost={false}
      onChatClick={(user) => openChat(user)}
    >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
          {/* Mobile: Header seperti gambar (back, title, search) */}
          <div className="md:hidden sticky top-14 z-10 -mx-4 -mt-4 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="shrink-0 h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate flex-1 text-center">
                {query ? `Hasil: ${query}` : "Pencarian"}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/search")}
                className="shrink-0 h-9 w-9"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Desktop: Title */}
          <h1 className="hidden md:block text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Hasil Pencarian: {query || "Semua"}
          </h1>

        {/* Tabs - Mobile: pill style, Desktop: underline */}
        <div className="flex gap-2 mb-6 md:border-b md:border-gray-200 dark:md:border-gray-700">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("people")}
            className={`flex items-center gap-2 transition-colors md:rounded-none md:border-b-2 ${
              activeTab === "people"
                ? "rounded-full bg-gray-200 dark:bg-gray-700 md:bg-transparent md:border-blue-500 text-blue-600 dark:text-blue-400"
                : "rounded-full md:border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">People</span>
            {peopleCount !== null && peopleCount > 0 && (
              <span className="shrink-0">({peopleCount})</span>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 transition-colors md:rounded-none md:border-b-2 ${
              activeTab === "posts"
                ? "rounded-full bg-gray-200 dark:bg-gray-700 md:bg-transparent md:border-blue-500 text-blue-600 dark:text-blue-400"
                : "rounded-full md:border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">Posts</span>
            {postsCount !== null && postsCount > 0 && (
              <span className="shrink-0">({postsCount})</span>
            )}
          </Button>
            </div>

        {/* Content */}
        <div className="mt-4">
          {activeTab === "people" ? (
            <PeopleSearchList keyword={query} limit={10} onCountChange={setPeopleCount} />
          ) : (
            <PostSearchList keyword={query} limit={5} onCountChange={setPostsCount} />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default SearchPage;
