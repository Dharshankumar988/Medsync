"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, Calendar, Pill, Brain, Shield } from "lucide-react";

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const links = {
    patient: [
      { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
      { name: "Records", href: "/patient/records", icon: FileText },
      { name: "Appointments", href: "/patient/appointments", icon: Calendar },
      { name: "Patient AI", href: "/patient/ai", icon: Brain },
    ],
    doctor: [
      { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
      { name: "Patients", href: "/doctor/patients", icon: FileText },
      { name: "Doctor AI", href: "/doctor/ai", icon: Brain },
    ],
    pharmacy: [
      { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
      { name: "Inventory", href: "/pharmacy/inventory", icon: Pill },
    ],
    admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Blockchain", href: "/admin/blockchain", icon: Shield },
    ]
  };

  const navLinks = links[role as keyof typeof links] || [];

  return (
    <div className="w-64 border-r bg-muted/20 min-h-screen p-4 flex flex-col gap-2">
      <div className="text-2xl font-bold px-4 mb-8 text-primary">MedSync</div>
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{link.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
