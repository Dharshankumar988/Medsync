"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    authService.me().then(user => {
      setRole(user.role);
      if (pathname.includes('/patient') && user.role !== 'patient') router.push('/unauthorized');
      if (pathname.includes('/doctor') && user.role !== 'doctor') router.push('/unauthorized');
      if (pathname.includes('/admin') && user.role !== 'admin') router.push('/unauthorized');
    }).catch(() => {
      router.push('/login');
    });
  }, [pathname, router]);

  if (!role) return <div className="p-8">Loading Secure Environment...</div>;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
