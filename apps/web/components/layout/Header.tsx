"use client";

import { memo, useMemo, useState } from "react";
import { LogOut, User, Settings, ShoppingBag, Search, Bell, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button
} from "@medsync/ui";
import { supabase } from "@/lib/supabase";

export const Header = memo(function Header({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { paths, currentPage } = useMemo(() => {
    const pathsList = pathname.split('/').filter(Boolean);
    return {
      paths: pathsList,
      currentPage: pathsList[pathsList.length - 1] || 'Dashboard'
    };
  }, [pathname]);
  
  const getProfilePath = () => {
    const r = role.toLowerCase();
    if (r === 'patient') return '/patient/my-health';
    if (r === 'pharmacy') return '/pharmacy/settings';
    return `/${r}/profile`;
  };
  const getSettingsPath = () => `/${role.toLowerCase()}/settings`;
  const getOrdersPath = () => `/${role.toLowerCase()}/orders`;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };
  
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger could go here if sidebar was handled completely via header */}
        <div className="flex items-center gap-2 text-sm">
          <span className="capitalize font-medium text-muted-foreground hidden sm:inline-block">{role}</span>
          <span className="text-muted-foreground/50 hidden sm:inline-block">/</span>
          <span className="capitalize font-semibold text-foreground tracking-tight">{currentPage.replace(/-/g, ' ')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Search Bar - Hidden on small screens */}
        <div className="relative hidden md:block w-64 lg:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder={`Search ${role} dashboard...`}
            className="w-full rounded-full border border-border/60 bg-muted/30 py-1.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-background"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 lg:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:bg-muted">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
        </Button>

        {/* Profile */}
        <div className="pl-1 md:pl-2 border-l border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="User profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm ring-2 ring-transparent hover:ring-primary/20 transition-all outline-none">
                {role.charAt(0).toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-56 rounded-xl shadow-lg border-border/60">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none capitalize">{role} User</p>
                  <p className="text-xs leading-none text-muted-foreground">Manage your account</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(getProfilePath())} className="cursor-pointer">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(getSettingsPath())} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>
              {role.toLowerCase() === 'patient' && (
                <DropdownMenuItem onClick={() => router.push(getOrdersPath())} className="cursor-pointer">
                  <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Your Orders</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});
