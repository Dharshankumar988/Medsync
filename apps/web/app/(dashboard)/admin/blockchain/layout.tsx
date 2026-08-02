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

const sidebarLinks = [
  { name: "Overview", href: "/admin/blockchain", icon: LayoutDashboard },
  { name: "Network Health", href: "/admin/blockchain/network", icon: Activity },
  { name: "Wallet Management", href: "/admin/blockchain/wallet", icon: Wallet },
  { name: "Smart Contracts", href: "/admin/blockchain/contracts", icon: FileCode2 },
  { name: "Transactions", href: "/admin/blockchain/transactions", icon: ListOrdered },
  { name: "Event Explorer", href: "/admin/blockchain/events", icon: ActivitySquare },
  { name: "Analytics", href: "/admin/blockchain/analytics", icon: LineChart },
  { name: "Queues & Workers", href: "/admin/blockchain/queues", icon: Layers },
  { name: "Dead Letter Queue", href: "/admin/blockchain/dlq", icon: ArchiveX },
];

export default function BlockchainAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row h-full min-h-screen">
      {/* Secondary Sidebar for Blockchain DevOps */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex-shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-bold tracking-tight text-primary">DevOps Console</h2>
          <p className="text-xs text-muted-foreground mt-1">MedSync Blockchain Subsystem</p>
        </div>
        <nav className="space-y-1 px-3">
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
      <main className="flex-1 p-6 md:p-8 bg-background overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
