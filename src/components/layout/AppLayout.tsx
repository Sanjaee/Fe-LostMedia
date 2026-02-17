"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactsList } from "@/components/general/ContactsList";
import { OnlineUsers } from "@/components/general/OnlineUsers";
import type { Friendship } from "@/types/friendship";

interface ChatUser {
  id: string;
  full_name: string;
  username?: string;
  profile_photo?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  friends?: Friendship[];
  loadingFriends?: boolean;
  showCreatePost?: boolean;
  onCreatePostClick?: () => void;
  onChatClick?: (user: ChatUser) => void;
  chatUnreadRefreshTrigger?: number; // bump when chat dialog closes to refresh per-contact unread counts
  /** Sembunyikan sidebar kanan (Disponsori, Kontak) - untuk halaman reels */
  hideRightSidebar?: boolean;
  /** Fullscreen tanpa grid - untuk halaman reels agar video tidak tertutup */
  fullScreen?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  friends = [],
  loadingFriends = false,
  showCreatePost = false,
  onCreatePostClick,
  onChatClick,
  chatUnreadRefreshTrigger = 0,
  hideRightSidebar = false,
  fullScreen = false,
}) => {
  const { data: session } = useSession();
  const [contactsModalOpen, setContactsModalOpen] = useState(false);

  const handleChatClick = (user: ChatUser) => {
    onChatClick?.(user);
    setContactsModalOpen(false);
  };

  if (fullScreen) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Navigation + Online Users */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <div className="sticky top-20 space-y-4">
              {/* Navigation */}
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start text-lg font-medium" asChild>
                  <Link href="/">
                    <div className="mr-3 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                      </svg>
                    </div>
                    Beranda
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start text-lg font-medium" asChild>
                  <Link href="/groups">
                    <div className="mr-3 h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                      </svg>
                    </div>
                    Grup
                  </Link>
                </Button>
              </div>

              {/* Online Users */}
              {session && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-zinc-500 font-semibold text-sm mb-2 px-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                      Sedang Online
                    </h3>
                    <OnlineUsers />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            {children}
          </div>

          {/* Right Sidebar - Contacts/Sponsored (sembunyikan untuk reels) */}
          {!hideRightSidebar && (
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <div className="sticky top-20">
              <div className="mb-4">
                <h3 className="text-zinc-500 font-semibold mb-2 px-2">Disponsori</h3>
                {/* Ads placeholder */}
                <div className="flex items-center gap-3 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                  <div className="w-24 h-24 bg-zinc-300 rounded-lg shrink-0"></div>
                  <div>
                    <div className="font-semibold text-sm">Iklan Menarik</div>
                    <div className="text-xs text-zinc-500">website.com</div>
                  </div>
                </div>
              </div>
              <Separator className="my-2" />
              <div>
                <div
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => friends.length > 0 && setContactsModalOpen(true)}
                  onKeyDown={(e) => e.key === "Enter" && friends.length > 0 && setContactsModalOpen(true)}
                  role="button"
                  tabIndex={0}
                >
                  <h3 className="text-zinc-500 font-semibold mb-2 px-2">Kontak</h3>
                  {process.env.NODE_ENV === "development" && (
                    <div className="text-xs text-zinc-400 mb-2 px-2">
                      Friends count: {friends.length} | Loading: {loadingFriends ? "Yes" : "No"}
                    </div>
                  )}
                </div>
                <ContactsList friends={friends} loading={loadingFriends} onChatClick={handleChatClick} refreshUnreadTrigger={chatUnreadRefreshTrigger} />
                <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Pilih Kontak untuk Chat</DialogTitle>
                    </DialogHeader>
                    <ContactsList friends={friends} loading={loadingFriends} onChatClick={handleChatClick} refreshUnreadTrigger={chatUnreadRefreshTrigger} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
};
