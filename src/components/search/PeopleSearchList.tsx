"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, Check } from "lucide-react";
import type { User } from "@/types/user";

interface PeopleSearchListProps {
  keyword: string;
  limit?: number;
  onCountChange?: (count: number) => void;
}

export const PeopleSearchList: React.FC<PeopleSearchListProps> = ({ 
  keyword, 
  limit = 3,
  onCountChange
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (keyword?.trim()) {
      searchUsers();
    } else {
      setUsers([]);
      setFriendshipStatuses({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Refresh friendship statuses when friendship status changes
  useEffect(() => {
    if (users.length === 0) return;

    const refreshStatuses = async () => {
      const statusPromises = users.map(async (user: User) => {
        try {
          const statusResponse = await api.getFriendshipStatus(user.id) as any;
          const status = statusResponse?.status || statusResponse?.data?.status || "none";
          const finalStatus = status === "rejected" ? "none" : status;
          
          return { userId: user.id, status: finalStatus };
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

    refreshStatuses();

    const handleFriendshipStatusChanged = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await refreshStatuses();
    };

    window.addEventListener('friendshipStatusChanged', handleFriendshipStatusChanged);
    
    return () => {
      window.removeEventListener('friendshipStatusChanged', handleFriendshipStatusChanged);
    };
  }, [users, api]);

  const searchUsers = async () => {
    if (!keyword?.trim()) {
      setUsers([]);
      setFriendshipStatuses({});
      if (onCountChange) {
        onCountChange(0);
      }
      return;
    }

    try {
      setLoading(true);
      const response = await api.searchUsers(keyword, limit, 0);
      const usersList = (response as any).users || response.data?.users || [];
      
      // Filter out current user from search results
      const currentUserId = session?.user?.id;
      const filteredUsers = currentUserId 
        ? usersList.filter((user: User) => user.id !== currentUserId).slice(0, limit)
        : usersList.slice(0, limit);
      
      setUsers(filteredUsers);
      
      // Notify parent of count change
      if (onCountChange) {
        onCountChange(filteredUsers.length);
      }

      // Load friendship statuses
      const loadStatuses = async (): Promise<void> => {
        const statusPromises = filteredUsers.map(async (user: User) => {
          try {
            const statusResponse = await api.getFriendshipStatus(user.id) as any;
            const status = statusResponse?.status || statusResponse?.data?.status || "none";
            const finalStatus = status === "rejected" ? "none" : status;
            
            return { userId: user.id, status: finalStatus };
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

      await loadStatuses();
    } catch (error: any) {
      console.error("Failed to search users:", error);
      if (onCountChange) {
        onCountChange(0);
      }
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
      setFriendshipStatuses((prev) => ({ ...prev, [userId]: "pending" }));
    } catch (error: any) {
      const errorMessage = error.message || "";
      
      if (errorMessage.includes("already friends")) {
        try {
          const statusResponse = await api.getFriendshipStatus(userId) as any;
          const actualStatus = statusResponse?.status || statusResponse?.data?.status || "accepted";
          setFriendshipStatuses((prev) => ({ ...prev, [userId]: actualStatus }));
          toast({
            title: "Info",
            description: "Anda sudah berteman dengan user ini",
          });
        } catch {
          setFriendshipStatuses((prev) => ({ ...prev, [userId]: "accepted" }));
        }
      } else if (errorMessage.includes("already pending") || errorMessage.includes("friend request already pending")) {
        setFriendshipStatuses((prev) => ({ ...prev, [userId]: "pending" }));
        toast({
          title: "Info",
          description: "Permintaan pertemanan sudah terkirim",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to send friend request",
          variant: "destructive",
        });
      }
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
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
          className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
        >
          <Check className="h-4 w-4" />
          Berteman
        </Button>
      );
    }

    if (status === "pending") {
      return (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Menunggu
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        onClick={() => handleSendFriendRequest(user.id)}
        disabled={isProcessing || status === "pending"}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!keyword?.trim()) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Masukkan kata kunci untuk mencari people
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Tidak ada people yang ditemukan
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <Link 
            href={`/profile/${user.id}`} 
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile_photo} alt={user.full_name} />
              <AvatarFallback>
                {user.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white hover:underline truncate">
                {user.full_name}
              </h3>
              {user.username && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{user.username}
                </p>
              )}
            </div>
          </Link>
          <div 
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {getActionButton(user)}
          </div>
        </div>
      ))}
    </div>
  );
};
