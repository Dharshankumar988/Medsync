"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    authService.me().then(user => {
      const roleValue = String(user.role).toLowerCase();
      setRole(roleValue);
      if (pathname.includes('/patient') && roleValue !== 'patient') router.push('/unauthorized');
      if (pathname.includes('/doctor') && roleValue !== 'doctor') router.push('/unauthorized');
      if (pathname.includes('/admin') && roleValue !== 'admin') router.push('/unauthorized');
      if (pathname.includes('/pharmacy') && roleValue !== 'pharmacy') router.push('/unauthorized');
    }).catch(() => {
      router.push('/login');
    });
  }, [pathname, router]);

  if (!role) return (
    <div className="flex h-screen bg-background">
      <div className="w-[260px] border-r border-border p-4">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-full mb-2" />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border flex items-center px-6">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-8">
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
