"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Friendship } from "@/types/friendship";

interface ContactsListProps {
  friends: Friendship[];
  loading?: boolean;
}

export const ContactsList: React.FC<ContactsListProps> = ({ friends, loading = false }) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserEmail = session?.user?.email;

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
      {processedFriends.map(({ friendship, friend }) => (
        <Link
          key={friendship.id}
          href={`/profile/${friend.id}`}
          className="flex items-center gap-3 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
        >
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage src={friend.profile_photo || ''} />
              <AvatarFallback>{getInitials(friend.full_name)}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
          </div>
          <div className="font-medium text-sm truncate">
            {friend.full_name || friend.username || 'Unknown'}
          </div>
        </Link>
      ))}
    </div>
  );
};
