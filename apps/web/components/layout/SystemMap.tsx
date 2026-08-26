"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, FileText, Calendar, Pill, Brain, Shield, Activity, LogOut, Moon, Sun, Building2 } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const menuGroups = {
  patient: [
    { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard, id: "dashboard", x: 0, y: -60 },
    { name: "Pulse AI", href: "/patient/pulse-ai", icon: Brain, badge: "AI", id: "ai", x: 60, y: 0 },
  ],
  doctor: [
    { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard, id: "dashboard", x: 0, y: -60 },
    { name: "Pulse AI", href: "/doctor/pulse-ai", icon: Brain, badge: "AI", id: "ai", x: 60, y: 0 },
  ],
  pharmacy: [
    { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard, id: "dashboard", x: 0, y: -60 },
    { name: "Pulse AI", href: "/pharmacy/pulse-ai", icon: Brain, badge: "AI", id: "ai", x: 60, y: 0 },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, id: "dashboard", x: -45, y: -60 },
    { name: "Pulse AI", href: "/admin/pulse-ai", icon: Brain, badge: "AI", id: "ai", x: 45, y: -60 },
    { name: "Hospitals", href: "/admin/hospitals", icon: Building2, id: "hospitals", x: -60, y: 30 },
    { name: "Blockchain", href: "/admin/blockchain", icon: Shield, id: "blockchain", x: 60, y: 30 },
  ]
};

export function SystemMap({ role }: { role: string }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const nodes = useMemo(() => menuGroups[role as keyof typeof menuGroups] || [], [role]);

  // Find active node index for line drawing
  const activeNodeIndex = nodes.findIndex(n => pathname.startsWith(n.href));
  
  return (
    <div 
      className={cn(
        "relative z-50 flex flex-col border-r border-border/50 bg-background/40 backdrop-blur-3xl transition-all duration-500 ease-out",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex h-20 items-center justify-center pt-4">
        <Link href="/" className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Activity className="h-6 w-6" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute left-16 text-lg font-bold tracking-tight text-foreground whitespace-nowrap"
              >
                MedSync System
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <div className="flex-1 relative flex items-center justify-center my-8">
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Central Core Node */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className={cn(
              "flex items-center justify-center rounded-full bg-card border-2 shadow-lg transition-all duration-700",
              isExpanded ? "h-16 w-16 border-primary/40 shadow-primary/20" : "h-12 w-12 border-primary/20"
            )}>
              <Activity className={cn("text-primary transition-all duration-700", isExpanded ? "h-6 w-6" : "h-5 w-5")} />
            </div>
          </div>

          {/* Node Map */}
          {nodes.map((node, i) => {
            const isActive = pathname.startsWith(node.href);
            const Icon = node.icon;
            
            // Calculate spatial position based on state
            const targetX = isExpanded ? node.x * 1.5 : 0;
            const targetY = isExpanded ? node.y * 1.5 : (i - (nodes.length-1)/2) * 60;
            
            return (
              <motion.div
                key={node.name}
                animate={{ 
                  x: targetX,
                  y: targetY,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="absolute top-1/2 left-1/2 z-20"
                style={{ marginLeft: -24, marginTop: -24 }} // Center the 48x48 node
              >
                {/* Connecting Lines (SVG drawn behind) */}
                {isExpanded && (
                  <svg className="absolute top-1/2 left-1/2 -z-10 pointer-events-none" style={{ overflow: 'visible' }}>
                    <motion.line 
                      x1={0} y1={0} 
                      x2={-targetX} y2={-targetY}
                      stroke={isActive ? "currentColor" : "currentColor"}
                      className={isActive ? "text-primary/40" : "text-border"}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray={isActive ? "none" : "4 4"}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    />
                  </svg>
                )}

                <Link href={node.href}>
                  <div className="group relative">
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-sm transition-all duration-300",
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" 
                          : "bg-card/80 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                        >
                          <span className={cn(
                            "text-xs font-semibold px-2 py-1 rounded-md bg-background/80 backdrop-blur-md border",
                            isActive ? "text-primary border-primary/20" : "text-muted-foreground border-border"
                          )}>
                            {node.name}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center justify-end pb-8 gap-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isExpanded && (
            <span className="absolute left-14 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            if (typeof window !== "undefined") {
              window.location.href = '/login';
            }
          }}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {isExpanded && (
            <span className="absolute left-14 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
