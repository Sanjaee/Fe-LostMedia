"use client";

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSharedData } from "@/contexts/SharedDataContext";
import { Skeleton } from "@/components/ui/skeleton";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";

export const OnlineUsers: React.FC = () => {
  const { onlineUsers, onlineUsersLoading } = useSharedData();

  if (onlineUsersLoading) {
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
        No one online
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
