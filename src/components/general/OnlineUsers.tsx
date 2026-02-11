"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApi } from "@/components/contex/ApiProvider";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { Button } from "@/components/ui/button";

interface OnlineUser {
  id: string;
  full_name: string;
  username?: string;
  profile_photo?: string;
  user_type?: string;
}

export const OnlineUsers: React.FC = () => {
  const { api } = useApi();
  const { data: session } = useSession();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const onlineCountRef = useRef(0);

  const PAGE_SIZE = 5;

  const fetchOnlineUsers = useCallback(async (limit: number, offset: number) => {
    try {
      const res = (await api.getOnlineUsers(limit, offset)) as any;
      const users: OnlineUser[] = res?.users || [];
      const total = res?.count ?? res?.total ?? users.length;
      return { users, total };
    } catch {
      console.error("Failed to load online users");
      return { users: [] as OnlineUser[], total: 0 };
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load on mount
  useEffect(() => {
    if (session?.user?.id) {
      setLoading(true);
      void (async () => {
        const res = await fetchOnlineUsers(PAGE_SIZE, 0);
        setOnlineUsers(res.users);
        setTotalCount(res.total);
      })();
    }
  }, [session?.user?.id, fetchOnlineUsers]);

  useEffect(() => {
    onlineCountRef.current = onlineUsers.length;
  }, [onlineUsers.length]);

  // Listen to WebSocket presence events for real-time updates
  useWebSocketSubscription((data: any) => {
    const payload = data?.payload || data;
    if (payload?.type === "user_presence") {
      const userId = payload.user_id as string;
      const online = payload.online as boolean;

      if (online) {
        // Refresh current page size to keep list updated
        const limit = Math.max(PAGE_SIZE, onlineCountRef.current);
        void (async () => {
          const res = await fetchOnlineUsers(limit, 0);
          setOnlineUsers(res.users);
          setTotalCount(res.total);
        })();
      } else {
        // Remove the user that went offline
        setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    }
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-1.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (onlineUsers.length === 0) {
    return (
      <p className="text-xs text-zinc-400 dark:text-zinc-500 px-2 py-2">
        Tidak ada yang online
      </p>
    );
  }

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextOffset = onlineUsers.length;
    const res = await fetchOnlineUsers(PAGE_SIZE, nextOffset);
    setOnlineUsers((prev) => [...prev, ...res.users]);
    setTotalCount(res.total);
    setLoadingMore(false);
  };

  return (
    <div className="space-y-0.5">
      {onlineUsers.map((user) => (
        <Link
          key={user.id}
          href={`/profile/${user.username || user.id}`}
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profile_photo || ""} />
              <AvatarFallback className="text-xs bg-zinc-200 dark:bg-zinc-700">
                {user.full_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {/* Green dot indicator */}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-900" />
          </div>
          <UserNameWithRole
            displayName={user.full_name || user.username || "—"}
            role={user.user_type}
            className="text-sm font-medium truncate"
          />
        </Link>
      ))}
      {totalCount > onlineUsers.length && (
        <div className="px-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Memuat..." : "Muat lebih banyak"}
          </Button>
        </div>
      )}
    </div>
  );
};
