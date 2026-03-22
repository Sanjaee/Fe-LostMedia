"use client";

import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import type { Friendship } from "@/types/friendship";

interface OnlineUser {
  id: string;
  full_name: string;
  username?: string;
  profile_photo?: string;
  user_type?: string;
}

interface SharedDataContextType {
  onlineUsers: OnlineUser[];
  onlineUserIds: Set<string>;
  onlineUsersLoading: boolean;
  refetchOnlineUsers: () => Promise<void>;

  friends: Friendship[];
  friendsLoading: boolean;
  refetchFriends: () => Promise<void>;

  chatUnreadBySenders: Record<string, number>;
  chatUnreadLoading: boolean;
  refetchChatUnread: () => Promise<void>;
}

const SharedDataContext = createContext<SharedDataContextType | undefined>(undefined);

/** In-flight promise deduplication - satu request dipakai banyak subscriber */
const inFlight = new Map<string, Promise<any>>();

async function dedupeFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = fetcher().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

const CACHE_TTL_MS = 3000; // 3 detik - hindari duplicate hit saat mount bersamaan

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.data;
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, ts: Date.now() });
}

export const useSharedData = () => {
  const ctx = useContext(SharedDataContext);
  if (!ctx) throw new Error("useSharedData must be used within SharedDataProvider");
  return ctx;
};

interface SharedDataProviderProps {
  children: React.ReactNode;
}

export const SharedDataProvider: React.FC<SharedDataProviderProps> = ({ children }) => {
  const { api } = useApi();
  const { data: session, status } = useSession();

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(true);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [chatUnreadBySenders, setChatUnreadBySenders] = useState<Record<string, number>>({});
  const [chatUnreadLoading, setChatUnreadLoading] = useState(false);

  const hasFetchedOnlineRef = useRef(false);
  const hasFetchedFriendsRef = useRef(false);

  const refetchOnlineUsers = useCallback(async () => {
    const key = "online_users";
    const cached = getCached<OnlineUser[]>(key);
    if (cached) {
      setOnlineUsers(cached);
      setOnlineUsersLoading(false);
      return;
    }
    setOnlineUsersLoading(true);
    try {
      const data = await dedupeFetch(key, async () => {
        const res = (await api.getOnlineUsers()) as any;
        return res?.users || res?.data?.users || [];
      });
      setOnlineUsers(data);
      setCache(key, data);
    } catch {
      setOnlineUsers([]);
    } finally {
      setOnlineUsersLoading(false);
    }
  }, [api]);

  const refetchFriends = useCallback(async () => {
    if (!session?.user?.id) {
      setFriends([]);
      setFriendsLoading(false);
      return;
    }
    const key = `friends_${session.user.id}`;
    const cached = getCached<Friendship[]>(key);
    if (cached) {
      setFriends(cached);
      setFriendsLoading(false);
      return;
    }
    setFriendsLoading(true);
    try {
      const data = await dedupeFetch(key, async () => {
        const res = (await api.getFriends()) as any;
        if (Array.isArray(res)) return res;
        if (res?.friends) return res.friends;
        if (res?.data?.friends) return res.data.friends;
        if (res?.data?.friendships) return res.data.friendships;
        if (res?.friendships) return res.friendships;
        return [];
      });
      setFriends(data);
      setCache(key, data);
    } catch {
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [api, session?.user?.id]);

  const refetchChatUnread = useCallback(async () => {
    if (!session?.user?.id) {
      setChatUnreadBySenders({});
      setChatUnreadLoading(false);
      return;
    }
    const key = `chat_unread_${session.user.id}`;
    const cached = getCached<Record<string, number>>(key);
    if (cached) {
      setChatUnreadBySenders(cached);
      setChatUnreadLoading(false);
      return;
    }
    setChatUnreadLoading(true);
    try {
      const data = await dedupeFetch(key, async () => {
        const res = (await api.getChatUnreadBySenders()) as any;
        const counts = res?.counts ?? res?.data?.counts ?? {};
        return typeof counts === "object" ? counts : {};
      });
      setChatUnreadBySenders(data);
      setCache(key, data);
    } catch {
      setChatUnreadBySenders({});
    } finally {
      setChatUnreadLoading(false);
    }
  }, [api, session?.user?.id]);

  // Fetch online users sekali saat mount
  useEffect(() => {
    if (hasFetchedOnlineRef.current) return;
    hasFetchedOnlineRef.current = true;
    refetchOnlineUsers();
  }, [refetchOnlineUsers]);

  // Fetch friends sekali saat session ready
  useEffect(() => {
    if (!session?.user?.id) {
      setFriends([]);
      hasFetchedFriendsRef.current = false;
      return;
    }
    if (hasFetchedFriendsRef.current) return;
    hasFetchedFriendsRef.current = true;
    void refetchFriends();
  }, [session?.user?.id, refetchFriends]);

  // Fetch chat unread sekali saat session ready (untuk ContactsList)
  useEffect(() => {
    if (!session?.user?.id) {
      setChatUnreadBySenders({});
      return;
    }
    refetchChatUnread();
  }, [session?.user?.id, refetchChatUnread]);

  // Reset cache saat user berubah (logout)
  useEffect(() => {
    if (status === "unauthenticated") {
      hasFetchedFriendsRef.current = false;
      setFriends([]);
      setChatUnreadBySenders({});
    }
  }, [status]);

  // Listen to friendship-changed → refetch friends
  useEffect(() => {
    const handler = () => {
      cache.delete(`friends_${session?.user?.id}`);
      hasFetchedFriendsRef.current = false;
      if (session?.user?.id) refetchFriends();
    };
    window.addEventListener("friendship-changed", handler);
    return () => window.removeEventListener("friendship-changed", handler);
  }, [session?.user?.id, refetchFriends]);

  // Listen to chat-closed → refetch unread
  useEffect(() => {
    const handler = () => {
      cache.delete(`chat_unread_${session?.user?.id}`);
      if (session?.user?.id) refetchChatUnread();
    };
    window.addEventListener("chat-closed", handler);
    return () => window.removeEventListener("chat-closed", handler);
  }, [session?.user?.id, refetchChatUnread]);

  // WebSocket user_presence → refetch online users
  const refetchOnlineRef = useRef(refetchOnlineUsers);
  refetchOnlineRef.current = refetchOnlineUsers;
  useWebSocketSubscription((data: any) => {
    const payload = data?.payload || data;
    if (payload?.type === "user_presence") refetchOnlineRef.current();
  });

  const onlineUserIds = React.useMemo(() => new Set(onlineUsers.map((u) => u.id)), [onlineUsers]);

  const value: SharedDataContextType = {
    onlineUsers,
    onlineUserIds,
    onlineUsersLoading,
    refetchOnlineUsers,
    friends,
    friendsLoading,
    refetchFriends,
    chatUnreadBySenders,
    chatUnreadLoading,
    refetchChatUnread,
  };

  return (
    <SharedDataContext.Provider value={value}>
      {children}
    </SharedDataContext.Provider>
  );
};
