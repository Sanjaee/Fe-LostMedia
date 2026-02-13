"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { UserPlus, Check } from "lucide-react";
import { PeopleSkeletonList } from "./PeopleSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types/user";

interface PeopleSearchListProps {
  keyword: string;
  limit?: number;
  onCountChange?: (count: number) => void;
}

export const PeopleSearchList: React.FC<PeopleSearchListProps> = ({ 
  keyword, 
  limit = 10,
  onCountChange
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (keyword?.trim()) {
      // Reset when keyword changes
      setUsers([]);
      setOffset(0);
      setHasMore(false);
      searchUsers(true);
    } else {
      setUsers([]);
      setFriendshipStatuses({});
      setOffset(0);
      setHasMore(false);
      if (onCountChange) {
        onCountChange(0);
      }
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

  const searchUsers = async (reset: boolean = false) => {
    if (!keyword?.trim()) {
      setUsers([]);
      setFriendshipStatuses({});
      if (onCountChange) {
        onCountChange(0);
      }
      return;
    }

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentOffset = reset ? 0 : offset;
      const response = await api.searchUsers(keyword, limit, currentOffset);
      const usersList = (response as any).users || response.data?.users || [];
      
      // Filter out current user from search results
      const currentUserId = session?.user?.id;
      const filteredUsers = currentUserId 
        ? usersList.filter((user: User) => user.id !== currentUserId)
        : usersList;
      
      // Check if there are more results
      setHasMore(filteredUsers.length >= limit);
      
      // Update users list
      if (reset) {
        setUsers(filteredUsers);
        setOffset(filteredUsers.length);
      } else {
        setUsers(prev => [...prev, ...filteredUsers]);
        setOffset(prev => prev + filteredUsers.length);
      }
      
      // Notify parent of total count change (total users displayed)
      if (onCountChange) {
        const totalCount = reset ? filteredUsers.length : users.length + filteredUsers.length;
        onCountChange(totalCount);
      }

      // Load friendship statuses for new users
      const loadStatuses = async (usersToLoad: User[]): Promise<void> => {
        const statusPromises = usersToLoad.map(async (user: User) => {
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
        
        setFriendshipStatuses(prev => ({ ...prev, ...statusMap }));
      };

      await loadStatuses(filteredUsers);
    } catch (error: any) {
      console.error("Failed to search users:", error);
      if (onCountChange && reset) {
        onCountChange(0);
      }
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      searchUsers(false);
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
          onClick={() => router.push(`/profile/${user.username || user.id}`)}
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
          <Skeleton className="h-4 w-4 mr-2 shrink-0" />
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
          <Skeleton className="h-4 w-4 mr-2 shrink-0" />
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
    return <PeopleSkeletonList count={5} />;
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
    <div className="space-y-2 md:space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <Link 
            href={`/profile/${user.username || user.id}`} 
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={user.profile_photo} alt={user.full_name} />
              <AvatarFallback>
                {user.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white hover:underline truncate">
                <UserNameWithRole
                  displayName={user.username || user.full_name}
                  role={user.user_type ?? (user as any).role}
                  className="truncate inline-block max-w-full"
                />
              </h3>
              {user.username && user.full_name !== user.username && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{user.username}
                </p>
              )}
            </div>
          </Link>
          <div 
            className="shrink-0 flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {getActionButton(user)}
          </div>
        </div>
      ))}
      
      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full"
          >
            {loadingMore ? (
              <>
                <Skeleton className="h-4 w-4 mr-2 shrink-0" />
                Memuat...
              </>
            ) : (
              "Muat Lebih Banyak"
            )}
          </Button>
        </div>
      )}
      
      {!hasMore && users.length > 0 && (
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          Semua hasil telah dimuat
        </div>
      )}
    </div>
  );
};
