"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Activity, 
  Wallet, 
  FileCode2, 
  ListOrdered, 
  ActivitySquare, 
  LineChart, 
  Layers,
  ArchiveX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Web3Provider } from "@/context/Web3Context";

const sidebarLinks = [
  { name: "Overview", href: "/admin/blockchain", icon: LayoutDashboard },
  { name: "Network Health", href: "/admin/blockchain/network", icon: Activity },
  { name: "Wallet Management", href: "/admin/blockchain/wallet", icon: Wallet },
  { name: "Smart Contracts", href: "/admin/blockchain/contracts", icon: FileCode2 },
  { name: "Transactions", href: "/admin/blockchain/transactions", icon: ListOrdered },
  { name: "Analytics", href: "/admin/blockchain/analytics", icon: LineChart }
];

export default function BlockchainAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-w-0">
      {/* Secondary Sidebar for Blockchain DevOps */}
      <aside className="w-full lg:w-52 shrink-0 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-3.5 h-fit lg:sticky lg:top-4 shadow-sm">
        <div className="px-3 py-2 mb-2 border-b border-border/40">
          <h2 className="text-sm font-bold tracking-tight text-primary">DevOps Console</h2>
          <p className="text-[11px] text-muted-foreground">Blockchain Subsystem</p>
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin/blockchain" && pathname.startsWith(link.href));
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <Web3Provider>
          {children}
        </Web3Provider>
      </div>
    </div>
  );
}
