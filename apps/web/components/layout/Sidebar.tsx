"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LayoutDashboard, FileText, Calendar, Pill, Brain, Shield, Activity, LogOut, ChevronLeft, ChevronRight, Settings } from "lucide-react";

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuGroups = {
    patient: [
      {
        label: "Overview",
        items: [
          { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
          { name: "Patient AI", href: "/patient/ai", icon: Brain, badge: "Beta" },
        ]
      },
      {
        label: "Clinical",
        items: [
          { name: "Records", href: "/patient/records", icon: FileText },
          { name: "Appointments", href: "/patient/appointments", icon: Calendar },
        ]
      }
    ],
    doctor: [
      {
        label: "Overview",
        items: [
          { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
          { name: "Doctor AI", href: "/doctor/ai", icon: Brain, badge: "Pro" },
        ]
      },
      {
        label: "Practice",
        items: [
          { name: "Patients", href: "/doctor/patients", icon: FileText },
        ]
      }
    ],
    pharmacy: [
      {
        label: "Overview",
        items: [
          { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        label: "Operations",
        items: [
          { name: "Inventory", href: "/pharmacy/inventory", icon: Pill },
        ]
      }
    ],
    admin: [
      {
        label: "Overview",
        items: [
          { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        label: "System",
        items: [
          { name: "Blockchain", href: "/admin/blockchain", icon: Shield },
        ]
      }
    ]
  };

  const groups = menuGroups[role as keyof typeof menuGroups] || [];

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="relative z-50 flex min-h-screen flex-col border-r border-border/50 bg-panel/50 backdrop-blur-xl"
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="flex h-20 items-center px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-400 shadow-soft">
            <Activity className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-semibold tracking-tight"
            >
              MedSync
            </motion.span>
          )}
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {groups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {!isCollapsed && (
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                {group.label}
              </span>
            )}
            {group.items.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-primary"
                    />
                  )}
                  <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {!isCollapsed && (
                    <span className="flex-1 truncate">{link.name}</span>
                  )}
                  {!isCollapsed && link.badge && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {link.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-border/50 p-4 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground",
            isCollapsed && "justify-center px-0"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
        <Link
          href="/login"
          className={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive",
            isCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />
          {!isCollapsed && <span>Sign Out</span>}
        </Link>
      </div>
    </motion.aside>
  )
}
