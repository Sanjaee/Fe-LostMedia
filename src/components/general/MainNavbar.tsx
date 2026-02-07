"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
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
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Home, 
  Flag, 
  BarChart3, 
  Megaphone, 
  Video, 
  Grid3x3, 
  MessageCircle, 
  Bell, 
  ChevronDown,
  LogOut,
  User,
  Settings,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDialog } from "./NotificationDialog";
import { useApi } from "@/components/contex/ApiProvider";
import { useWebSocket } from "@/hooks/useWebSocket";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function MainNavbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { api } = useApi();
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);

  // WebSocket for realtime notifications
  const wsUrl =
    typeof window !== "undefined"
      ? `${process.env.NEXT_PUBLIC_WS_URL || "wss://lostmedia.zacloth.com"}/ws`
      : "";

  useWebSocket(wsUrl, {
    onMessage: (data: any) => {
      // Handle WebSocket message format
      // Backend sends: { type: "notification", payload: {...} }
      let notification: any;
      if (data.type === "notification" && data.payload) {
        notification = data.payload;
      } else if (data.id) {
        // Direct notification object
        notification = data;
      } else {
        return; // Invalid message format
      }

      // Only increment unread count if notification is not read
      if (!notification.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
    },
    onError: (error) => {
      console.error("WebSocket error in MainNavbar:", error);
    },
  });

  // Load unread count on mount and when notification dialog closes
  useEffect(() => {
    if (status === "authenticated") {
      // Call async function inside effect to avoid synchronous setState
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
    { icon: Flag, label: "Pages", path: "/pages" },
    { icon: BarChart3, label: "Insights", path: "/insights" },
    { icon: Megaphone, label: "Ads", path: "/ads" },
    { icon: Video, label: "Reels", path: "/reels" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
      <div className="max-w-[1444px] mx-auto flex items-center h-14 px-4 relative">

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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari di Lost Media"
                className="w-full pl-10 pr-4 py-2 bg-gray-700 dark:bg-gray-800 text-white placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:bg-gray-600 dark:focus:bg-gray-700"
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

          {/* Messenger */}
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            title="Messenger"
          >
            <MessageCircle className="h-5 w-5 text-gray-300" />
          </button>

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
                className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                <DropdownMenuLabel className="flex flex-col space-y-1 p-0">
                  <div className="flex items-center gap-3 px-2 py-1.5">
                    <Avatar className="h-10 w-10">
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
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {session.user.name || "User"}
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
                {/* Admin menu - only show if user is admin */}
                {(() => {
                  const userType = session.userType || 
                    session.user?.userType || 
                    session.user?.user_type || 
                    session.user?.role || 
                    (session.user as any)?.userType;
                  
                  if (userType === "admin") {
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
            <Button
              onClick={() => router.push("/auth/login")}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile: Profile + Notifications */}
        <div className="md:hidden flex items-center gap-2 ml-2">
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
                <SheetContent side="right" className="w-80 bg-gray-800 dark:bg-gray-900 border-gray-700">
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
                  <div className="mt-6 space-y-2">
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
                      
                      if (userType === "admin") {
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
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 text-left"
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
            <Button
              onClick={() => router.push("/auth/login")}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
      <NotificationDialog
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
      />
    </nav>
  );
}
