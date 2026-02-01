"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { useEffect, useState } from "react";
import FeedClient from "./feed-client";
import { useApi } from "@/components/contex/ApiProvider";
import type { Post } from "@/types/post";
import { Loader2 } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const POSTS_CACHE_KEY = "feed_posts_cache";
const POSTS_CACHE_TIMESTAMP_KEY = "feed_posts_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const { api } = useApi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have cached posts and they're still fresh
    const cachedPosts = sessionStorage.getItem(POSTS_CACHE_KEY);
    const cacheTimestamp = sessionStorage.getItem(POSTS_CACHE_TIMESTAMP_KEY);
    
    if (cachedPosts && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp, 10);
      if (age < CACHE_DURATION) {
        try {
          const parsedPosts = JSON.parse(cachedPosts);
          setPosts(parsedPosts);
          setLoading(false);
          // Load fresh data in background
          loadFeed(true);
          return;
        } catch (e) {
          // If cache is corrupted, load fresh
          console.error("Failed to parse cached posts:", e);
        }
      }
    }
    
    // Load fresh data
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFeed = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const response = await api.getFeed(50, 0);
      const postsList = response.posts || response.data?.posts || [];
      setPosts(postsList);
      
      // Cache the posts
      sessionStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(postsList));
      sessionStorage.setItem(POSTS_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err: any) {
      console.error("Failed to load feed:", err);
      if (!silent) {
        setError(err.message || "Failed to load feed");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black`}
      >
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black`}
      >
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Error loading feed
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black`}
    >
      <FeedClient posts={posts} />
    </div>
  );
}
