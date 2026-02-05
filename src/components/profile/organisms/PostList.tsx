"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, MoreHorizontal, Edit, Trash2, Pin, Image, MessageCircle, Share2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { Post } from "@/types/post";
import { PostDialog } from "./PostDialog";
import { parseTextWithLinks } from "@/utils/textUtils";
import PhotoModal from "@/components/ui/PhotoModal";
import { cn } from "@/lib/utils";
import { LikeButton } from "@/components/post/LikeButton";
import { CommentDialog } from "@/components/post/CommentDialog";
import { useSession } from "next-auth/react";

interface PostListProps {
  userId: string;
  isOwnProfile?: boolean;
  currentUserId?: string;
}

export const PostList: React.FC<PostListProps> = ({
  userId,
  isOwnProfile = false,
  currentUserId,
}) => {
  const router = useRouter();
  const { api } = useApi();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState<Post | null>(null);
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const [postUserLikes, setPostUserLikes] = useState<Record<string, any>>({});
  const [postCommentCounts, setPostCommentCounts] = useState<Record<string, number>>({});
  const [postViewCounts, setPostViewCounts] = useState<Record<string, number>>({});

  const loadPosts = async () => {
    try {
      setLoading(true);
      // Get posts by user ID - this returns only posts created by this specific user
      // Used in profile page to show user's own posts
      const response = await api.getPostsByUserID(userId, 50, 0);
      const postsList = response.posts || response.data?.posts || [];
      // Only show posts from this specific user (no filtering needed, backend handles it)
      setPosts(postsList);
    } catch (error: any) {
      console.error("Failed to load posts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPostEngagements = useCallback(async () => {
    if (posts.length === 0) return;

    try {
      const engagements = await Promise.all(
        posts.map(async (post) => {
          try {
            const [likeCountRes, commentCountRes, viewCountRes, likesRes] = await Promise.all([
              api.getLikeCount("post", post.id),
              api.getCommentCount(post.id),
              api.getPostViewCount(post.id).catch(() => ({ count: 0 })),
              api.getLikes("post", post.id, 100, 0).catch(() => ({ likes: [] })),
            ]);

            // Check if current user has liked this post
            const userId = currentUserId || session?.user?.id;
            const userLike = likesRes.likes?.find(
              (like: any) => like.user_id === userId
            ) || null;

            return {
              postId: post.id,
              likeCount: likeCountRes.count || 0,
              commentCount: commentCountRes.count || 0,
              viewCount: viewCountRes.count || 0,
              userLike,
            };
          } catch {
            return {
              postId: post.id,
              likeCount: 0,
              commentCount: 0,
              viewCount: 0,
              userLike: null,
            };
          }
        })
      );

      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      const viewCounts: Record<string, number> = {};
      const userLikes: Record<string, any> = {};

      engagements.forEach((eng) => {
        likeCounts[eng.postId] = eng.likeCount;
        commentCounts[eng.postId] = eng.commentCount;
        viewCounts[eng.postId] = eng.viewCount;
        if (eng.userLike) {
          userLikes[eng.postId] = eng.userLike;
        }
      });

      setPostLikeCounts(likeCounts);
      setPostCommentCounts(commentCounts);
      setPostViewCounts(viewCounts);
      setPostUserLikes(userLikes);
    } catch (error) {
      console.error("Failed to load post engagements:", error);
    }
  }, [posts, api, currentUserId, session]);

  // Load posts when userId changes
  useEffect(() => {
    if (userId) {
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load like and comment counts for posts
  useEffect(() => {
    if (posts.length > 0 && !loading) {
      loadPostEngagements();
    }
  }, [posts.length, loading, loadPostEngagements]);

  const handleOpenCommentDialog = (post: Post) => {
    setSelectedPostForComment(post);
    setCommentDialogOpen(true);
  };

  const handleCloseCommentDialog = () => {
    setCommentDialogOpen(false);
    setSelectedPostForComment(null);
    loadPostEngagements(); // Reload counts after closing
  };

  const handleLikeChange = useCallback((postId: string, liked: boolean, likeCount: number) => {
    setPostLikeCounts((prev) => ({ ...prev, [postId]: likeCount }));
  }, []);

  const handleDeleteClick = (post: Post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;

    try {
      setDeletingId(postToDelete.id);
      await api.deletePost(postToDelete.id);
      toast({
        title: "Berhasil",
        description: "Post berhasil dihapus",
      });
      loadPosts();
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus post",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPost(null);
  };

  const handleDialogSuccess = () => {
    loadPosts();
  };

  // Handle image click - update URL without reload
  const handleImageClick = (post: Post, imageIndex: number) => {
    // Get current profile path
    const profilePath = router.asPath.split('?')[0]; // Remove existing query params
    // Update URL with query params (like Facebook: /profile/ID?fbid=...&set=pcb.POST_ID.IMAGE_INDEX)
    const newUrl = `${profilePath}?fbid=${post.id}&set=pcb.${post.id}.${imageIndex}`;
    router.push(newUrl, undefined, { scroll: false });
  };

  // Handle modal close - restore URL
  const handleCloseModal = () => {
    // Remove query params and restore original URL
    const profilePath = router.asPath.split('?')[0];
    router.push(profilePath, undefined, { scroll: false });
    setSelectedPost(null);
    setSelectedImageIndex(0);
  };

  // Handle image navigation in modal
  const handleNavigateImage = (direction: 'prev' | 'next') => {
    if (!selectedPost || !selectedPost.image_urls) return;
    
    const totalImages = selectedPost.image_urls.length;
    let newIndex = selectedImageIndex;
    
    if (direction === 'prev' && selectedImageIndex > 0) {
      newIndex = selectedImageIndex - 1;
    } else if (direction === 'next' && selectedImageIndex < totalImages - 1) {
      newIndex = selectedImageIndex + 1;
    }
    
    if (newIndex !== selectedImageIndex) {
      setSelectedImageIndex(newIndex);
      // Update URL
      const profilePath = router.asPath.split('?')[0];
      const newUrl = `${profilePath}?fbid=${selectedPost.id}&set=pcb.${selectedPost.id}.${newIndex}`;
      router.push(newUrl, undefined, { scroll: false });
    }
  };

  // Parse URL params to determine selected post and image index
  useEffect(() => {
    const fbid = router.query.fbid as string;
    const set = router.query.set as string;

    if (fbid && set && posts.length > 0) {
      const setParts = set.split('.');
      if (setParts.length >= 2) {
        const postId = setParts[1];
        const imageIndex = setParts[2] ? parseInt(setParts[2]) : 0;
        
        const post = posts.find(p => p.id === postId);
        if (post && post.image_urls && post.image_urls.length > 0) {
          // Only update if different to avoid unnecessary renders
          if (selectedPost?.id !== post.id || selectedImageIndex !== imageIndex) {
            setSelectedPost(post);
            setSelectedImageIndex(imageIndex);
          }
        }
      }
    } else {
      // Only update if currently has selected post
      if (selectedPost) {
        setSelectedPost(null);
        setSelectedImageIndex(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.fbid, router.query.set, posts]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const fbid = router.query.fbid as string;
      const set = router.query.set as string;
      if (!fbid && !set) {
        setSelectedPost(null);
        setSelectedImageIndex(0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router.query.fbid, router.query.set]);


  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No posts available</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className={cn(
              "bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4",
              post.is_pinned && "border-2 border-blue-500"
            )}
          >
            {/* Post Header */}
            <div className="flex items-start justify-between mb-3">
              <Link 
                href={`/profile/${post.user_id}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={post.user?.profile_photo}
                    alt={post.user?.full_name}
                  />
                  <AvatarFallback>
                    {getInitials(post.user?.full_name || "User")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white hover:underline">
                      {post.user?.full_name}
                    </h3>
                    {post.is_pinned && (
                      <Pin className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: id,
                    })}
                  </p>
                </div>
              </Link>

              {/* Actions Menu */}
              {isOwnProfile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => handleEdit(post)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(post)}
                      variant="destructive"
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Post Content */}
            {post.content && (
              <p className="text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">
                {parseTextWithLinks(post.content).map((part, index) => {
                  if (part.type === 'link') {
                    return (
                      <a
                        key={index}
                        href={part.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 hover:underline break-all"
                      >
                        {part.content}
                      </a>
                    );
                  }
                  return <span key={index}>{part.content}</span>;
                })}
              </p>
            )}

            {/* Post Images */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="mb-3">
                {post.image_urls.length === 1 ? (
                  <img
                    src={post.image_urls[0]}
                    alt="Post image"
                    className="w-full rounded-lg max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(post, 0)}
                  />
                ) : post.image_urls.length === 2 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {post.image_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Post image ${idx + 1}`}
                        className="w-full rounded-lg h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handleImageClick(post, idx)}
                      />
                    ))}
                  </div>
                ) : post.image_urls.length === 3 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <img
                      src={post.image_urls[0]}
                      alt="Post image 1"
                      className="w-full rounded-lg h-64 object-cover row-span-2 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(post, 0)}
                    />
                    <img
                      src={post.image_urls[1]}
                      alt="Post image 2"
                      className="w-full rounded-lg h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(post, 1)}
                    />
                    <img
                      src={post.image_urls[2]}
                      alt="Post image 3"
                      className="w-full rounded-lg h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(post, 2)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {post.image_urls.slice(0, 4).map((url, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`Post image ${idx + 1}`}
                          className="w-full rounded-lg h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleImageClick(post, idx)}
                        />
                        {idx === 3 && post.image_urls && post.image_urls.length > 4 && (
                          <div 
                            className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick(post, 3)}
                          >
                            <span className="text-white font-semibold text-lg">
                              +{post.image_urls.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shared Post */}
            {post.shared_post && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Shared from {post.shared_post.user?.full_name}
                  </span>
                </div>
                {post.shared_post.content && (
                  <p className="text-sm text-gray-900 dark:text-white">
                    {parseTextWithLinks(post.shared_post.content).map((part, index) => {
                      if (part.type === 'link') {
                        return (
                          <a
                            key={index}
                            href={part.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 hover:underline break-all"
                          >
                            {part.content}
                          </a>
                        );
                      }
                      return <span key={index}>{part.content}</span>;
                    })}
                  </p>
                )}
                {post.shared_post.image_urls && post.shared_post.image_urls.length > 0 && (
                  <div className="mt-2">
                    <img
                      src={post.shared_post.image_urls[0]}
                      alt="Shared post image"
                      className="w-full rounded-lg max-h-48 object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Stats Section - Image Count and View Count */}
            {(post.image_urls && post.image_urls.length > 0) || postViewCounts[post.id] > 0 ? (
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2 mb-3 px-1">
                {/* Image Count */}
                {post.image_urls && post.image_urls.length > 0 && (
                  <div className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <Image className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{post.image_urls.length} gambar</span>
                  </div>
                )}
                
                {/* View Count */}
                {postViewCounts[post.id] > 0 && (
                  <div className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <Eye className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{postViewCounts[post.id]} dilihat</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Engagement Section */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {/* Like Count */}
              {postLikeCounts[post.id] > 0 && (
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center -space-x-1">
                    <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 border-white dark:border-gray-900">
                      👍
                    </div>
                    <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs border-2 border-white dark:border-gray-900">
                      ❤️
                    </div>
                  </div>
                  <span className="font-medium">{postLikeCounts[post.id]}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-1">
                  <LikeButton
                    targetType="post"
                    targetID={post.id}
                    initialLikeCount={postLikeCounts[post.id] || 0}
                    initialUserLike={postUserLikes[post.id] || null}
                    onLikeChange={(liked, count) => handleLikeChange(post.id, liked, count)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenCommentDialog(post)}
                    className="flex-1 h-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Komentar
                    {postCommentCounts[post.id] > 0 && (
                      <span className="ml-2">({postCommentCounts[post.id]})</span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Bagikan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <PostDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        post={editingPost}
        userId={currentUserId || userId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Post?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus post ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPostToDelete(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Modal */}
      {selectedPost && (
        <PhotoModal
          isOpen={!!selectedPost}
          onClose={handleCloseModal}
          post={selectedPost}
          imageIndex={selectedImageIndex}
          onNavigateImage={handleNavigateImage}
        />
      )}

      {/* Comment Dialog */}
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
    </>
  );
};
