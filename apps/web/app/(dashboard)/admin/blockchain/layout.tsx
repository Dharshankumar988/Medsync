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
    <div className="flex flex-col md:flex-row w-full min-w-0">
      {/* Secondary Sidebar for Blockchain DevOps */}
      <aside className="w-full md:w-56 lg:w-60 border-r border-border bg-card flex-shrink-0">
        <div className="p-5">
          <h2 className="text-lg font-bold tracking-tight text-primary">DevOps Console</h2>
          <p className="text-xs text-muted-foreground mt-1">MedSync Blockchain Subsystem</p>
        </div>
        <nav className="space-y-1 px-3 pb-4">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin/blockchain" && pathname.startsWith(link.href));
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 p-4 md:p-6 bg-background">
        <div className="w-full min-w-0 max-w-7xl">
          <Web3Provider>
            {children}
          </Web3Provider>
        </div>
      </div>
    </div>
  );
}
