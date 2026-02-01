"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, User as UserIcon } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Refresh friendship statuses when friendship status changes (e.g., after accepting from notification)
  useEffect(() => {
    if (users.length === 0) return;

    const refreshStatuses = async (retryCount = 0) => {
      // Refresh status directly from DB (no message broker needed)
      // Small delay only on retry to ensure DB transaction is committed
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
      }

      if (users.length === 0) {
        console.log("[refreshStatuses] No users to refresh");
        return;
      }

      console.log(`[refreshStatuses] Refreshing statuses for ${users.length} users (retry: ${retryCount})`);

      const statusPromises = users.map(async (user: User) => {
        try {
          // Get status directly from DB via API (bypasses cache)
          const statusResponse = await api.getFriendshipStatus(user.id);
          const status = statusResponse.data?.status || "none";
          const finalStatus = status === "rejected" ? "none" : status;
          
          console.log(`[refreshStatuses] User ${user.id} (${user.full_name}): status="${status}" -> "${finalStatus}"`);
          
          return { 
            userId: user.id, 
            status: finalStatus
          };
        } catch (error) {
          console.error(`[refreshStatuses] Failed to get status for user ${user.id}:`, error);
          return { userId: user.id, status: "none" };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap: Record<string, string> = {};
      statuses.forEach((item: { userId: string; status: string }) => {
        statusMap[item.userId] = item.status;
      });
      
      console.log(`[refreshStatuses] Final status map:`, statusMap);
      console.log(`[refreshStatuses] Setting friendshipStatuses state...`);
      setFriendshipStatuses(statusMap);
      console.log(`[refreshStatuses] State updated, component should re-render`);
    };

    const handleFriendshipStatusChanged = async () => {
      console.log("[handleFriendshipStatusChanged] Event received, refreshing statuses from DB");
      // Refresh status directly from DB (no need to wait for message broker)
      // Small delay to ensure DB transaction is committed
      await new Promise(resolve => setTimeout(resolve, 300));
      // Refresh with retry to ensure we get fresh data
      await refreshStatuses(1); // Retry once with delay to ensure DB is updated
    };

    // Initial load
    refreshStatuses();

    // Listen for custom event when friendship status changes
    window.addEventListener('friendshipStatusChanged', handleFriendshipStatusChanged);
    
    // Also refresh when window gains focus (e.g., user switches back to tab)
    const handleFocus = () => {
      console.log("[handleFocus] Window gained focus, refreshing statuses");
      refreshStatuses();
    };
    window.addEventListener('focus', handleFocus);
    
    // Also refresh on visibility change (tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("[handleVisibilityChange] Tab became visible, refreshing statuses");
        refreshStatuses();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('friendshipStatusChanged', handleFriendshipStatusChanged);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [users, api]);

  const searchUsers = async () => {
    if (!query.trim()) {
      setUsers([]);
      setFriendshipStatuses({});
      return;
    }

    try {
      setLoading(true);
      const response = await api.searchUsers(query, 50, 0);
      // Response structure after unwrap: {users: [...], limit: 50, offset: 0, total: 1}
      // or wrapped: {data: {users: [...], limit: 50, offset: 0, total: 1}}
      const usersList = (response as any).users || response.data?.users || [];
      setUsers(usersList);

      // Load friendship statuses directly from DB (no message broker needed)
      const loadStatuses = async (): Promise<void> => {
        console.log(`[searchUsers] Loading statuses for ${usersList.length} users from DB`);
        
        const statusPromises = usersList.map(async (user: User) => {
          try {
            // Get status directly from DB via API
            const statusResponse = await api.getFriendshipStatus(user.id);
            const status = statusResponse.data?.status || "none";
            const finalStatus = status === "rejected" ? "none" : status;
            
            console.log(`[searchUsers] User ${user.id} (${user.full_name}): status="${status}" -> "${finalStatus}"`);
            
            return { 
              userId: user.id, 
              status: finalStatus
            };
          } catch (error) {
            console.error(`[searchUsers] Failed to get status for user ${user.id}:`, error);
            return { userId: user.id, status: "none" };
          }
        });

        const statuses = await Promise.all(statusPromises);
        const statusMap: Record<string, string> = {};
        statuses.forEach((item: { userId: string; status: string }) => {
          statusMap[item.userId] = item.status;
        });
        
        console.log(`[searchUsers] Final status map:`, statusMap);
        setFriendshipStatuses(statusMap);
      };

      await loadStatuses();
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
      const errorMessage = error.message || "";
      
      // Handle "already friends" error - refresh status to show correct button
      if (errorMessage.includes("already friends")) {
        // If backend says "already friends", status must be "accepted"
        // Set status immediately to "accepted" for instant UI update
        setFriendshipStatuses((prev) => {
          const updated = { ...prev, [userId]: "accepted" };
          console.log("Setting status to 'accepted' for user:", userId, "Full map:", updated);
          return updated;
        });
        
        toast({
          title: "Info",
          description: "Anda sudah berteman dengan user ini",
        });
        
        // Also verify with backend directly from DB (async, non-blocking)
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          const statusResponse = await api.getFriendshipStatus(userId);
          const actualStatus = statusResponse.data?.status || "accepted";
          
          console.log(`[handleSendFriendRequest] Verified status from DB for ${userId}: "${actualStatus}"`);
          
          // Update again with backend response to ensure accuracy
          if (actualStatus === "accepted") {
            setFriendshipStatuses((prev) => ({ ...prev, [userId]: "accepted" }));
          }
        } catch (statusError) {
          console.error(`[handleSendFriendRequest] Failed to verify status from DB for ${userId}:`, statusError);
          // Keep the "accepted" status we set earlier
        }
      } else if (errorMessage.includes("already pending")) {
        // Update status to pending if request is already pending
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

    // Debug: Log status for troubleshooting (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(`[getActionButton] User ${user.id} (${user.full_name}): status="${status}", isProcessing=${isProcessing}`);
      console.log(`[getActionButton] Full friendshipStatuses:`, friendshipStatuses);
    }

    // Force re-render check: if status is "accepted", show "Lihat Profile"
    if (status === "accepted") {
      console.log(`[getActionButton] Rendering "Lihat Profile" button for user ${user.id}`);
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
