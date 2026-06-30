"use client";

import { Bell, Search, Settings, Command, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function Header({ role }: { role: string }) {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);
  const currentPage = paths[paths.length - 1] || 'Dashboard';
  
  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-border/50 bg-background/60 px-8 backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="capitalize font-medium hover:text-foreground cursor-pointer transition-colors">{role}</span>
          <span>/</span>
          <span className="capitalize text-foreground font-semibold">{currentPage.replace('-', ' ')}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="hidden lg:flex items-center gap-2 h-9 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
          <Sparkles className="h-4 w-4" />
          <span>Ask MedSync AI</span>
          <kbd className="ml-2 inline-flex h-5 items-center gap-1 rounded bg-primary/20 px-1.5 font-mono text-[10px] font-medium text-primary">
            <Command className="h-3 w-3" />J
          </kbd>
        </Button>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search patients, records..." 
            className="h-9 w-64 rounded-md border border-input bg-transparent pl-10 pr-12 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>
        </div>
        
        <div className="flex items-center gap-1 border-l border-border/50 pl-4 ml-2">
          <Button variant="ghost" size="icon" className="rounded-full relative text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </Button>

          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-emerald-400 p-[2px] ml-2 cursor-pointer shadow-soft hover:shadow-md transition-all">
            <div className="h-full w-full rounded-full border border-background bg-muted flex items-center justify-center overflow-hidden">
               <div className="h-full w-full bg-secondary"></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
