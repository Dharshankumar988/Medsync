"use client";

import { memo, useMemo } from "react";

import { Bell, Search, Command, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

export const Header = memo(function Header({ role }: { role: string }) {
  const pathname = usePathname();
  
  const { paths, currentPage } = useMemo(() => {
    const pathsList = pathname.split('/').filter(Boolean);
    return {
      paths: pathsList,
      currentPage: pathsList[pathsList.length - 1] || 'Dashboard'
    };
  }, [pathname]);
  
  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="capitalize font-medium text-muted-foreground">{role}</span>
        <span className="text-muted-foreground">/</span>
        <span className="capitalize font-semibold text-foreground">{currentPage.replace('-', ' ')}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 border-border pl-4">
          <button aria-label="User profile" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs ring-2 ring-transparent hover:ring-primary/20 transition-all">
            {role.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
});
