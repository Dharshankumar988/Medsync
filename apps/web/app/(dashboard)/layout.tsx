"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

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

  if (!role) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Secure Environment...</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header role={role} />
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 relative">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
