"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FeedClient from "./feed-client";
import { useApi } from "@/components/contex/ApiProvider";
import type { Post } from "@/types/post";
import { PostSkeletonList } from "@/components/post/PostSkeleton";

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
const POSTS_CACHE_USER_KEY = "feed_posts_cache_user_id";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const { api } = useApi();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if no session or session expired
  useEffect(() => {
    // Wait for session to finish loading
    if (status === "loading") {
      return;
    }

    // If session is unauthenticated, redirect to login
    if (status === "unauthenticated" || !session) {
      router.push("/auth/login");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    // Clear cache if user changed
    const cachedUserId = sessionStorage.getItem(POSTS_CACHE_USER_KEY);
    const currentUserId = session?.user?.id || '';
    
    if (cachedUserId && cachedUserId !== currentUserId) {
      sessionStorage.removeItem(POSTS_CACHE_KEY);
      sessionStorage.removeItem(POSTS_CACHE_TIMESTAMP_KEY);
      sessionStorage.removeItem(POSTS_CACHE_USER_KEY);
    }

    // Check if we have cached posts and they're still fresh
    const cachedPosts = sessionStorage.getItem(POSTS_CACHE_KEY);
    const cacheTimestamp = sessionStorage.getItem(POSTS_CACHE_TIMESTAMP_KEY);
    
    if (cachedPosts && cacheTimestamp && cachedUserId === currentUserId) {
      const age = Date.now() - parseInt(cacheTimestamp, 10);
      if (age < CACHE_DURATION) {
        try {
          const parsedPosts = JSON.parse(cachedPosts);
          setPosts(parsedPosts);
          setLoading(false);
          // Load fresh data in background with popular sorting
          loadFeed(true, "popular");
          return;
        } catch (e) {
          // If cache is corrupted, load fresh
          console.error("Failed to parse cached posts:", e);
        }
      }
    }
    
    // Load fresh data - popular first for initial load
    loadFeed(false, "popular");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);
  
  // No auto-refresh needed - we load popular directly from the start

  const loadFeed = async (silent = false, sort: "newest" | "popular" = "newest") => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      // Get feed - newest first for initial load, popular after refresh
      const response = await api.getFeed(50, 0, sort);
      
      // Handle different response structures
      // Backend returns: { success: true, message: "...", data: { posts: [...] } }
      // or: { posts: [...] } or: { data: { posts: [...] } }
      let postsList: Post[] = [];
      
      if (response.data?.posts && Array.isArray(response.data.posts)) {
        postsList = response.data.posts;
      } else if (response.posts && Array.isArray(response.posts)) {
        postsList = response.posts;
      } else if (Array.isArray(response)) {
        postsList = response;
      }
      
      // Display all posts from feed (all posts are public)
      setPosts(postsList);
      
      // Cache the posts with user ID to prevent cross-user cache issues
      if (session?.user?.id) {
        sessionStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(postsList));
        sessionStorage.setItem(POSTS_CACHE_TIMESTAMP_KEY, Date.now().toString());
        sessionStorage.setItem(POSTS_CACHE_USER_KEY, session.user.id);
      }
    } catch (err: any) {
      console.error("Failed to load feed:", err);
      
      // If error is 401 (Unauthorized), session might be expired - redirect to login
      if (err?.response?.status === 401 || err?.status === 401) {
        router.push("/auth/login");
        return;
      }
      
      if (!silent) {
        setError(err.message || "Failed to load feed");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Show loading while checking session or loading posts
  if (status === "loading" || loading) {
    return (
      <div
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black`}
      >
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Sidebar - Skeleton */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-20 space-y-2">
                  <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>

              {/* Main Feed - Skeleton */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                <PostSkeletonList count={3} />
              </div>

              {/* Right Sidebar - Skeleton */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-20">
                  <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
                  <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if redirecting (session check will redirect)
  if (status === "unauthenticated" || !session) {
    return null;
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
