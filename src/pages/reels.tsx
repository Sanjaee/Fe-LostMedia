"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Volume2, VolumeX, MessageCircle, Bookmark, Share2, ChevronUp, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useApi } from "@/components/contex/ApiProvider";
import { CommentDialog } from "@/components/post/CommentDialog";
import { LikeButton } from "@/components/post/LikeButton";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Post } from "@/types/post";

const REELS_PAGE_SIZE = 50;

export default function ReelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { api } = useApi();
  const containerRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState<Post | null>(null);
  const [postCommentCounts, setPostCommentCounts] = useState<Record<string, number>>({});
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

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
        if (!cancelled) setPosts(videoPosts);
      } catch (e) {
        console.error("Reels load error:", e);
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [session?.user?.id, api]);

  // Observe which reel is in view to play/pause and update activeIndex
  useEffect(() => {
    const el = containerRef.current;
    if (!el || posts.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.reelIndex);
          if (Number.isInteger(idx)) {
            setActiveIndex(idx);
            const video = videoRefs.current[idx];
            if (video) {
              video.play().catch(() => {});
            }
          }
        }
      },
      { root: el, rootMargin: "0px", threshold: 0.6 }
    );
    const children = el.querySelectorAll("[data-reel-index]");
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [posts.length]);

  // Pause videos that are not active
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([i, video]) => {
      if (!video) return;
      const idx = Number(i);
      if (idx !== activeIndex) {
        video.pause();
      }
    });
  }, [activeIndex]);

  const handleScrollTo = useCallback((direction: "up" | "down") => {
    const el = containerRef.current;
    if (!el || posts.length === 0) return;
    const next = direction === "down" ? Math.min(activeIndex + 1, posts.length - 1) : Math.max(activeIndex - 1, 0);
    if (next === activeIndex) return;
    const slide = el.querySelector(`[data-reel-index="${next}"]`) as HTMLElement;
    slide?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeIndex, posts.length]);

  const handleCommentClick = (post: Post) => {
    setSelectedPostForComment(post);
    setCommentOpen(true);
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

  return (
    <AppLayout showCreatePost={false}>
      <div className="fixed inset-0 z-0 flex flex-col bg-black">
        {/* Full viewport scroll container: satu post = satu layar, scroll ganti post */}
        <div
          ref={containerRef}
          className="h-full w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth"
          style={{ height: "100dvh" }}
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
                  {/* Video full layar */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    {videoUrl ? (
                      <video
                        ref={(r) => { videoRefs.current[index] = r; }}
                        src={videoUrl}
                        className="h-full w-full object-cover"
                        loop
                        muted={muted}
                        playsInline
                        preload="metadata"
                        onClick={() => setMuted((m) => !m)}
                      />
                    ) : null}
                  </div>

                  {/* Mute toggle kiri atas */}
                  <button
                    type="button"
                    className="absolute left-3 top-4 z-10 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                    onClick={() => setMuted((m) => !m)}
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>

                  {/* Caption & user bawah kiri */}
                  <div className="absolute bottom-20 left-3 right-16 z-10 text-left text-white drop-shadow-lg">
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

                    {/* Like */}
                    <div className="flex flex-col items-center">
                      <LikeButton
                        targetType="post"
                        targetID={post.id}
                        initialLikeCount={postLikeCounts[post.id] ?? post.likes_count ?? 0}
                        initialUserLike={post.user_liked ? ({} as any) : null}
                        onLikeChange={(_, count) => setPostLikeCounts((prev) => ({ ...prev, [post.id]: count }))}
                        compact
                      />
                      <span className="text-xs text-white">{postLikeCounts[post.id] ?? post.likes_count ?? 0}</span>
                    </div>

                    {/* Comment */}
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        className="rounded-full p-2 text-white hover:bg-white/10"
                        onClick={() => handleCommentClick(post)}
                      >
                        <MessageCircle className="h-8 w-8" />
                      </button>
                      <span className="text-xs text-white">{postCommentCounts[post.id] ?? post.comments_count ?? 0}</span>
                    </div>

                    {/* Bookmark */}
                    <button type="button" className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Simpan">
                      <Bookmark className="h-8 w-8" />
                    </button>

                    {/* Share */}
                    <button type="button" className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Bagikan">
                      <Share2 className="h-8 w-8" />
                    </button>
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Tombol scroll atas/bawah */}
        {!loading && posts.length > 1 && (
          <div className="absolute right-1 top-1/2 z-20 flex flex-col gap-1 -translate-y-1/2 pointer-events-none">
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

      <CommentDialog
        open={commentOpen}
        onClose={() => { setCommentOpen(false); setSelectedPostForComment(null); }}
        post={selectedPostForComment}
        onCommentCountChange={(count) => selectedPostForComment && handleCommentCountChange(selectedPostForComment.id, count)}
      />
    </AppLayout>
  );
}
