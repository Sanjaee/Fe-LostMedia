"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { Input } from "@/components/ui/input";
import { useApi } from "@/components/contex/ApiProvider";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { ChatMessage } from "@/types/chat";

interface ChatUser {
  id: string;
  full_name: string;
  username?: string;
  profile_photo?: string;
  user_type?: string;
  role?: string;
}

interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
  user: ChatUser | null;
}

export function ChatDialog({ open, onClose, user }: ChatDialogProps) {
  const { data: session } = useSession();
  const { api } = useApi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentUserId = session?.user?.id;

  const loadMessages = useCallback(async () => {
    if (!user || !currentUserId) return;
    setLoading(true);
    try {
      const res = await api.getChatConversation(user.id);
      setMessages(res.messages || []);
    } catch (err) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentUserId, api]);

  useEffect(() => {
    if (open && user) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [open, user?.id, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useWebSocketSubscription((data: any) => {
    const payload = data.type === "chat_message" ? data.payload : (data.type === "notification" && data.payload?.type === "chat_message" ? data.payload.payload : null);
    if (payload && user && payload.receiver_id === currentUserId && payload.sender_id === user.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload as ChatMessage];
      });
    }
  });

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !user || !currentUserId || sending) return;

    setSending(true);
    setInputValue("");
    try {
      const res = await api.sendChatMessage(user.id, content);
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch {
      setInputValue(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex flex-col max-w-md h-[80vh] p-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3 text-base">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile_photo || ""} />
              <AvatarFallback>
                {user.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">
                <UserNameWithRole
                  displayName={user.username || user.full_name || "User"}
                  role={user.user_type ?? user.role}
                  className="truncate inline-block max-w-full"
                />
              </div>
              {user.username && (
                <div className="text-xs text-zinc-500 font-normal">@{user.username}</div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Belum ada pesan. Mulai obrolan!
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? "text-blue-100" : "text-zinc-500"
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t shrink-0 flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
