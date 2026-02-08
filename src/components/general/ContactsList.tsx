"use client";

import React, { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { useApi } from "@/components/contex/ApiProvider";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import type { Friendship } from "@/types/friendship";

interface ChatUser {
  id: string;
  full_name: string;
  username?: string;
  profile_photo?: string;
}

interface ContactsListProps {
  friends: Friendship[];
  loading?: boolean;
  onChatClick?: (user: ChatUser) => void;
  refreshUnreadTrigger?: number; // bump to refetch unread counts (e.g. when chat dialog closes)
}

export const ContactsList: React.FC<ContactsListProps> = ({ friends, loading = false, onChatClick, refreshUnreadTrigger }) => {
  const { data: session } = useSession();
  const { api } = useApi();
  const currentUserId = session?.user?.id;
  const currentUserEmail = session?.user?.email;
  const [unreadBySender, setUnreadBySender] = React.useState<Record<string, number>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = (await api.getOnlineUsers()) as any;
        if (cancelled) return;
        const users: Array<{ id: string }> = res?.users || [];
        setOnlineUserIds(new Set(users.map((u) => u.id)));
      } catch {
        if (!cancelled) setOnlineUserIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, api]);

  useWebSocketSubscription((data: any) => {
    const payload = data?.payload || data;
    if (payload?.type === "user_presence") {
      const userId = payload.user_id as string;
      const online = payload.online as boolean;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    }
  });

  const loadUnreadBySenders = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await api.getChatUnreadBySenders();
      const counts = res.counts ?? (res as any).data?.counts ?? {};
      setUnreadBySender(typeof counts === "object" ? counts : {});
    } catch {
      setUnreadBySender({});
    }
  }, [currentUserId, api]);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getChatUnreadBySenders();
        if (cancelled) return;
        const counts = res.counts ?? (res as any).data?.counts ?? {};
        setUnreadBySender(typeof counts === "object" ? counts : {});
      } catch {
        if (!cancelled) setUnreadBySender({});
      }
    })();
    return () => { cancelled = true; };
  }, [currentUserId, api, refreshUnreadTrigger]);

  useEffect(() => {
    const handleChatClosed = () => loadUnreadBySenders();
    window.addEventListener("chat-closed", handleChatClosed);
    return () => window.removeEventListener("chat-closed", handleChatClosed);
  }, [loadUnreadBySenders]);

  useWebSocketSubscription((data: any) => {
    const payload = data.type === "chat_message" ? data.payload : (data.type === "notification" && data.payload?.type === "chat_message" ? data.payload.payload : null);
    if (payload && currentUserId && payload.receiver_id === currentUserId) {
      const senderId = payload.sender_id;
      setUnreadBySender((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] ?? 0) + 1,
      }));
    }
  });

  const handleChatClick = (user: ChatUser) => {
    setUnreadBySender((prev) => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    onChatClick?.(user);
  };

  // Helper function to get initials
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter and process friends
  const processedFriends = React.useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    if (!friends || friends.length === 0) {
      return [];
    }

    // Filter only accepted friendships with complete data
    const acceptedFriends = friends.filter((friendship) => {
      const isAccepted = friendship.status === "accepted";
      const hasData = friendship.sender && friendship.receiver;
      return isAccepted && hasData;
    });

    // Extract unique friends (excluding current user)
    const friendsMap = new Map<string, { friendship: Friendship; friend: NonNullable<Friendship['sender']> }>();

    acceptedFriends.forEach((friendship) => {
      // Determine which user is the friend (not the current user)
      // Try matching by ID first, then by email as fallback
      let friend = null;
      let isCurrentUserSender = false;
      let isCurrentUserReceiver = false;
      
      // Match by ID
      if (String(friendship.sender_id) === String(currentUserId)) {
        isCurrentUserSender = true;
      } else if (String(friendship.receiver_id) === String(currentUserId)) {
        isCurrentUserReceiver = true;
      }
      
      // Fallback: Match by email if ID doesn't match
      if (!isCurrentUserSender && !isCurrentUserReceiver && currentUserEmail) {
        const senderEmail = (friendship.sender as any)?.email;
        const receiverEmail = (friendship.receiver as any)?.email;
        
        if (senderEmail && String(senderEmail).toLowerCase() === String(currentUserEmail).toLowerCase()) {
          isCurrentUserSender = true;
        } else if (receiverEmail && String(receiverEmail).toLowerCase() === String(currentUserEmail).toLowerCase()) {
          isCurrentUserReceiver = true;
        }
      }
      
      if (isCurrentUserSender) {
        friend = friendship.receiver;
      } else if (isCurrentUserReceiver) {
        friend = friendship.sender;
      } else {
        // If current user is neither sender nor receiver, skip this friendship
        return;
      }

      // Skip if no friend data, if friend is the current user, or if already added
      if (!friend || !friend.id) {
        return;
      }

      if (String(friend.id) === String(currentUserId)) {
        return;
      }

      // Skip if already in map (avoid duplicates)
      if (friendsMap.has(String(friend.id))) {
        return;
      }

      // Add to map to ensure uniqueness
      friendsMap.set(String(friend.id), { friendship, friend });
    });

    return Array.from(friendsMap.values());
  }, [friends, currentUserId, currentUserEmail]);

  if (loading) {
    return (
      <div className="text-center py-4 text-zinc-500 text-sm">
        Memuat kontak...
      </div>
    );
  }

  if (processedFriends.length === 0) {
    return (
      <div className="text-center py-4 text-zinc-500 text-sm">
        Belum ada kontak
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto space-y-1">
      {processedFriends.map(({ friendship, friend }) => {
        const chatUser = {
          id: friend.id,
          full_name: friend.full_name,
          username: friend.username,
          profile_photo: friend.profile_photo,
          user_type: (friend as any).user_type,
          role: (friend as any).role,
        };
        const unread = unreadBySender[friend.id] ?? 0;
        return (
          <div
            key={friendship.id}
            role="button"
            tabIndex={0}
            onClick={() => handleChatClick(chatUser)}
            onKeyDown={(e) => e.key === "Enter" && handleChatClick(chatUser)}
            className="flex items-center gap-3 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
          >
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={friend.profile_photo || ''} />
                <AvatarFallback>{getInitials(friend.full_name)}</AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${onlineUserIds.has(friend.id) ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-500"}`}
              />
            </div>
            <div className="font-medium text-sm truncate flex-1">
              <UserNameWithRole
                displayName={friend.username || friend.full_name || "Unknown"}
                role={(friend as any).user_type ?? (friend as any).role}
                className="truncate inline-block max-w-full"
              />
            </div>
            {unread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs shrink-0">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
};
