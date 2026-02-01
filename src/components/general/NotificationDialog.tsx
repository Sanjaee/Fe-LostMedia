"use client";

import React, { useEffect, useState } from "react";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, UserPlus, Check, X, Loader2, User as UserIcon } from "lucide-react";
import { useRouter } from "next/router";
import type { Notification } from "@/types/notification";
import type { Friendship } from "@/types/friendship";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { useWebSocket } from "@/hooks/useWebSocket";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationDialog: React.FC<NotificationDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { api } = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});

  // WebSocket connection for realtime notifications
  const wsUrl =
    typeof window !== "undefined"
      ? `${process.env.NEXT_PUBLIC_WS_URL || "wss://lostmedia.zacloth.com"}/ws`
      : "";

  const { isConnected } = useWebSocket(wsUrl, {
    onMessage: (data: Notification) => {
      // Add new notification to the list
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
      // Show toast notification
      toast({
        title: "Notifikasi Baru",
        description: data.content,
      });
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
    },
  });

  useEffect(() => {
    if (open) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [open]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.getNotifications(50, 0);
      const notifs = response.notifications ||
        response.data?.notifications ||
        [];
      setNotifications(notifs);

      // Load friendship statuses for friend_request notifications
      const friendRequestNotifs = notifs.filter(n => n.type === "friend_request");
      if (friendRequestNotifs.length > 0) {
        const statusPromises = friendRequestNotifs.map(async (notif: Notification) => {
          try {
            // Get sender ID from notification
            const senderId = notif.sender_id || (notif.sender?.id);
            if (!senderId) return null;

            const statusResponse = await api.getFriendshipStatus(senderId);
            const status = statusResponse.data?.status || "none";
            return {
              notificationId: notif.id,
              senderId: senderId,
              status: status
            };
          } catch {
            return null;
          }
        });

        const statuses = await Promise.all(statusPromises);
        const statusMap: Record<string, string> = {};
        statuses.forEach((item) => {
          if (item) {
            statusMap[item.notificationId] = item.status;
          }
        });
        setFriendshipStatuses(statusMap);
      }
    } catch (error: any) {
      console.error("Failed to load notifications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await api.getUnreadCount();
      setUnreadCount(response.count || response.data?.count || 0);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  const handleAcceptFriendRequest = async (
    notification: Notification,
    friendshipId?: string
  ) => {
    // Try to get friendship ID from target_id, or parse from data
    let id = friendshipId || notification.target_id;
    
    // If not found, try to parse from data field (for backward compatibility)
    if (!id && (notification as any).data) {
      try {
        const data = typeof (notification as any).data === 'string' 
          ? JSON.parse((notification as any).data) 
          : (notification as any).data;
        id = data?.friendship_id || data?.target_id;
      } catch {
        // Ignore parse errors
      }
    }

    if (!id) {
      toast({
        title: "Error",
        description: "Friendship ID not found",
        variant: "destructive",
      });
      return;
    }
    setProcessingIds((prev) => new Set(prev).add(id));

    try {
      await api.acceptFriendRequest(id);
      toast({
        title: "Success",
        description: "Friend request accepted",
      });
      
      // Update friendship status immediately for UI responsiveness
      const senderId = notification.sender_id || notification.sender?.id;
      if (senderId) {
        // Update status immediately (optimistic update)
        setFriendshipStatuses((prev) => ({
          ...prev,
          [notification.id]: "accepted"
        }));
      }
      
      // Only reload notifications after successful action
      // This will update the list and reload friendship statuses
      await loadNotifications();
      await loadUnreadCount();
      
      // Verify status from backend after reload to ensure accuracy
      if (senderId) {
        try {
          const statusResponse = await api.getFriendshipStatus(senderId);
          const actualStatus = statusResponse.data?.status || "none";
          setFriendshipStatuses((prev) => ({
            ...prev,
            [notification.id]: actualStatus
          }));
        } catch {
          // Keep the optimistic update if backend check fails
        }
      }
      
      // Trigger custom event to refresh other pages (e.g., search page)
      window.dispatchEvent(new CustomEvent('friendshipStatusChanged'));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept friend request",
        variant: "destructive",
      });
      // Don't remove notification on error - keep it visible
      // Reload to ensure we have the latest state
      await loadNotifications();
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRejectFriendRequest = async (
    notification: Notification,
    friendshipId?: string
  ) => {
    // Try to get friendship ID from target_id, or parse from data
    let id = friendshipId || notification.target_id;
    
    // If not found, try to parse from data field (for backward compatibility)
    if (!id && (notification as any).data) {
      try {
        const data = typeof (notification as any).data === 'string' 
          ? JSON.parse((notification as any).data) 
          : (notification as any).data;
        id = data?.friendship_id || data?.target_id;
      } catch {
        // Ignore parse errors
      }
    }

    if (!id) {
      toast({
        title: "Error",
        description: "Friendship ID not found",
        variant: "destructive",
      });
      return;
    }
    setProcessingIds((prev) => new Set(prev).add(id));

    try {
      await api.rejectFriendRequest(id);
      toast({
        title: "Berhasil",
        description: "Permintaan pertemanan ditolak",
      });
      // Update friendship status for rejected request
      const senderId = notification.sender_id || notification.sender?.id;
      if (senderId) {
        // Remove from friendship statuses (rejected = none, can send again)
        setFriendshipStatuses((prev) => {
          const next = { ...prev };
          delete next[notification.id];
          return next;
        });
      }
      // Only reload notifications after successful action
      // This will update the list and remove the rejected notification
      await loadNotifications();
      await loadUnreadCount();
      // Trigger custom event to refresh other pages (e.g., search page)
      window.dispatchEvent(new CustomEvent('friendshipStatusChanged'));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject friend request",
        variant: "destructive",
      });
      // Don't remove notification on error - keep it visible
      // Reload to ensure we have the latest state
      await loadNotifications();
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "friend_accepted":
        return <Check className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationAction = (notification: Notification) => {
    // Show action buttons for friend_request notifications (regardless of read status)
    if (notification.type === "friend_request") {
      // Get friendship ID from target_id or parse from data
      let friendshipId = notification.target_id;
      
      // Fallback: parse from data if target_id not available
      if (!friendshipId && (notification as any).data) {
        try {
          const data = typeof (notification as any).data === 'string' 
            ? JSON.parse((notification as any).data) 
            : (notification as any).data;
          friendshipId = data?.friendship_id || data?.target_id;
        } catch {
          // Ignore parse errors
        }
      }
      
      // If no friendship ID found, don't show buttons
      if (!friendshipId) {
        return null;
      }

      // Check friendship status for this notification
      const senderId = notification.sender_id || (notification.sender?.id);
      const friendshipStatus = friendshipStatuses[notification.id];
      
      // If friendship is already accepted, show "Lihat Profile" button
      if (friendshipStatus === "accepted" && senderId) {
        return (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/profile/${senderId}`);
                onOpenChange(false);
              }}
              className="h-8"
            >
              <UserIcon className="h-4 w-4 mr-1" />
              Lihat Profile
            </Button>
          </div>
        );
      }
      
      const isProcessing = processingIds.has(friendshipId);

      // Show accept/reject buttons if status is pending or not yet checked
      return (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // Prevent marking as read when clicking button
              handleAcceptFriendRequest(notification, friendshipId);
            }}
            disabled={isProcessing}
            className="h-8"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Terima
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation(); // Prevent marking as read when clicking button
              handleRejectFriendRequest(notification, friendshipId);
            }}
            disabled={isProcessing}
            className="h-8"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Tolak
              </>
            )}
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Notifikasi</span>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="h-[500px] overflow-y-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    !notification.is_read
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={(e) => {
                    // Only mark as read if clicking on the notification itself, not on buttons
                    if (!notification.is_read && (e.target as HTMLElement).closest('button') === null) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {notification.sender ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={notification.sender.profile_photo}
                            alt={notification.sender.full_name}
                          />
                          <AvatarFallback>
                            {notification.sender.full_name
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {notification.message || notification.content || notification.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                                locale: id,
                              }
                            )}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      {getNotificationAction(notification)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
