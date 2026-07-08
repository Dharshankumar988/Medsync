"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LayoutDashboard, FileText, Calendar, Pill, Brain, Shield, Activity, LogOut, ChevronLeft, ChevronRight, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  const menuGroups = {
    patient: [
      {
        label: "OVERVIEW",
        items: [
          { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
        ]
      }
    ],
    doctor: [
      {
        label: "OVERVIEW",
        items: [
          { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
        ]
      }
    ],
    pharmacy: [
      {
        label: "OVERVIEW",
        items: [
          { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
        ]
      }
    ],
    admin: [
      {
        label: "OVERVIEW",
        items: [
          { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        label: "SYSTEM",
        items: [
          { name: "Blockchain", href: "/admin/blockchain", icon: Shield },
        ]
      }
    ]
  };

  const groups = menuGroups[role as keyof typeof menuGroups] || [];

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 72 : 260 }}
      className="relative z-50 flex min-h-screen flex-col border-r border-border bg-card transition-colors"
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-xs hover:bg-muted transition-colors"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex h-16 items-center px-4 mb-4 mt-2">
        <Link href="/" className="flex items-center gap-3 pl-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">
              MedSync
            </span>
          )}
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        {groups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {!isCollapsed && (
              <span className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/80 mb-1">
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
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1.5 h-6 w-1 rounded-r-full bg-primary"
                    />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {!isCollapsed && (
                    <span className="flex-1 truncate">{link.name}</span>
                  )}
                  {!isCollapsed && (link as any).badge && (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {(link as any).badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3 space-y-1 mt-auto">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            isCollapsed && "justify-center px-0"
          )}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }
          }}
          className={cn(
            "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            isCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  )
}
