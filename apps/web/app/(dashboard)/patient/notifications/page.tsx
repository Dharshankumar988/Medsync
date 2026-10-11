"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, Skeleton, Button, Badge } from "@medsync/ui";
import {
  Bell,
  Activity,
  Pill,
  Calendar,
  FileText,
  Truck,
  Building2,
  CheckCheck,
  Check,
  Trash2,
  Clock,
  Inbox
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export interface NotificationItem {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read?: boolean;
  is_read?: boolean;
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
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    let items: NotificationItem[] = [];

    // 1. Primary: Load via backend API (same as NotificationBell)
    try {
      const res = await api.get(`/api/v1/notifications?limit=50&_t=${Date.now()}`);
      if (res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        items = res.data.data.map((raw: any) => {
          const isRead = Boolean(raw.is_read ?? raw.read);
          return {
            ...raw,
            read: isRead,
            is_read: isRead,
          };
        });
      }
    } catch (err) {
      console.warn("Backend notifications API error, checking Supabase fallback:", err);
    }

    // 2. Fallback: Load via Supabase if backend returned no items
    if (items.length === 0) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUid = authData?.user?.id;
        if (currentUid) {
          const { data: supaData } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", currentUid)
            .order("created_at", { ascending: false });

          if (Array.isArray(supaData) && supaData.length > 0) {
            items = supaData.map((raw: any) => {
              const isRead = Boolean(raw.is_read ?? raw.read);
              return {
                ...raw,
                read: isRead,
                is_read: isRead,
              };
            });
          }
        }
      } catch (err) {
        console.error("Supabase notifications query error:", err);
      }
    }

    setNotifications(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !Boolean(n.is_read ?? n.read)).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !Boolean(n.is_read ?? n.read));
    }
    return notifications;
  }, [notifications, filter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
      );
      await api.post(`/api/v1/notifications/${id}/read`);
      try {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      } catch {}
      toast.success("Notification marked as read");
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      const unreadIds = notifications
        .filter((n) => !Boolean(n.is_read ?? n.read))
        .map((n) => n.id);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, is_read: true }))
      );

      await api.post(`/api/v1/notifications/read-all`);

      if (unreadIds.length > 0) {
        try {
          await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
        } catch {}
      }
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read", err);
      toast.error("Failed to mark all notifications as read");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await api.delete(`/api/v1/notifications/${id}`);
      try {
        await supabase.from("notifications").delete().eq("id", id);
      } catch {}
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Failed to delete notification", err);
      toast.error("Failed to delete notification");
    }
  };

  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "appointment":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "prescription":
        return <Pill className="h-5 w-5 text-emerald-500" />;
      case "record":
        return <FileText className="h-5 w-5 text-violet-500" />;
      case "delivery":
        return <Truck className="h-5 w-5 text-amber-500" />;
      case "facility":
        return <Building2 className="h-5 w-5 text-purple-500" />;
      default:
        return <Activity className="h-5 w-5 text-primary" />;
    }
  };

  const getBg = (type: string) => {
    switch (type?.toLowerCase()) {
      case "appointment":
        return "bg-blue-500/10 border-blue-500/20";
      case "prescription":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "record":
        return "bg-violet-500/10 border-violet-500/20";
      case "delivery":
        return "bg-amber-500/10 border-amber-500/20";
      case "facility":
        return "bg-purple-500/10 border-purple-500/20";
      default:
        return "bg-primary/10 border-primary/20";
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">Updates</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-semibold px-2 py-0.5">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 max-w-md text-sm leading-relaxed">
            Stay updated with your appointments, prescriptions, and medical records in real-time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="rounded-xl border-border/80 text-xs font-medium h-9"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Mark all read
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filter === "unread"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-border/80 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground mb-3">
              <Inbox className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-base font-semibold text-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
              {filter === "unread"
                ? "You have caught up with all your notifications."
                : "You will be alerted about appointments, prescriptions, and lab orders here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.map((notif) => {
              const isUnread = !Boolean(notif.is_read ?? notif.read);
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card
                    className={`group relative overflow-hidden rounded-2xl border transition-all hover:shadow-md ${
                      isUnread
                        ? "border-primary/40 bg-primary/[0.03] shadow-sm"
                        : "border-border/60 bg-card/60"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        {/* Type Icon */}
                        <div
                          className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getBg(
                            notif.type
                          )}`}
                        >
                          {getIcon(notif.type)}
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0 pr-16 sm:pr-20">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3
                              className={`text-sm font-semibold truncate ${
                                isUnread ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {notif.title}
                            </h3>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                            {notif.type && (
                              <span className="uppercase text-[9px] font-bold tracking-wider text-muted-foreground/70 border border-border/60 rounded px-1.5 py-0.2">
                                {notif.type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground/70 font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(notif.created_at)}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>{new Date(notif.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute right-3 top-4 sm:right-4 sm:top-5 flex items-center gap-1">
                          {isUnread && (
                            <button
                              title="Mark as read"
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            title="Delete notification"
                            onClick={() => handleDelete(notif.id)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/80 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
