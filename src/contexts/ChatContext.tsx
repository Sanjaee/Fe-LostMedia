"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ChatDialog } from "@/components/chat/ChatDialog";

export interface ChatUser {
  id: string;
  full_name: string;
  username?: string;
  profile_photo?: string;
}

interface ChatContextType {
  openChat: (user: ChatUser) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<ChatUser | null>(null);

  const openChat = useCallback((user: ChatUser) => {
    setSelectedChatUser(user);
    setChatDialogOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setChatDialogOpen(false);
    setSelectedChatUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("chat-closed"));
    }
  }, []);

  const value: ChatContextType = { openChat, closeChat };

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ChatDialog
        open={chatDialogOpen}
        onClose={closeChat}
        user={selectedChatUser}
      />
    </ChatContext.Provider>
  );
}
