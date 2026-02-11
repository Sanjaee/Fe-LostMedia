"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/post/PostCard";
import { CommentDialog } from "@/components/post/CommentDialog";
import PhotoModal from "@/components/ui/PhotoModal";
import type { Post } from "@/types/post";

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const { api } = useApi();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const [postUserLikes, setPostUserLikes] = useState<Record<string, any>>({});
  const [postCommentCounts, setPostCommentCounts] = useState<Record<string, number>>({});
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState<Post | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(`/post/${id || ""}`)}`);
    }
  }, [status, router, id]);

  const loadPost = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    try {
      setLoading(true);
      const res = await api.getPost(id);
      const data = res as any;
      const fetched: Post | null = data?.data?.post ?? data?.post ?? data?.data ?? data ?? null;
      if (!fetched?.id) {
        setPost(null);
        return;
      }
      setPost(fetched);
      setPostLikeCounts({ [fetched.id]: fetched.likes_count ?? 0 });
      setPostCommentCounts({ [fetched.id]: fetched.comments_count ?? 0 });
    } catch {
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id, loadPost]);

  const handleLikeChange = useCallback(
    (postId: string, liked: boolean, likeCount: number) => {
      setPostLikeCounts((prev) => ({ ...prev, [postId]: likeCount }));
      setPostUserLikes((prev) => {
        if (liked && session?.user?.id) {
          return { ...prev, [postId]: { user_id: session.user.id, post_id: postId } };
        }
        return { ...prev, [postId]: null };
      });
    },
    [session?.user?.id]
  );

  const handleOpenCommentDialog = (target: Post) => {
    setSelectedPostForComment(target);
    setCommentDialogOpen(true);
  };

  const handleCloseCommentDialog = () => {
    setCommentDialogOpen(false);
    setSelectedPostForComment(null);
  };

  const handleImageClick = (target: Post, imageIndex: number) => {
    setSelectedMediaIndex(imageIndex);
    setPhotoModalOpen(true);
  };

  const handleVideoClick = (target: Post, videoIndex: number) => {
    const offset = target.image_urls?.length || 0;
    setSelectedMediaIndex(offset + videoIndex);
    setPhotoModalOpen(true);
  };

  const handleCloseModal = () => {
    setPhotoModalOpen(false);
  };

  const handleNavigateImage = (direction: "prev" | "next") => {
    if (!post) return;
    const totalMedia = (post.image_urls?.length || 0) + (post.video_urls?.length || 0);
    let newIndex = selectedMediaIndex;
    if (direction === "prev" && selectedMediaIndex > 0) newIndex -= 1;
    if (direction === "next" && selectedMediaIndex < totalMedia - 1) newIndex += 1;
    setSelectedMediaIndex(newIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Memuat...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500">Post tidak ditemukan</div>
      </div>
    );
  }

  return (
    <AppLayout showCreatePost={false}>
      <div className="mb-4">
        <div className="sticky top-14 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 rounded-full"
              title="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Detail Post
            </h1>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <PostCard
          post={post}
          session={session}
          api={api}
          viewedPosts={viewedPosts}
          setViewedPosts={setViewedPosts}
          postLikeCounts={postLikeCounts}
          postUserLikes={postUserLikes}
          postCommentCounts={postCommentCounts}
          handleLikeChange={handleLikeChange}
          handleOpenCommentDialog={handleOpenCommentDialog}
          handleImageClick={handleImageClick}
          handleVideoClick={handleVideoClick}
          onPostDeleted={() => router.push("/")}
        />
      </div>

      {photoModalOpen && (
        <PhotoModal
          isOpen={photoModalOpen}
          onClose={handleCloseModal}
          post={post}
          imageIndex={selectedMediaIndex}
          onNavigateImage={handleNavigateImage}
          onNavigateToIndex={setSelectedMediaIndex}
        />
      )}

      <CommentDialog
        open={commentDialogOpen}
        onClose={handleCloseCommentDialog}
        post={selectedPostForComment}
        onCommentCountChange={(count) => {
          if (selectedPostForComment) {
            setPostCommentCounts((prev) => ({
              ...prev,
              [selectedPostForComment.id]: count,
            }));
          }
        }}
      />
    </AppLayout>
  );
}
