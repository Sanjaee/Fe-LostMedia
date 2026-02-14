"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";

/** Custom event to trigger session refresh (e.g. when role is updated or payment succeeds) */
export const SESSION_REFRESH_ROLE_EVENT = "session:refresh-role";

/** Dispatch this event anywhere to refresh the session (updates role, etc.) - single hit, no polling */
export function dispatchSessionRefreshRole() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_REFRESH_ROLE_EVENT));
  }
}

const REFRESH_DEBOUNCE_MS = 3000;

export function SessionRefreshListener() {
  const { update } = useSession();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const handler = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < REFRESH_DEBOUNCE_MS) return;
      lastUpdateRef.current = now;
      update().catch(() => {});
    };
    window.addEventListener(SESSION_REFRESH_ROLE_EVENT, handler);
    return () => window.removeEventListener(SESSION_REFRESH_ROLE_EVENT, handler);
  }, [update]);

  return null;
}

/** Listens for WebSocket role_updated and payment_status success, triggers single session refresh. Must be inside WebSocketProvider. */
export function RoleUpdateWebSocketListener() {
  const lastRefreshRef = useRef<{ key: string; at: number } | null>(null);

  useWebSocketSubscription((data: Record<string, unknown>) => {
    const payload = (data.payload || data) as { type?: string; payment?: { status?: string; order_id?: string } };
    const type = payload.type || (data.type as string);
    const now = Date.now();
    if (type === "role_updated") {
      if (!lastRefreshRef.current || now - lastRefreshRef.current.at > REFRESH_DEBOUNCE_MS) {
        lastRefreshRef.current = { key: "role_updated", at: now };
        dispatchSessionRefreshRole();
      }
    }
    if (type === "payment_status" && payload.payment?.status === "success") {
      const orderId = payload.payment?.order_id || "unknown";
      const key = `pay_${orderId}`;
      if (lastRefreshRef.current?.key !== key || now - lastRefreshRef.current.at > REFRESH_DEBOUNCE_MS) {
        lastRefreshRef.current = { key, at: now };
        dispatchSessionRefreshRole();
      }
    }
  });
  return null;
}
