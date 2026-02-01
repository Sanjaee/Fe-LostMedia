"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, Check, User as UserIcon } from "lucide-react";
import type { User } from "@/types/user";

const SearchPeoplePage: React.FC = () => {
  const router = useRouter();
  const { api } = useApi();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendshipStatuses, setFriendshipStatuses] = useState<
    Record<string, string>
  >({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const query = (router.query.q as string) || "";

  useEffect(() => {
    if (query) {
      searchUsers();
    }
  }, [query]);

  // Refresh friendship statuses when friendship status changes (e.g., after accepting from notification)
  useEffect(() => {
    const refreshStatuses = async () => {
      if (users.length === 0) return;
      
      const statusPromises = users.map(async (user: User) => {
        try {
          const statusResponse = await api.getFriendshipStatus(user.id);
          const status = statusResponse.data?.status || "none";
          return { 
            userId: user.id, 
            status: status === "rejected" ? "none" : status 
          };
        } catch {
          return { userId: user.id, status: "none" };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap: Record<string, string> = {};
      statuses.forEach((item: { userId: string; status: string }) => {
        statusMap[item.userId] = item.status;
      });
      setFriendshipStatuses(statusMap);
    };

    const handleFriendshipStatusChanged = () => {
      refreshStatuses();
    };

    // Listen for custom event when friendship status changes
    window.addEventListener('friendshipStatusChanged', handleFriendshipStatusChanged);
    
    // Also refresh when window gains focus (e.g., user switches back to tab)
    const handleFocus = () => {
      refreshStatuses();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('friendshipStatusChanged', handleFriendshipStatusChanged);
      window.removeEventListener('focus', handleFocus);
    };
  }, [users, api]);

  const searchUsers = async () => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.searchUsers(query, 50, 0);
      // Response structure after unwrap: {users: [...], limit: 50, offset: 0, total: 1}
      // or wrapped: {data: {users: [...], limit: 50, offset: 0, total: 1}}
      const usersList = (response as any).users || response.data?.users || [];
      setUsers(usersList);

      // Load friendship statuses for all users
      const statusPromises = usersList.map(async (user: User) => {
        try {
          const statusResponse = await api.getFriendshipStatus(user.id);
          const status = statusResponse.data?.status || "none";
          // Map "rejected" status to "none" so user can send request again
          return { 
            userId: user.id, 
            status: status === "rejected" ? "none" : status 
          };
        } catch {
          return { userId: user.id, status: "none" };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap: Record<string, string> = {};
      statuses.forEach((item: { userId: string; status: string }) => {
        statusMap[item.userId] = item.status;
      });
      setFriendshipStatuses(statusMap);
    } catch (error: any) {
      console.error("Failed to search users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));

    try {
      await api.sendFriendRequest({ receiver_id: userId });
      toast({
        title: "Success",
        description: "Friend request sent",
      });
      // Only update status if request was successful
      setFriendshipStatuses((prev) => ({ ...prev, [userId]: "pending" }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
      // Don't update status on error - keep current state
      // If error is "already pending", we might want to update status anyway
      if (error.message?.includes("already pending")) {
        setFriendshipStatuses((prev) => ({ ...prev, [userId]: "pending" }));
      }
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleAcceptFriendRequest = async (friendshipId: string) => {
    setProcessingIds((prev) => new Set(prev).add(friendshipId));

    try {
      await api.acceptFriendRequest(friendshipId);
      toast({
        title: "Success",
        description: "Friend request accepted",
      });
      // Reload to update status
      await searchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept friend request",
        variant: "destructive",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  const getActionButton = (user: User) => {
    const status = friendshipStatuses[user.id] || "none";
    const isProcessing = processingIds.has(user.id);

    if (status === "accepted") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/profile/${user.id}`)}
        >
          <UserIcon className="h-4 w-4 mr-2" />
          Lihat Profile
        </Button>
      );
    }

    if (status === "pending") {
      // Check if current user is the sender or receiver
      // For now, we'll show a pending state
      return (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Menunggu
        </Button>
      );
    }

    // If status is "rejected" or "none", show "Tambah Teman" button
    return (
      <Button
        size="sm"
        onClick={() => handleSendFriendRequest(user.id)}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Tambah Teman
          </>
        )}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Hasil Pencarian: {query}
          </h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {query
                  ? "Tidak ada hasil yang ditemukan"
                  : "Masukkan kata kunci untuk mencari"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={user.profile_photo}
                      alt={user.full_name}
                    />
                    <AvatarFallback>
                      {user.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user.full_name}
                    </h3>
                    {user.username && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{user.username}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getActionButton(user)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPeoplePage;
