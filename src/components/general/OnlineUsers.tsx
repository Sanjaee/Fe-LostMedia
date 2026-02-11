"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApi } from "@/components/contex/ApiProvider";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";

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

  const loadOnlineUsers = useCallback(async () => {
    try {
      const res = (await api.getOnlineUsers()) as any;
      const users: OnlineUser[] = res?.users || [];
      setOnlineUsers(users);
    } catch {
      console.error("Failed to load online users");
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load on mount
  useEffect(() => {
    if (session?.user?.id) {
      setLoading(true);
      loadOnlineUsers();
    }
  }, [session?.user?.id, loadOnlineUsers]);

  // Listen to WebSocket presence events for real-time updates
  useWebSocketSubscription((data: any) => {
    const payload = data?.payload || data;
    if (payload?.type === "user_presence") {
      const userId = payload.user_id as string;
      const online = payload.online as boolean;

      if (online) {
        // Reload to get full user info
        loadOnlineUsers();
      } else {
        // Remove the user that went offline
        setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
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

  return (
    <div className="max-h-[calc(100dvh-220px)] overflow-y-auto pr-1 -mr-1 space-y-0.5">
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
    </div>
  );
};
