"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  FileText,
  Truck,
  Building2,
  UserPlus,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  Clock,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Badge
} from "@medsync/ui";
import api from "@/lib/api";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getTypeIcon(type: string) {
  const t = (type || "").toUpperCase();
  if (t === "APPOINTMENT") {
    return { icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" };
  }
  if (t === "RECORD") {
    return { icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
  }
  if (t === "DELIVERY") {
    return { icon: Truck, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" };
  }
  if (t === "FACILITY") {
    return { icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" };
  }
  if (t === "REFERRAL") {
    return { icon: UserPlus, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20" };
  }
  if (t === "ALERT" || t === "WARNING") {
    return { icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" };
  }
  return { icon: Info, color: "text-primary", bg: "bg-primary/10 border-primary/20" };
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/notifications?limit=30&_t=${Date.now()}`);
      if (res.data && Array.isArray(res.data.data)) {
        setNotifications((prev) => {
          // Deduplicate strictly by ID
          const existingMap = new Map<string, NotificationItem>();
          // Insert new ones first
          res.data.data.forEach((item: NotificationItem) => {
            if (item && item.id) existingMap.set(item.id, item);
          });
          // Preserve any not returned but existing
          prev.forEach((item) => {
            if (item && item.id && !existingMap.has(item.id)) {
              existingMap.set(item.id, item);
            }
          });
          const merged = Array.from(existingMap.values());
          merged.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          return merged;
        });
      }
    } catch (err) {
      // Silently handle error if unauthenticated or network failure
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // 25s polling interval
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await api.post(`/api/v1/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await api.post(`/api/v1/notifications/read-all`);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await api.delete(`/api/v1/notifications/${id}`);
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open notifications"
          className="relative h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background animate-in fade-in zoom-in duration-200">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="right"
        className="w-[360px] sm:w-[400px] p-0 rounded-2xl shadow-2xl border border-border/70 bg-card/95 backdrop-blur-md overflow-hidden z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium bg-primary/10 text-primary border-primary/20">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground mb-3">
                <Bell className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                You&apos;ll be notified about appointments, records, and deliveries here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon: IconComp, color, bg } = getTypeIcon(notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors hover:bg-muted/40 ${
                    !notif.read ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  {/* Status Indicator */}
                  {!notif.read && (
                    <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-primary" />
                  )}

                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${bg} ${color}`}
                  >
                    <IconComp className="h-4.5 w-4.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !notif.read ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notif.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/70">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(notif.created_at)}</span>
                      {notif.type && (
                        <span className="uppercase text-[9px] font-semibold tracking-wider text-muted-foreground/60 border border-border/60 rounded px-1">
                          {notif.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="absolute right-2 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        title="Mark as read"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      title="Delete"
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-border/50 bg-muted/10 text-center">
            <p className="text-[11px] text-muted-foreground">
              Notifications update automatically in real-time
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
