"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@medsync/ui";
import { Bell, Activity, Pill, Calendar, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string>("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    async function loadNotifications() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
          
        if (data) {
          setNotifications(data);
          
          // mark as read
          const unreadIds = data.filter(n => !n.is_read).map(n => n.id);
          if (unreadIds.length > 0) {
            await supabase
              .from("notifications")
              .update({ is_read: true })
              .in("id", unreadIds);
          }
        }
      } catch (err) {
        console.error("Error loading notifications", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadNotifications();
  }, [userId]);

  const getIcon = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'appointment': return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'prescription': return <Pill className="h-5 w-5 text-emerald-500" />;
      case 'record': return <FileText className="h-5 w-5 text-violet-500" />;
      default: return <Activity className="h-5 w-5 text-orange-500" />;
    }
  };

  const getBg = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'appointment': return 'bg-blue-500/10';
      case 'prescription': return 'bg-emerald-500/10';
      case 'record': return 'bg-violet-500/10';
      default: return 'bg-orange-500/10';
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">Updates</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Stay updated with your appointments, prescriptions, and health records.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="rounded-2xl border border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No new notifications</p>
            <p className="text-sm text-muted-foreground">You are all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <Card key={notif.id} className={`group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:shadow-md ${!notif.is_read ? 'border-blue-500/30 bg-blue-500/5' : ''}`}>
              <CardContent className="p-0">
                <div className="flex items-start p-6 gap-4">
                  <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getBg(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold">{notif.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
