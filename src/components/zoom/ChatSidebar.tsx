"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ZoomChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

interface ChatSidebarProps {
  roomId: string;
  userId: string;
  isOpen: boolean;
}

export default function ChatSidebar({ roomId, userId, isOpen }: ChatSidebarProps) {
  const { data: session } = useSession();
  const ctx = useWebSocketContext();
  const [messages, setMessages] = useState<ZoomChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const userDisplayName = session?.user?.name || (session?.user as any)?.username || "You";

  useEffect(() => {
    if (!ctx || !roomId || !isOpen) return;
    const unsub = ctx.subscribe((data: any) => {
      const rid = data?.room_id ?? data?.RoomID;
      if (rid !== roomId) return;
      if (data?.type === "message" || data?.Type === "message") {
        const payload = data?.payload ?? data?.Payload ?? {};
        const msg: ZoomChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          room_id: roomId,
          user_id: data?.user_id ?? data?.UserID ?? "",
          user_name: payload?.user_name ?? payload?.User_name ?? "User",
          content: payload?.content ?? payload?.Content ?? "",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, msg]);
      }
    });
    return unsub;
  }, [ctx, roomId, isOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || !ctx) return;
    ctx.send({
      room_id: roomId,
      user_id: userId,
      type: "message",
      payload: { content, user_name: userDisplayName },
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        room_id: roomId,
        user_id: userId,
        user_name: userDisplayName,
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide min-h-0" ref={scrollRef}>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">Belum ada pesan</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`text-sm ${m.user_id === userId ? "text-right" : "text-left"}`}
              >
                <span className="text-gray-400 text-xs block mb-0.5">
                  {m.user_id === userId ? "Anda" : m.user_name || m.user_id}
                </span>
                <div
                  className={`inline-block px-3 py-2 rounded-lg max-w-[85%] ${
                    m.user_id === userId
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="p-2 border-t border-gray-700 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ketik pesan..."
          className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
        />
        <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
          Kirim
        </Button>
      </div>
    </div>
  );
}
