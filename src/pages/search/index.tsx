"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { PeopleSearchList } from "@/components/search/PeopleSearchList";
import { PostSearchList } from "@/components/search/PostSearchList";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Users, FileText } from "lucide-react";
import { useApi } from "@/components/contex/ApiProvider";
import type { Friendship } from "@/types/friendship";

const SearchPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { api } = useApi();
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
    >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Hasil Pencarian: {query || "Semua"}
          </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("people")}
            className={`flex items-center gap-2 rounded-none border-b-2 transition-colors ${
              activeTab === "people"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Users className="h-4 w-4" />
            People {peopleCount !== null && peopleCount > 0 && `(${peopleCount})`}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 rounded-none border-b-2 transition-colors ${
              activeTab === "posts"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            Posts {postsCount !== null && postsCount > 0 && `(${postsCount})`}
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
