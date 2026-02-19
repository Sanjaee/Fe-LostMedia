"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Volume2, VolumeX, MessageCircle, Bookmark, Share2, ChevronUp, ChevronDown, Play, Pause } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useApi } from "@/components/contex/ApiProvider";
import { ReelsCommentSidebar } from "@/components/post/ReelsCommentSidebar";
import { LikeButton } from "@/components/post/LikeButton";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Post } from "@/types/post";

const REELS_PAGE_SIZE = 50;

const DUMMY_REELS: Post[] = [
  {
    id: "dummy-1",
    user_id: "user-1",
    content: "Beautiful sunset at the beach 🌅 #nature #sunset",
    video_urls: ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"],
    image_urls: [],
    likes_count: 1234,
    comments_count: 56,
    user_liked: false,
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-1",
      username: "naturelover",
      full_name: "Nature Lover",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=nature",
    },
  },
  {
    id: "dummy-2",
    user_id: "user-2",
    content: "Morning coffee vibes ☕️ #coffee #morning",
    video_urls: ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"],
    image_urls: [],
    likes_count: 892,
    comments_count: 34,
    user_liked: true,
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-2",
      username: "coffeelover",
      full_name: "Coffee Lover",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=coffee",
    },
  },
  {
    id: "dummy-3",
    user_id: "user-3",
    content: "City lights at night 🌃 #city #nightlife",
    video_urls: ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"],
    image_urls: [],
    likes_count: 2567,
    comments_count: 89,
    user_liked: false,
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-3",
      username: "cityexplorer",
      full_name: "City Explorer",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=city",
    },
  },
  {
    id: "dummy-4",
    user_id: "user-4",
    content: "Mountain hiking adventure 🏔️ #hiking #adventure",
    video_urls: ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"],
    image_urls: [],
    likes_count: 1876,
    comments_count: 45,
    user_liked: false,
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-4",
      username: "hikingfan",
      full_name: "Hiking Fan",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=hiking",
    },
  },
  {
    id: "dummy-5",
    user_id: "user-5",
    content: "Cooking time! 🍕 #food #cooking",
    video_urls: ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"],
    image_urls: [],
    likes_count: 3421,
    comments_count: 112,
    user_liked: true,
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-5",
      username: "homechef",
      full_name: "Home Chef",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=chef",
    },  
  },
];

export default function ReelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { api } = useApi();
  const containerRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [postCommentCounts, setPostCommentCounts] = useState<Record<string, number>>({});
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const [isDesktop, setIsDesktop] = useState(false);

  // Hanya satu instance ReelsCommentSidebar (desktop ATAU mobile) agar GET comments tidak dobel
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  // Fetch feed and filter only posts with video
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.getFeed(REELS_PAGE_SIZE, 0, "newest");
        let list: Post[] = [];
        if (res.data?.posts && Array.isArray(res.data.posts)) list = res.data.posts;
        else if (res.posts && Array.isArray(res.posts)) list = res.posts;
        const videoPosts = list.filter((p) => p.video_urls && p.video_urls.length > 0);
        if (!cancelled) {
          if (videoPosts.length > 0) {
            setPosts(videoPosts);
          } else {
            setPosts(DUMMY_REELS);
          }
        }
      } catch (e) {
        console.error("Reels load error:", e);
        if (!cancelled) setPosts(DUMMY_REELS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [session?.user?.id, api]);

  // Observe which reel is in view to update activeIndex (play/pause handled by paused state)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || posts.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.reelIndex);
          if (Number.isInteger(idx)) setActiveIndex(idx);
        }
      },
      { root: el, rootMargin: "0px", threshold: 0.6 }
    );
    const children = el.querySelectorAll("[data-reel-index]");
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [posts.length]);

  // Pause videos that are not active; play active video unless manually paused
  useEffect(() => {
    setPaused(false); // reset when switching reel
  }, [activeIndex]);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([i, video]) => {
      if (!video) return;
      const idx = Number(i);
      if (idx === activeIndex && !paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex, paused]);

  const handleScrollTo = useCallback((direction: "up" | "down") => {
    const el = containerRef.current;
    if (!el || posts.length === 0) return;
    const next = direction === "down" ? Math.min(activeIndex + 1, posts.length - 1) : Math.max(activeIndex - 1, 0);
    if (next === activeIndex) return;
    const slide = el.querySelector(`[data-reel-index="${next}"]`) as HTMLElement;
    slide?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeIndex, posts.length]);

  const handleCommentClick = () => {
    setCommentsPanelOpen((prev) => !prev);
  };

  const handleVideoClick = (index: number) => {
    if (index === activeIndex) {
      setPaused((prev) => !prev);
    }
  };

  const handleCommentCountChange = (postId: string, count: number) => {
    setPostCommentCounts((prev) => ({ ...prev, [postId]: count }));
  };

  if (status === "loading" || !session) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const activePost = posts[activeIndex] ?? null;

  return (
    <AppLayout showCreatePost={false} fullScreen>
      <div className="fixed inset-0 z-10 flex h-[100dvh] w-full flex-row items-stretch bg-black">
        {/* Spacer kiri - untuk senter video */}
        <div className="hidden flex-1 md:block" />
        {/* Reels container: video di tengah */}
        <div className="relative flex min-w-0 flex-1 flex-col md:flex-initial md:w-[420px] lg:w-[480px]">
          <div
            ref={containerRef}
            className="scrollbar-hide h-full w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth"
            style={{ height: "100dvh", maxHeight: "100dvh" }}
          >
          {loading ? (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              Memuat reels...
            </div>
          ) : posts.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-zinc-500">
              <p>Belum ada video reels.</p>
              <Link href="/">
                <Button variant="outline">Kembali ke Feed</Button>
              </Link>
            </div>
          ) : (
            posts.map((post, index) => {
              const videoUrl = post.video_urls?.[0];
              return (
                <section
                  key={post.id}
                  data-reel-index={index}
                  className="relative h-full w-full shrink-0 snap-start snap-always"
                  style={{ minHeight: "100dvh" }}
                >
                  {/* Video full layar - klik untuk pause/play */}
                  <div
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black"
                    onClick={() => handleVideoClick(index)}
                  >
                    {videoUrl ? (
                      <video
                        ref={(r) => { videoRefs.current[index] = r; }}
                        src={videoUrl}
                        className="h-full w-full object-cover"
                        loop
                        muted={muted}
                        playsInline
                        preload="metadata"
                        onClick={(e) => { e.stopPropagation(); handleVideoClick(index); }}
                      />
                    ) : null}
                    {/* Icon play/pause di tengah saat hover atau saat pause */}
                    {index === activeIndex && (
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
                          paused ? "opacity-100" : "opacity-0 hover:opacity-100"
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleVideoClick(index); }}
                      >
                        <div className="rounded-full bg-black/50 p-4">
                          {paused ? (
                            <Play className="h-12 w-12 fill-white text-white" />
                          ) : (
                            <Pause className="h-12 w-12 fill-white text-white" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Control mute/unmute - kiri atas (seperti contoh) */}
                  <button
                    type="button"
                    className="absolute left-3 top-18 z-20 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                    onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                    aria-label={muted ? "Hidupkan suara" : "Matikan suara"}
                  >
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>

                  {/* Caption & user bawah kiri */}
                  <div className="absolute bottom-10 left-3 right-16 z-10 text-left text-white drop-shadow-lg">
                    <Link
                      href={`/profile/${post.user?.username || post.user_id}`}
                      className="mb-1 flex items-center gap-2 font-semibold"
                    >
                      @{post.user?.username || post.user?.full_name || "user"}
                    </Link>
                    {post.content ? (
                      <p className="line-clamp-2 text-sm">{post.content}</p>
                    ) : null}
                  </div>

                  {/* Sidebar kanan: avatar, like, comment, bookmark, share */}
                  <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-4">
                    {/* Avatar + follow */}
                    <Link href={`/profile/${post.user?.username || post.user_id}`} className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-white">
                          <AvatarImage src={post.user?.profile_photo} alt="" />
                          <AvatarFallback className="bg-violet-600 text-white">
                            {(post.user?.full_name || "U").slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">+</span>
                      </div>
                      <span className="text-xs text-white">Ikuti</span>
                    </Link>

                    {/* Like - dinamis, ukuran tombol sama seperti comment */}
                    <div className="flex flex-col items-center">
                      <LikeButton
                        targetType="post"
                        targetID={post.id}
                        initialLikeCount={postLikeCounts[post.id] ?? post.likes_count ?? 0}
                        initialUserLike={
                          post.user_liked
                            ? { id: "", user_id: post.user_id, target_type: "post", target_id: post.id, reaction: "love", created_at: "" }
                            : null
                        }
                        onLikeChange={(_, count) => setPostLikeCounts((p) => ({ ...p, [post.id]: count }))}
                        compact
                        defaultReaction="love"
                        singleReaction
                        unlikedClassName="text-white hover:text-white"
                        compactIconClassName="h-10 w-10 min-w-10 min-h-10"
                        iconFilledWhenLiked
                        compactButtonClassName="!h-12 !w-12 !min-h-12 !min-w-12 rounded-full !p-0 hover:bg-white/10"
                      />
                      <span className="text-xs text-white">{postLikeCounts[post.id] ?? post.likes_count ?? 0}</span>
                    </div>

                    {/* Comment - toggle panel komentar */}
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/10"
                        onClick={handleCommentClick}
                      >
                        <MessageCircle className="h-10 w-10 shrink-0" />
                      </button>
                      <span className="text-xs text-white">{postCommentCounts[post.id] ?? post.comments_count ?? 0}</span>
                    </div>

                    {/* Bookmark */}
                    <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/10" aria-label="Simpan">
                      <Bookmark className="h-10 w-10 shrink-0" />
                    </button>

                    {/* Share */}
                    <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/10" aria-label="Bagikan">
                      <Share2 className="h-10 w-10 shrink-0" />
                    </button>
                  </div>
                </section>
              );
            })
          )}
          </div>

          {/* Tombol scroll atas/bawah - di luar video, sebelah kanan */}
          {!loading && posts.length > 1 && (
            <div className="absolute -right-12 top-1/2 z-20 flex flex-col gap-1 -translate-y-1/2 pointer-events-none">
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                onClick={() => handleScrollTo("up")}
                aria-label="Post sebelumnya"
              >
                <ChevronUp className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                onClick={() => handleScrollTo("down")}
                aria-label="Post berikutnya"
              >
                <ChevronDown className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>

        {/* Spacer kanan - untuk senter video (antara video dan komentar) - desktop only */}
        <div className="hidden flex-1 md:block" />

        {/* Panel komentar desktop - di kanan (hanya mount di desktop supaya GET tidak dobel) */}
        {isDesktop && (
          <div
            className={`flex shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
              commentsPanelOpen && activePost ? "w-[420px]" : "w-0"
            }`}
          >
            {!loading && activePost && (
              <ReelsCommentSidebar
                post={activePost}
                isOpen={commentsPanelOpen}
                variant="sidebar"
                onClose={() => setCommentsPanelOpen(false)}
                onCommentCountChange={(count) => handleCommentCountChange(activePost.id, count)}
                refreshTrigger={activeIndex}
              />
            )}
          </div>
        )}
      </div>

      {/* Panel komentar mobile - bottom sheet (hanya mount di mobile supaya GET tidak dobel) */}
      {!isDesktop && !loading && activePost && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
              commentsPanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setCommentsPanelOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 flex max-h-[70vh] flex-col transition-transform duration-300 ease-out ${
              commentsPanelOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <ReelsCommentSidebar
              post={activePost}
              isOpen={commentsPanelOpen}
              variant="bottomsheet"
              onClose={() => setCommentsPanelOpen(false)}
              onCommentCountChange={(count) => handleCommentCountChange(activePost.id, count)}
              refreshTrigger={activeIndex}
            />
          </div>
        </>
      )}
    </AppLayout>
  );
}
