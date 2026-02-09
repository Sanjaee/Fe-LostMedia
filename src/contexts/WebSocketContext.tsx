"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

type MessageHandler = (data: any) => void;

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (handler: MessageHandler) => () => void;
  send: (data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl) return wsUrl.endsWith("/ws") ? wsUrl : `${wsUrl.replace(/\/$/, "")}/ws`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const host = apiUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${host}/ws`;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    const wsBaseUrl = getWsUrl();
    if (!session?.accessToken || !wsBaseUrl) return;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      try {
        const wsUrl = new URL(wsBaseUrl);
        wsUrl.searchParams.set("token", session!.accessToken!);
        const ws = new WebSocket(wsUrl.toString());
        ws.onopen = () => {
          setIsConnected(true);
          reconnectAttempts.current = 0;
        };
        ws.onmessage = (event) => {
          // Backend writePump may batch multiple JSON objects separated by newlines
          // into a single WebSocket frame. Split and parse each one individually.
          const rawMessages = (event.data as string).split("\n");
          for (const raw of rawMessages) {
            if (!raw.trim()) continue;
            try {
              const data = JSON.parse(raw);
              handlersRef.current.forEach((handler) => handler(data));
            } catch {
              // ignore malformed message
            }
          }
        };
        ws.onerror = () => setIsConnected(false);
        ws.onclose = () => {
          setIsConnected(false);
          if (session?.accessToken && reconnectAttempts.current < 5) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          } else {
            reconnectAttempts.current = 0;
          }
        };
        wsRef.current = ws;
      } catch {
        // ignore
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [session?.accessToken]);

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, send }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) return null;
  return ctx;
}

export function useWebSocketSubscription(onMessage: (data: any) => void) {
  const ctx = useWebSocketContext();
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe((data) => onMessageRef.current(data));
  }, [ctx]);
}
