import { useState, memo, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, FileText, Calendar, Pill, Brain, Shield, ShieldCheck, Activity, LogOut, ChevronLeft, ChevronRight, Settings, Moon, Sun, Building2, ShoppingBag, Package, AlertTriangle, Bell, Users, LineChart, Server, UserPlus, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@medsync/ui";

const menuGroups = {
  patient: [
    {
      label: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
        { name: "My Health", href: "/patient/my-health", icon: Activity },
      ]
    },
    {
      label: "MEDICAL",
      items: [
        { name: "Medical Records", href: "/patient/records", icon: FileText },
        { name: "Appointments & Doctors", href: "/patient/appointments", icon: Calendar },
        { name: "Prescriptions & Medicines", href: "/patient/prescriptions", icon: Pill },
      ]
    },
    {
      label: "SERVICES",
      items: [
        { name: "Orders & Delivery", href: "/patient/orders", icon: ShoppingBag },
        { name: "Pulse AI", href: "/patient/pulse-ai", icon: Brain, badge: "AI" },
        { name: "Privacy & Security", href: "/patient/privacy", icon: Shield },
      ]
    },
    {
      label: "ACCOUNT",
      items: [
        { name: "Notifications", href: "/patient/notifications", icon: Bell },
        { name: "Settings", href: "/patient/settings", icon: Settings },
      ]
    }
  ],
  doctor: [
    {
      label: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
        { name: "Patients", href: "/doctor/patients", icon: Users },
        { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
      ]
    },
    {
      label: "CLINICAL",
      items: [
        { name: "Medical Records", href: "/doctor/records", icon: FileText },
        { name: "AI Analysis", href: "/doctor/ai-analysis", icon: Brain, badge: "AI" },
        { name: "Prescriptions", href: "/doctor/prescriptions", icon: Pill },
        { name: "Pulse AI", href: "/doctor/pulse-ai", icon: Activity, badge: "AI" },
      ]
    },
    {
      label: "NETWORK & SECURITY",
      items: [
        { name: "Pharmacies", href: "/doctor/pharmacies", icon: Building2 },
        { name: "Consent & Security", href: "/doctor/consent", icon: Shield },
      ]
    },
    {
      label: "ACCOUNT",
      items: [
        { name: "Analytics", href: "/doctor/analytics", icon: LineChart },
        { name: "Settings", href: "/doctor/settings", icon: Settings },
      ]
    }
  ],
  pharmacy: [
    {
      label: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
        { name: "QR & Verification", href: "/pharmacy/dashboard", icon: Shield },
        { name: "Pulse AI", href: "/pharmacy/pulse-ai", icon: Brain, badge: "AI" },
      ]
    },
    {
      label: "OPERATIONS",
      items: [
        { name: "Orders & Delivery", href: "/pharmacy/orders", icon: ShoppingBag },
        { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
        { name: "Expiring Stock", href: "/pharmacy/expired", icon: AlertTriangle },
      ]
    },
    {
      label: "NETWORK",
      items: [
        { name: "Patients", href: "/pharmacy/patients", icon: Users },
      ]
    },
    {
      label: "ACCOUNT",
      items: [
        { name: "Analytics", href: "/pharmacy/analytics", icon: LineChart },
        { name: "Settings", href: "/pharmacy/settings", icon: Settings },
      ]
    }
  ],
  admin: [
    {
      label: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Users & Verification", href: "/admin/users", icon: Users },
      ]
    },
    {
      label: "OPERATIONS & AI",
      items: [
        { name: "Healthcare Operations", href: "/admin/operations", icon: Activity },
        { name: "AI Management", href: "/admin/ai", icon: Brain, badge: "AI" },
        { name: "Pulse AI", href: "/admin/pulse-ai", icon: FileText, badge: "AI" },
      ]
    },
    {
      label: "SYSTEM & SECURITY",
      items: [
        { name: "Blockchain", href: "/admin/blockchain", icon: Shield },
        { name: "Interoperability", href: "/admin/interoperability", icon: RefreshCw },
        { name: "Security & Audit", href: "/admin/security", icon: ShieldCheck },
      ]
    },
    {
      label: "ANALYTICS & CONFIG",
      items: [
        { name: "Analytics", href: "/admin/analytics", icon: LineChart },
        { name: "System & Integrations", href: "/admin/system", icon: Server },
        { name: "Settings", href: "/admin/settings", icon: Settings },
        { name: "Profile", href: "/admin/profile", icon: UserPlus },
      ]
    }
  ]
};

export const Sidebar = memo(function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const groups = useMemo(() => menuGroups[role as keyof typeof menuGroups] || [], [role]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const NavItem = ({ link, isActive }: { link: any, isActive: boolean }) => {
    const Icon = link.icon;
    
    const inner = (
      <Link
        href={link.href}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-xl",
          isActive 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-1 truncate tracking-wide"
            >
              {link.name}
            </motion.span>
          )}
        </AnimatePresence>

        {!isCollapsed && link.badge && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider",
            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
          )}>
            {link.badge}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{inner}</TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2 z-50">
              {link.name}
              {link.badge && (
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-primary/10 text-primary">
                  {link.badge}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return inner;
  };

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative z-50 flex h-screen flex-col border-r border-border/60 bg-card transition-colors"
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm hover:bg-muted transition-colors"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex h-16 items-center px-5 mb-4 mt-2">
        <Link href="/" className="flex items-center gap-3 pl-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xl font-bold tracking-tight text-foreground"
              >
                MedSync
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-6">
        {groups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/80 mb-1"
                >
                  {group.label}
                </motion.span>
              )}
            </AnimatePresence>
            {group.items.map((link) => (
              <NavItem key={link.name} link={link} isActive={pathname.startsWith(link.href)} />
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 p-4 space-y-2 mt-auto">
        {mounted && (
          <button
            onClick={toggleTheme}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground",
              isCollapsed && "justify-center px-0"
            )}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-45" /> : <Moon className="h-4 w-4 shrink-0 transition-transform group-hover:-rotate-12" />}
            {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        )}

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            if (typeof window !== "undefined") {
              window.location.href = '/login';
            }
          }}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive",
            isCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  )
});
