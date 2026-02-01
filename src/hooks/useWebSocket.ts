"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!session?.accessToken || !url) {
      console.log("WebSocket: Missing token or URL", { hasToken: !!session?.accessToken, url });
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      // Construct WebSocket URL with token
      let wsUrlString: string;
      if (url.startsWith("ws://") || url.startsWith("wss://")) {
        const wsUrl = new URL(url);
        wsUrl.searchParams.set("token", session.accessToken);
        wsUrlString = wsUrl.toString();
      } else {
        // If it's a relative path, construct full URL
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const host = apiUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
        wsUrlString = `${protocol}//${host}${url.startsWith("/") ? url : "/" + url}?token=${encodeURIComponent(session.accessToken)}`;
      }
      
      console.log("WebSocket: Connecting to", wsUrlString.replace(/token=[^&]+/, "token=***"));
      const ws = new WebSocket(wsUrlString);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;
        options.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onMessage?.(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        options.onError?.(error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        options.onClose?.();

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [session?.accessToken, url]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { isConnected, send };
}
