"use client";

import React, { useState, useEffect } from "react";
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
import { Loader2, MoreVertical, Edit, Trash2, Pin, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { Post } from "@/types/post";
import { PostDialog } from "./PostDialog";
import { cn } from "@/lib/utils";

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
  const { api } = useApi();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      setDeletingId(postId);
      await api.deletePost(postId);
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
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
              <div className="flex items-center gap-3">
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">
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
              </div>

              {/* Actions Menu */}
              {isOwnProfile && currentUserId === post.user_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(post)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Post Content */}
            {post.content && (
              <p className="text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">
                {post.content}
              </p>
            )}

            {/* Post Images */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="mb-3">
                {post.image_urls.length === 1 ? (
                  <img
                    src={post.image_urls[0]}
                    alt="Post image"
                    className="w-full rounded-lg max-h-96 object-cover"
                  />
                ) : post.image_urls.length === 2 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {post.image_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Post image ${idx + 1}`}
                        className="w-full rounded-lg h-64 object-cover"
                      />
                    ))}
                  </div>
                ) : post.image_urls.length === 3 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <img
                      src={post.image_urls[0]}
                      alt="Post image 1"
                      className="w-full rounded-lg h-64 object-cover row-span-2"
                    />
                    <img
                      src={post.image_urls[1]}
                      alt="Post image 2"
                      className="w-full rounded-lg h-32 object-cover"
                    />
                    <img
                      src={post.image_urls[2]}
                      alt="Post image 3"
                      className="w-full rounded-lg h-32 object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {post.image_urls.slice(0, 4).map((url, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`Post image ${idx + 1}`}
                          className="w-full rounded-lg h-48 object-cover"
                        />
                        {idx === 3 && post.image_urls && post.image_urls.length > 4 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
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
                    {post.shared_post.content}
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

            {/* Image Count Badge */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <Image className="h-4 w-4" />
                <span>{post.image_urls.length} {post.image_urls.length === 1 ? 'image' : 'images'}</span>
              </div>
            )}
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
    </>
  );
};
