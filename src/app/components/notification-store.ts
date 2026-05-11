import { useEffect, useState } from "react";
import { apiFetch } from "../lib/supabase";

export type NotifType = "announcement" | "approved" | "revision" | "deadline" | "grade" | "feedback";

export interface Notification {
  id: number;
  type: NotifType;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

type Listener = (n: Notification[]) => void;

const listeners = new Set<Listener>();
let cachedNotifs: Notification[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isFetching = false;

export async function fetchNotifications() {
  if (isFetching) return cachedNotifs;
  isFetching = true;
  try {
    const { notifications } = await apiFetch<{ notifications: Notification[] }>("/notifications");
    cachedNotifs = notifications || [];
    listeners.forEach((listener) => listener(cachedNotifs));
    return cachedNotifs;
  } catch {
    return cachedNotifs;
  } finally {
    isFetching = false;
  }
}

function startPolling() {
  if (pollTimer) return;
  fetchNotifications();
  pollTimer = setInterval(fetchNotifications, 45000);
}

function stopPollingIfIdle() {
  if (listeners.size === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener);
  startPolling();
  listener(cachedNotifs);
  return () => {
    listeners.delete(listener);
    stopPollingIfIdle();
  };
}

export function updateCachedNotifications(next: Notification[]) {
  cachedNotifs = next;
  listeners.forEach((listener) => listener(cachedNotifs));
}

export function getCachedNotifications() {
  return cachedNotifs;
}

export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    return subscribeNotifications((notifs) => {
      setCount(notifs.filter((notif) => !notif.read).length);
    });
  }, []);

  return count;
}
