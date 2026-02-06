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
    console.log("ContactsList - Processing friends:", {
      currentUserId,
      friendsCount: friends?.length || 0,
      friends: friends
    });

    if (!currentUserId) {
      console.log("ContactsList - No current user ID");
      return [];
    }

    if (!friends || friends.length === 0) {
      console.log("ContactsList - No friends data");
      return [];
    }

    // Filter only accepted friendships with complete data
    const acceptedFriends = friends.filter((friendship) => {
      const isAccepted = friendship.status === "accepted";
      const hasData = friendship.sender && friendship.receiver;
      const result = isAccepted && hasData;
      
      if (!result) {
        console.log("ContactsList - Filtered out friendship:", {
          id: friendship.id,
          status: friendship.status,
          hasSender: !!friendship.sender,
          hasReceiver: !!friendship.receiver
        });
      }
      
      return result;
    });

    console.log("ContactsList - Accepted friends count:", acceptedFriends.length);

    // Extract unique friends (excluding current user)
    const friendsMap = new Map<string, { friendship: Friendship; friend: NonNullable<Friendship['sender']> }>();

    acceptedFriends.forEach((friendship) => {
      console.log("ContactsList - Processing friendship:", {
        id: friendship.id,
        sender_id: friendship.sender_id,
        receiver_id: friendship.receiver_id,
        currentUserId,
        sender_email: (friendship.sender as any)?.email,
        receiver_email: (friendship.receiver as any)?.email,
        currentUserEmail
      });

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
          console.log("ContactsList - Matched by email: current user is sender");
        } else if (receiverEmail && String(receiverEmail).toLowerCase() === String(currentUserEmail).toLowerCase()) {
          isCurrentUserReceiver = true;
          console.log("ContactsList - Matched by email: current user is receiver");
        }
      }
      
      if (isCurrentUserSender) {
        friend = friendship.receiver;
        console.log("ContactsList - Current user is sender, friend is receiver:", friend);
      } else if (isCurrentUserReceiver) {
        friend = friendship.sender;
        console.log("ContactsList - Current user is receiver, friend is sender:", friend);
      } else {
        // If current user is neither sender nor receiver, skip this friendship
        console.log("ContactsList - Current user is neither sender nor receiver (ID and email don't match), skipping");
        return;
      }

      // Skip if no friend data, if friend is the current user, or if already added
      if (!friend || !friend.id) {
        console.log("ContactsList - No friend data or friend.id");
        return;
      }

      if (String(friend.id) === String(currentUserId)) {
        console.log("ContactsList - Friend is current user, skipping");
        return;
      }

      // Skip if already in map (avoid duplicates)
      if (friendsMap.has(String(friend.id))) {
        console.log("ContactsList - Friend already in map, skipping");
        return;
      }

      // Add to map to ensure uniqueness
      console.log("ContactsList - Adding friend to map:", friend.id, friend.full_name);
      friendsMap.set(String(friend.id), { friendship, friend });
    });

    const result = Array.from(friendsMap.values());
    console.log("ContactsList - Final processed friends count:", result.length, result);
    return result;
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
