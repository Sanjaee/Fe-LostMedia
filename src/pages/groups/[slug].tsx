"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import type { Group, GroupMember } from "@/types/group";
import type { Post } from "@/types/post";
import { PostCard } from "@/components/post/PostCard";
import { PostDialog } from "@/components/profile/organisms/PostDialog";
import { CommentDialog } from "@/components/post/CommentDialog";
import PhotoModal from "@/components/ui/PhotoModal";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import {
  Globe,
  Lock,
  EyeOff,
  Users,
  Share2,
  UserPlus,
  LogOut,
  Settings,
  MoreHorizontal,
  Image as ImageIcon,
  ChevronDown,
  Search,
  Check,
  Video,
  Smile,
  Trash2,
} from "lucide-react";
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

type TabType = "diskusi" | "tentang" | "orang" | "media";

const GroupPage: React.FC = () => {
  const router = useRouter();
  const { slug } = router.query;
  const { data: session } = useSession();
  const { api } = useApi();
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("diskusi");
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const loadGroup = useCallback(async () => {
    if (!slug || typeof slug !== "string") return;
    try {
      setLoading(true);
      const res = await api.getGroupBySlug(slug);
      const data = res as any;
      setGroup(data.group || data);
      setIsMember(data.is_member || false);
      setMemberRole(data.member_role || "");
    } catch {
      toast({
        title: "Error",
        description: "Grup tidak ditemukan",
        variant: "destructive",
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [slug, api, toast, router]);

  const loadMembers = useCallback(async () => {
    if (!group) return;
    try {
      const res = await api.getGroupMembers(group.id, 20, 0);
      const data = res as any;
      setMembers(data.members || []);
      setMembersTotal(data.total || 0);
    } catch {
      console.error("Failed to load members");
    }
  }, [group, api]);

  const loadPosts = useCallback(async () => {
    if (!group) return;
    try {
      setPostsLoading(true);
      const res = (await api.getPostsByGroupID(group.id, 20, 0)) as any;
      setPosts(res.posts || []);
    } catch {
      console.error("Failed to load group posts");
    } finally {
      setPostsLoading(false);
    }
  }, [group, api]);

  useEffect(() => {
    if (router.isReady) {
      loadGroup();
    }
  }, [router.isReady, loadGroup]);

  useEffect(() => {
    if (group) {
      loadMembers();
      loadPosts();
    }
  }, [group, loadMembers, loadPosts]);

  const handleJoin = async () => {
    if (!group) return;
    setJoining(true);
    try {
      await api.joinGroup(group.id);
      setIsMember(true);
      setMemberRole("member");
      toast({ title: "Berhasil bergabung!" });
      loadGroup();
    } catch (err: any) {
      toast({
        title: "Gagal bergabung",
        description: err?.message || "Coba lagi nanti",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!group) return;
    try {
      const res = (await api.leaveGroup(group.id)) as { deleted?: boolean };
      if (res?.deleted) {
        toast({ title: "Grup dihapus", description: "Anda keluar sebagai satu-satunya admin, grup telah dihapus." });
        router.push("/groups");
      } else {
        setIsMember(false);
        setMemberRole("");
        toast({ title: "Berhasil keluar dari grup" });
        loadGroup();
      }
    } catch (err: any) {
      toast({
        title: "Gagal keluar",
        description: err?.message || "Coba lagi nanti",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    setDeletingGroup(true);
    try {
      await api.deleteGroup(group.id);
      toast({ title: "Grup dihapus", description: "Grup berhasil dihapus." });
      router.push("/groups");
    } catch (err: any) {
      toast({
        title: "Gagal menghapus grup",
        description: err?.message || "Coba lagi nanti",
        variant: "destructive",
      });
    } finally {
      setDeletingGroup(false);
      setDeleteGroupDialogOpen(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator.share({
        title: group?.name,
        url: window.location.href,
      });
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link disalin!" });
    }
  };

  const getPrivacyIcon = () => {
    switch (group?.privacy) {
      case "open":
        return <Globe className="h-4 w-4" />;
      case "closed":
        return <Lock className="h-4 w-4" />;
      case "secret":
        return <EyeOff className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getPrivacyLabel = () => {
    switch (group?.privacy) {
      case "open":
        return "Grup Publik";
      case "closed":
        return "Grup Tertutup";
      case "secret":
        return "Grup Rahasia";
      default:
        return "Grup Publik";
    }
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)} jt anggota`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)} rb anggota`;
    return `${count} anggota`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
        <Head>
          <title>Loading... - Lost Media</title>
        </Head>
        <div className="max-w-5xl mx-auto">
          <Skeleton className="w-full h-48 md:h-72 rounded-none" />
          <div className="px-4 py-4 space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Grup tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <Head>
        <title>{group.name} - Lost Media</title>
        <meta name="description" content={group.description || `Grup ${group.name}`} />
      </Head>

      {/* Cover Photo */}
      <div className="max-w-5xl mx-auto">
        <div className="relative w-full h-48 md:h-72 bg-gradient-to-r from-gray-700 to-gray-900 rounded-b-lg overflow-hidden">
          {group.cover_photo ? (
            <img
              src={group.cover_photo}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500" />
          )}
          {/* Overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-white text-sm">
              Grup oleh{" "}
              <span className="font-semibold">
                {group.creator?.full_name || group.creator?.username || "Unknown"}
              </span>
            </p>
          </div>

          {/* Edit cover button for admins */}
          {isMember && memberRole === "admin" && (
            <label className="absolute top-4 right-4 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await api.updateGroupCover(group.id, file);
                    toast({ title: "Cover berhasil diubah" });
                    loadGroup();
                  } catch {
                    toast({
                      title: "Gagal upload cover",
                      variant: "destructive",
                    });
                  }
                }}
              />
              <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white dark:hover:bg-gray-700 transition-colors">
                <ImageIcon className="h-4 w-4" />
                Edit Cover
              </div>
            </label>
          )}
        </div>

        {/* Group Info */}
        <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {group.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {getPrivacyIcon()}
            <span>{getPrivacyLabel()}</span>
            <span>·</span>
            <span>{formatMemberCount(group.members_count || membersTotal)}</span>
          </div>

          {/* Member Avatars + Actions */}
          <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
            {/* Member Avatars */}
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {members.slice(0, 10).map((m) => (
                  <Link key={m.id} href={`/profile/${m.user?.username || m.user_id}`}>
                    <Avatar className="h-8 w-8 border-2 border-white dark:border-zinc-900 cursor-pointer hover:z-10 transition-transform hover:scale-110">
                      <AvatarImage src={m.user?.profile_photo || ""} />
                      <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {(m.user?.full_name || m.user?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
              {membersTotal > 10 && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  +{membersTotal - 10} lainnya
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-zinc-700"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Bagikan</span>
              </Button>

              {isMember ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-zinc-600 cursor-default"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                        Bergabung
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    >
                      <DropdownMenuItem
                        onClick={handleLeave}
                        className="text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Keluar Grup
                      </DropdownMenuItem>
                      {memberRole === "admin" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => router.push(`/groups/${slug}/settings`)}
                            className="cursor-pointer"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Pengaturan Grup
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteGroupDialogOpen(true)}
                            className="text-red-600 dark:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Hapus Grup
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleJoin}
                  disabled={joining}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  {joining ? "Bergabung..." : "Bergabung"}
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-4 border-t border-gray-200 dark:border-zinc-800 pt-2 -mb-4 overflow-x-auto">
            {(
              [
                { key: "tentang", label: "Tentang" },
                { key: "diskusi", label: "Diskusi" },
                { key: "orang", label: "Orang" },
                { key: "media", label: "Media" },
              ] as { key: TabType; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="py-4">
          {activeTab === "diskusi" && (
            <DiskusiTab
              group={group}
              posts={posts}
              postsLoading={postsLoading}
              isMember={isMember}
              session={session}
              onNewPost={(newPost) => {
                setPosts((prev) => {
                  // Prevent duplicate
                  if (prev.some((p) => p.id === newPost.id)) return prev;
                  return [newPost, ...prev];
                });
              }}
              onRefreshPosts={loadPosts}
              onPostDeleted={(postId) => {
                setPosts((prev) => prev.filter((p) => p.id !== postId));
              }}
            />
          )}
          {activeTab === "tentang" && (
            <TentangTab group={group} membersTotal={membersTotal} />
          )}
          {activeTab === "orang" && (
            <OrangTab members={members} membersTotal={membersTotal} />
          )}
          {activeTab === "media" && <MediaTab posts={posts} />}
        </div>
      </div>

      {/* Confirm Delete Group Dialog */}
      <AlertDialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Grup?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus grup {group?.name}? Tindakan ini tidak dapat dibatalkan. Semua postingan dan anggota akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingGroup}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteGroup();
              }}
              disabled={deletingGroup}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletingGroup ? (
                <>
                  <Skeleton className="h-4 w-4 mr-2 shrink-0" />
                  Menghapus...
                </>
              ) : (
                "Hapus Grup"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ==================== Tab Components ====================

interface DiskusiTabProps {
  group: Group;
  posts: Post[];
  postsLoading: boolean;
  isMember: boolean;
  session: any;
  onNewPost: (post: Post) => void;
  onRefreshPosts: () => void;
  onPostDeleted: (postId: string) => void;
}

const DiskusiTab: React.FC<DiskusiTabProps> = ({
  group,
  posts,
  postsLoading,
  isMember,
  session,
  onNewPost,
  onRefreshPosts,
  onPostDeleted,
}) => {
  const { api } = useApi();
  const { toast } = useToast();
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  // Override state for user interactions (like/comment); merged on top of base data
  const [likeOverrides, setLikeOverrides] = useState<Record<string, number>>({});
  const [userLikeOverrides, setUserLikeOverrides] = useState<Record<string, any>>({});
  const [commentOverrides, setCommentOverrides] = useState<Record<string, number>>({});

  // Comment dialog state
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState<Post | null>(null);

  // Photo modal state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Derive counts from post data + overrides (avoids setState inside useEffect)
  const postLikeCounts = useMemo(() => {
    const base: Record<string, number> = {};
    posts.forEach((p) => { base[p.id] = p.likes_count || 0; });
    return { ...base, ...likeOverrides };
  }, [posts, likeOverrides]);

  const postUserLikes = useMemo(() => {
    const base: Record<string, any> = {};
    posts.forEach((p) => { base[p.id] = p.user_liked || false; });
    return { ...base, ...userLikeOverrides };
  }, [posts, userLikeOverrides]);

  const postCommentCounts = useMemo(() => {
    const base: Record<string, number> = {};
    posts.forEach((p) => { base[p.id] = p.comments_count || 0; });
    return { ...base, ...commentOverrides };
  }, [posts, commentOverrides]);

  // WebSocket subscription for image upload completion
  useWebSocketSubscription((data: any) => {
    let messageData: any;
    if (data.type === "notification" && data.payload) {
      messageData = data.payload;
    } else {
      messageData = data;
    }

    if (messageData.type === "post_upload_pending") {
      toast({
        title: "Upload Dimulai",
        description: "Post sedang diproses, gambar sedang diupload...",
      });
    } else if (
      messageData.type === "post_upload_completed" ||
      (messageData.type === "notification" &&
        messageData.payload?.type === "post_upload_completed")
    ) {
      const notification =
        messageData.type === "notification" ? messageData.payload : messageData;

      let postID: string | null = notification.target_id || null;
      if (!postID && notification.data) {
        try {
          const parsed =
            typeof notification.data === "string"
              ? JSON.parse(notification.data)
              : notification.data;
          postID = parsed?.post_id || null;
        } catch {
          // ignore
        }
      }

      toast({
        title: notification.title || "Upload Selesai",
        description:
          notification.message ||
          `Post berhasil diupload dengan ${notification.data?.image_count || 0} gambar`,
      });

      // Fetch the newly created post and prepend it
      if (postID) {
        api
          .getPost(postID)
          .then((res: any) => {
            const newPost = res?.post || res?.data?.post;
            if (newPost && newPost.group_id === group.id) {
              onNewPost(newPost);
            }
          })
          .catch(() => {
            // Fallback: refresh all posts
            onRefreshPosts();
          });
      } else {
        onRefreshPosts();
      }
    }
  });

  const handleLikeChange = useCallback((postId: string, liked: boolean, likeCount: number) => {
    setLikeOverrides((prev) => ({ ...prev, [postId]: likeCount }));
    setUserLikeOverrides((prev) => ({ ...prev, [postId]: liked }));
  }, []);

  const handleOpenCommentDialog = useCallback((post: Post) => {
    setSelectedPostForComment(post);
    setCommentDialogOpen(true);
  }, []);

  const handleCloseCommentDialog = useCallback(() => {
    setCommentDialogOpen(false);
    setSelectedPostForComment(null);
  }, []);

  const handleImageClick = useCallback((post: Post, imageIndex: number) => {
    setSelectedPost(post);
    setSelectedImageIndex(imageIndex);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedPost(null);
    setSelectedImageIndex(0);
  }, []);

  const handleNavigateImage = useCallback((direction: "prev" | "next") => {
    if (!selectedPost?.image_urls) return;
    const total = selectedPost.image_urls.length;
    let newIdx = selectedImageIndex;
    if (direction === "prev" && selectedImageIndex > 0) newIdx--;
    else if (direction === "next" && selectedImageIndex < total - 1) newIdx++;
    if (newIdx !== selectedImageIndex) setSelectedImageIndex(newIdx);
  }, [selectedPost, selectedImageIndex]);

  const handlePostSuccess = useCallback(
    (newPost?: Post) => {
      if (newPost) {
        // Instantly prepend the new post — no refresh needed
        onNewPost(newPost);
      } else {
        // Fallback: refetch
        onRefreshPosts();
      }
    },
    [onNewPost, onRefreshPosts]
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Main Feed (Left) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Create Post Widget - like feed-client */}
          {isMember && session && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-4 mb-4">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback>
                      {(session.user?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setIsPostDialogOpen(true)}
                    className="flex-1 w-full h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center px-4 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-left text-sm"
                  >
                    Tulis sesuatu di {group.name}...
                  </button>
                </div>
                <Separator className="mb-4" />
                <div className="flex justify-between px-4">
                  <Button
                    variant="ghost"
                    className="flex-1 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Video className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">Video</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 gap-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => setIsPostDialogOpen(true)}
                  >
                    <ImageIcon className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">Foto/Video</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 gap-2 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                  >
                    <Smile className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">Perasaan</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts */}
          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Belum ada postingan di grup ini
              </p>
              {isMember && (
                <Button
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setIsPostDialogOpen(true)}
                >
                  Buat postingan pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
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
                  onPostDeleted={onPostDeleted}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar (Right) */}
        <div className="lg:col-span-2 space-y-4">
          {/* About Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Tentang</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">
                    {group.privacy === "open"
                      ? "Publik"
                      : group.privacy === "closed"
                      ? "Tertutup"
                      : "Rahasia"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {group.privacy === "open"
                      ? "Siapa pun bisa melihat siapa saja anggota grup ini dan apa yang mereka posting."
                      : group.privacy === "closed"
                      ? "Hanya anggota yang bisa melihat postingan di grup ini."
                      : "Hanya anggota yang bisa menemukan grup ini."}
                  </p>
                </div>
              </div>
              {group.privacy !== "secret" && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      Dapat dilihat
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Semua orang bisa menemukan grup ini.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Card */}
          {posts.some((p) => {
            const imgs = p.image_urls;
            return imgs && Array.isArray(imgs) && imgs.length > 0;
          }) && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                Media terbaru
              </h3>
              <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                {posts
                  .flatMap((p) => {
                    const imgs = p.image_urls;
                    if (Array.isArray(imgs)) return imgs;
                    return [];
                  })
                  .slice(0, 6)
                  .map((url: string, i: number) => (
                    <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post Dialog */}
      {session?.user && (
        <PostDialog
          open={isPostDialogOpen}
          onClose={() => setIsPostDialogOpen(false)}
          onSuccess={handlePostSuccess}
          userId={session.user.id || ""}
          groupId={group.id}
        />
      )}

      {/* Comment Dialog */}
      <CommentDialog
        open={commentDialogOpen}
        onClose={handleCloseCommentDialog}
        post={selectedPostForComment}
        onCommentCountChange={(count) => {
          if (selectedPostForComment) {
            setCommentOverrides((prev) => ({
              ...prev,
              [selectedPostForComment.id]: count,
            }));
          }
        }}
      />

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
    </>
  );
};

interface TentangTabProps {
  group: Group;
  membersTotal: number;
}

const TentangTab: React.FC<TentangTabProps> = ({ group, membersTotal }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Tentang Grup
        </h2>
        {group.description ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {group.description}
          </p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">
            Tidak ada deskripsi
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800 pt-4 space-y-4">
        <div className="flex items-start gap-3">
          {group.privacy === "open" ? (
            <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
          ) : group.privacy === "closed" ? (
            <Lock className="h-5 w-5 text-gray-500 mt-0.5" />
          ) : (
            <EyeOff className="h-5 w-5 text-gray-500 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {group.privacy === "open"
                ? "Publik"
                : group.privacy === "closed"
                ? "Tertutup"
                : "Rahasia"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {group.privacy === "open"
                ? "Siapa pun bisa melihat siapa saja anggota grup ini dan apa yang mereka posting."
                : group.privacy === "closed"
                ? "Hanya anggota yang bisa melihat postingan di grup ini."
                : "Hanya anggota yang bisa menemukan grup ini."}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {membersTotal} anggota
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Bergabung untuk berinteraksi dengan anggota lainnya
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800 pt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Dibuat oleh{" "}
          <Link
            href={`/profile/${group.creator?.username || group.created_by}`}
            className="font-semibold text-gray-900 dark:text-white hover:underline"
          >
            {group.creator?.full_name || group.creator?.username || "Unknown"}
          </Link>
          {" · "}
          {new Date(group.created_at).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
};

interface OrangTabProps {
  members: GroupMember[];
  membersTotal: number;
}

const OrangTab: React.FC<OrangTabProps> = ({ members, membersTotal }) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
            Admin
          </span>
        );
      case "moderator":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            Moderator
          </span>
        );
      default:
        return null;
    }
  };

  // Sort admins first, then moderators, then members
  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<string, number> = { admin: 0, moderator: 1, member: 2 };
    return (order[a.role] ?? 2) - (order[b.role] ?? 2);
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">
          Anggota · {membersTotal}
        </h3>
        <div className="space-y-3">
          {sortedMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Link href={`/profile/${m.user?.username || m.user_id}`} className="shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.user?.profile_photo || ""} />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {(m.user?.full_name || m.user?.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${m.user?.username || m.user_id}`}
                  className="font-semibold text-sm text-gray-900 dark:text-white hover:underline"
                >
                  <UserNameWithRole
                    displayName={
                      m.user?.username || m.user?.full_name || "User"
                    }
                    role={m.user?.user_type}
                    className="truncate inline-block max-w-full"
                  />
                </Link>
                <div className="flex items-center gap-2">
                  {getRoleBadge(m.role)}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Bergabung{" "}
                    {new Date(m.created_at).toLocaleDateString("id-ID", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface MediaTabProps {
  posts: Post[];
}

const MediaTab: React.FC<MediaTabProps> = ({ posts }) => {
  const allImages = posts.flatMap((p) => {
    const imgs = (p as any).image_urls;
    if (Array.isArray(imgs)) return imgs;
    return [];
  });

  if (allImages.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8 text-center">
        <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">
          Belum ada media di grup ini
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">
          Media · {allImages.length}
        </h3>
        <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
          {allImages.map((url: string, i: number) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800">
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupPage;
