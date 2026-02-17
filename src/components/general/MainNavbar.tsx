"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Home, 
  Users,
  Crown,
  Grid3x3, 
  MessageCircle, 
  Bell, 
  ChevronDown,
  LogOut,
  User,
  Settings,
  Shield,
  Moon,
  Sun,
  AlertCircle,
  Clapperboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDialog } from "./NotificationDialog";
import { ContactsList } from "./ContactsList";
import { useApi } from "@/components/contex/ApiProvider";
import { useChat } from "@/contexts/ChatContext";
import type { Friendship } from "@/types/friendship";
import type { Post } from "@/types/post";
import type { User as UserType } from "@/types/user";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import Link from "next/link";
import { DarkModeToggle } from "@/components/molecules/DarkModeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MainNavbar() {
  const { data: session, status } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const isDark = resolvedTheme === "dark";
  const { api } = useApi();
  const { openChat } = useChat();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [peopleResults, setPeopleResults] = useState<UserType[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRequestIdRef = useRef(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [messengerOpen, setMessengerOpen] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useWebSocketSubscription((data: any) => {
    let notification: any;
    if (data.type === "notification" && data.payload) {
      notification = data.payload;
    } else if (data.id) {
      notification = data;
    } else {
      return;
    }
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }
  });

  // Load unread count on mount and when notification dialog closes
  useEffect(() => {
    if (status === "authenticated") {
      (async () => {
        try {
          const response = await api.getUnreadCount();
          setUnreadCount(response.count || response.data?.count || 0);
        } catch (error) {
          console.error("Failed to load unread count:", error);
        }
      })();
    }
  }, [status, notificationOpen, api]);

  // Load friends for messenger dropdown
  const loadFriends = React.useCallback(async () => {
    try {
      setLoadingFriends(true);
      const response = (await api.getFriends()) as any;
      let friendsList: Friendship[] = [];
      if (Array.isArray(response)) friendsList = response;
      else if (response?.friends) friendsList = response.friends;
      else if (response?.data?.friends) friendsList = response.data.friends;
      else if (response?.data?.friendships) friendsList = response.data.friendships;
      else if (response?.friendships) friendsList = response.friendships;
      setFriends(friendsList);
    } catch {
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [api]);

  useEffect(() => {
    if (status === "authenticated" && messengerOpen) {
      loadFriends();
    }
  }, [status, messengerOpen, loadFriends]);

  useEffect(() => {
    const handleFriendshipChanged = () => {
      if (status === "authenticated") setTimeout(loadFriends, 300);
    };
    window.addEventListener("friendship-changed", handleFriendshipChanged);
    return () => window.removeEventListener("friendship-changed", handleFriendshipChanged);
  }, [status, loadFriends]);

  useEffect(() => {
    if (!searchDialogOpen) return;

    const keyword = searchQuery.trim();
    if (!keyword) {
      setPostResults([]);
      setPeopleResults([]);
      setSearchLoading(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        let posts: Post[] = [];
        try {
          const postsRes = await api.searchPosts(keyword, 5, 0);
          posts = (postsRes as any).posts || (postsRes as any).data?.posts || [];
        } catch {
          try {
            const fallbackRes = await api.getFeed(50, 0, "newest");
            const fallbackPosts: Post[] = (fallbackRes as any).posts || (fallbackRes as any).data?.posts || [];
            const lowered = keyword.toLowerCase();
            posts = fallbackPosts.filter((post) =>
              (post.content || "").toLowerCase().includes(lowered)
            ).slice(0, 5);
          } catch {
            posts = [];
          }
        }

        const peopleRes = await api.searchUsers(keyword, 10, 0);

        if (searchRequestIdRef.current !== requestId) return;

        const users = (peopleRes as any).users || (peopleRes as any).data?.users || [];
        const lowered = keyword.toLowerCase();
        const currentUserId = session?.user?.id;
        const filteredUsers = users.filter((user: UserType) => {
          if (currentUserId && user.id === currentUserId) return false;
          const name = (user.full_name || "").toLowerCase();
          const username = (user.username || "").toLowerCase();
          return name.includes(lowered) || username.includes(lowered);
        });

        setPostResults(posts);
        setPeopleResults(filteredUsers.slice(0, 5));
      } catch {
        if (searchRequestIdRef.current !== requestId) return;
        setPostResults([]);
        setPeopleResults([]);
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchDialogOpen, searchQuery, api, session?.user?.id]);

  const handleChatClick = (user: { id: string; full_name: string; username?: string; profile_photo?: string }) => {
    openChat(user);
    setMessengerOpen(false);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  const getInitials = (name?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 1);
    }
    return "U";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search/?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchDialogOpen(false);
    }
  };

  // Helper function to check if a path is active
  const isPathActive = (path: string) => {
    if (path === "/") {
      return router.pathname === "/";
    }
    return router.pathname.startsWith(path);
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Users, label: "Grup", path: "/groups" },
    { icon: Clapperboard, label: "Reels", path: "/reels" },
    { icon: Crown, label: "Role", path: "/role" },
    { icon: AlertCircle, label: "Report", path: "/report" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
      <div className="max-w-[1444px] mx-auto flex items-center min-h-14 py-2 px-4 relative">

        {/* Left: Logo + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo.png" alt="Logo" width={35} height={35} className="w-10 h-10" />
          </Link>

          {/* Search Bar - Full width on mobile, fixed width on desktop */}
          <form onSubmit={handleSearch} className="flex-1 md:flex-none md:w-64">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onClick={() => setSearchDialogOpen(true)}
                readOnly
                placeholder="Cari di Lost Media"
                className="w-full min-h-[2.5rem] pl-10 pr-4 py-2 bg-gray-700 dark:bg-gray-800 text-left text-white placeholder-gray-400 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-gray-500 focus:bg-gray-600 dark:focus:bg-gray-700"
              />
            </div>
          </form>
        </div>

        {/* Center: Navigation Icons - Hidden on mobile, shown on desktop */}
        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-lg transition-colors",
                  isActive
                    ? "text-blue-600"
                    : "text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800"
                )}
                title={item.label}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>

        {/* Right: Utility Icons + Profile - Hidden on mobile, shown on desktop */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-end">
          {/* Menu */}
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            title="Menu"
          >
            <Grid3x3 className="h-5 w-5 text-gray-300" />
          </button>

          {/* Messenger - Dropdown dengan daftar teman */}
          <DropdownMenu
            open={messengerOpen}
            onOpenChange={(open) => {
              setMessengerOpen(open);
              if (open) setLoadingFriends(true);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                  messengerOpen
                    ? "bg-gray-600 dark:bg-gray-700"
                    : "bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
                )}
                title="Messenger"
              >
                <MessageCircle className="h-5 w-5 text-gray-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 max-h-[400px] overflow-hidden p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Messenger</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pilih teman untuk chat</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                <ContactsList
                  friends={friends}
                  loading={loadingFriends}
                  onChatClick={handleChatClick}
                  refreshUnreadTrigger={0}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <button
            onClick={() => setNotificationOpen(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Profile Dropdown */}
          {status === "loading" ? (
            <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {getInitials(session.user.name)}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-gray-700 dark:bg-gray-800 rounded-full border-2 border-gray-800 dark:border-gray-900">
                    <ChevronDown className="h-2.5 w-2.5 text-gray-300" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="min-w-56 w-max max-w-[280px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                <DropdownMenuLabel className="flex flex-col space-y-1 p-0">
                  <div className="flex items-center gap-3 px-2 py-1.5 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-white break-words">
                        <UserNameWithRole
                          displayName={session.user.name || (session.user as any)?.username || "User"}
                          role={session.userType || (session.user as any)?.user_type || (session.user as any)?.role}
                          className="break-words"
                        />
                      </span>
                      {session.user.email && (
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                          {session.user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuItem
                  onClick={() => router.push("/profile")}
                  className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                  className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/report")}
                  className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Report
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {isDark ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Tema terang
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Tema gelap
                    </>
                  )}
                </DropdownMenuItem>
                {/* Admin menu - only show if user is admin */}
                {(() => {
                  const userType = session.userType || 
                    session.user?.userType || 
                    session.user?.user_type || 
                    session.user?.role || 
                    (session.user as any)?.userType;
                  
                  if (userType === "owner") {
                    return (
                      <>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                        <DropdownMenuItem
                          onClick={() => router.push("/admin")}
                          className="cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    );
                  }
                  return null;
                })()}
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile: Reels + Grup + Message + Notifications + Profile */}
        <div className="md:hidden flex items-center gap-2 ml-2">
          {/* Reels - Mobile */}
          <button
            onClick={() => router.push("/reels")}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
              router.pathname === "/reels"
                ? "bg-gray-600 dark:bg-gray-700"
                : "bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
            )}
            title="Reels"
          >
            <Clapperboard className="h-5 w-5 text-gray-300" />
          </button>
          {/* Grup - Mobile */}
          <button
            onClick={() => router.push("/groups")}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
              router.pathname === "/groups" || router.pathname.startsWith("/groups/")
                ? "bg-gray-600 dark:bg-gray-700"
                : "bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
            )}
            title="Grup"
          >
            <Users className="h-5 w-5 text-gray-300" />
          </button>
          {/* Online Users - Mobile */}
          <button
            onClick={() => router.push("/online-users")}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
              router.pathname === "/online-users"
                ? "bg-gray-600 dark:bg-gray-700"
                : "bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
            )}
            title="Online Users"
          >
            <Users className="h-5 w-5 text-gray-300" />
          </button>
          {/* Message - Mobile: navigate to /message */}
          <button
            onClick={() => router.push("/message")}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
              router.pathname === "/message" ? "bg-gray-600 dark:bg-gray-700" : "bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700"
            )}
            title="Messenger"
          >
            <MessageCircle className="h-5 w-5 text-gray-300" />
          </button>
          {/* Notifications - Mobile */}
          <button
            onClick={() => setNotificationOpen(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Profile Sidebar - Mobile */}
          {status === "loading" ? (
            <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
          ) : session?.user ? (
            <>
              <Sheet open={profileSidebarOpen} onOpenChange={setProfileSidebarOpen}>
                <SheetTrigger asChild>
                  <button className="relative flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {getInitials(session.user.name)}
                      </span>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-gray-700 dark:bg-gray-800 rounded-full border-2 border-gray-800 dark:border-gray-900">
                      <ChevronDown className="h-2.5 w-2.5 text-gray-300" />
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-80 bg-gray-800 dark:bg-gray-900 border-gray-700 h-[100dvh] flex flex-col"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={session.user.image || undefined}
                          alt={session.user.name || "User"}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                          {getInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-lg text-white">
                          {session.user.name || "User"}
                        </span>
                        {session.user.email && (
                          <span className="text-sm text-gray-400">
                            {session.user.email}
                          </span>
                        )}
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex items-center justify-between px-2 py-2 border-b border-gray-700">
                    <span className="text-sm text-gray-400">Tema</span>
                    <DarkModeToggle variant="switch" />
                  </div>
                  <div className="mt-6 space-y-2 overflow-y-auto pr-1 -mr-1 flex-1 min-h-0">
                    {/* Navigation Items */}
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isPathActive(item.path);
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            router.push(item.path);
                            setProfileSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                    
                    <div className="border-t border-gray-700 my-4"></div>
                    
                    {/* Profile Actions */}
                    <button
                      onClick={() => {
                        router.push("/profile");
                        setProfileSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                        router.pathname === "/profile" || router.pathname.startsWith("/profile/")
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800"
                      )}
                    >
                      <User className="h-5 w-5" />
                      <span className="font-medium">Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        router.push("/settings");
                        setProfileSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                        router.pathname === "/settings" || router.pathname.startsWith("/settings/")
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800"
                      )}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">Settings</span>
                    </button>
                    
                    {/* Admin menu - only show if user is admin */}
                    {(() => {
                      const userType = session.userType || 
                        session.user?.userType || 
                        session.user?.user_type || 
                        session.user?.role || 
                        (session.user as any)?.userType;
                      
                      if (userType === "owner") {
                        const isAdminActive = router.pathname === "/admin" || router.pathname.startsWith("/admin/");
                        return (
                          <button
                            onClick={() => {
                              router.push("/admin");
                              setProfileSidebarOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                              isAdminActive
                                ? "bg-blue-600 text-white"
                                : "text-blue-400 hover:bg-blue-900/20"
                            )}
                          >
                            <Shield className="h-5 w-5" />
                            <span className="font-medium">Admin Dashboard</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="border-t border-gray-700 my-4"></div>
                    
                    {/* Utility Items */}
                    <button
                      onClick={() => {
                        setNotificationOpen(true);
                        setProfileSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 text-left"
                    >
                      <Bell className="h-5 w-5" />
                      <span className="font-medium">Notifikasi</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        router.push("/message");
                        setProfileSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                        router.pathname === "/message" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800"
                      )}
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span className="font-medium">Messenger</span>
                    </button>
                    
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 text-left"
                    >
                      <Grid3x3 className="h-5 w-5" />
                      <span className="font-medium">Menu</span>
                    </button>
                    
                    <div className="border-t border-gray-700 my-4"></div>
                    
                    {/* Logout */}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setProfileSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-400 hover:bg-red-900/20 text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <Button asChild variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
      <NotificationDialog
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
      />
      <Dialog
        open={searchDialogOpen}
        onOpenChange={(open) => {
          setSearchDialogOpen(open);
          if (!open) {
            setSearchQuery("");
            setPostResults([]);
            setPeopleResults([]);
            setSearchLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl w-[95vw] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">
              Cari
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari post atau orang..."
                autoFocus
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
              />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Post
                  </h3>
                </div>
                {searchLoading ? (
                  <div className="text-sm text-gray-500">Memuat...</div>
                ) : postResults.length === 0 ? (
                  <div className="text-sm text-gray-500">Tidak ada post</div>
                ) : (
                  <div className="space-y-2">
                    {postResults.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => {
                          router.push(`/post/${post.id}`);
                          setSearchDialogOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-900 dark:text-white line-clamp-2">
                            {post.content || "Post tanpa teks"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {post.user?.full_name || post.user?.username || "User"}
                          </div>
                        </div>
                        {(post.image_urls?.[0] || post.video_urls?.[0]) && (
                          <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
                            {post.image_urls?.[0] ? (
                              <img
                                src={post.image_urls[0]}
                                alt="Post thumbnail"
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <video
                                src={post.video_urls?.[0]}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                              />
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Orang
                  </h3>
                </div>
                {searchLoading ? (
                  <div className="text-sm text-gray-500">Memuat...</div>
                ) : peopleResults.length === 0 ? (
                  <div className="text-sm text-gray-500">Tidak ada orang</div>
                ) : (
                  <div className="space-y-2">
                    {peopleResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          router.push(`/profile/${user.username || user.id}`);
                          setSearchDialogOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile_photo || ""} />
                          <AvatarFallback className="text-xs bg-zinc-200 dark:bg-zinc-700">
                            {user.full_name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <UserNameWithRole
                            displayName={user.full_name || user.username || "—"}
                            role={user.user_type}
                            className="text-sm font-medium truncate"
                          />
                          {user.username && (
                            <div className="text-xs text-gray-500">@{user.username}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSearchDialogOpen(false)}
              >
                Tutup
              </Button>
              <Button type="submit" disabled={!searchQuery.trim()}>
                Lihat semua hasil
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
