"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

import { PulseAIFloating } from "@/components/pulse-ai/PulseAIFloating";
import { ProfileCompletionBadge } from "@/components/profile-wizard/ProfileCompletionBadge";
import SecurityEnrollmentModal from "@/components/patient/SecurityEnrollmentModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [authRole, setAuthRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    authService.me().then(user => {
      const roleValue = String(user.role).toLowerCase();
      setAuthRole(roleValue);
      if (pathname.includes('/patient') && roleValue !== 'patient') router.push('/unauthorized');
      if (pathname.includes('/doctor') && roleValue !== 'doctor') router.push('/unauthorized');
      if (pathname.includes('/admin') && roleValue !== 'admin') router.push('/unauthorized');
      if (pathname.includes('/hospital') && roleValue !== 'hospital') router.push('/unauthorized');
      if (pathname.includes('/pharmacy') && roleValue !== 'pharmacy') router.push('/unauthorized');
    }).catch(() => {
      router.push('/login');
    });
  }, [pathname, router]);

  // Derive expected role from URL to render shell immediately
  const expectedRole = useMemo(() => {
    if (pathname.includes('/patient')) return 'patient';
    if (pathname.includes('/doctor')) return 'doctor';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/hospital')) return 'hospital';
    if (pathname.includes('/pharmacy')) return 'pharmacy';
    return 'patient'; // Fallback
  }, [pathname]);

  const displayRole = authRole || expectedRole;

  // Role-based accent colors (HSL format)
  const roleColors: Record<string, string> = {
    admin: '0 84% 60%',      // Red
    doctor: '142 71% 45%',   // Green
    pharmacy: '48 96% 53%',  // Yellow
    hospital: '280 65% 60%', // Purple
    patient: '221 83% 53%',  // Default Blue
  };
  
  const primaryColor = roleColors[displayRole] || roleColors.patient;

  return (
    <div 
      className="flex h-screen bg-background text-foreground"
      style={{ '--primary': primaryColor } as React.CSSProperties}
    >
      <Sidebar role={displayRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={displayRole} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
      <PulseAIFloating role={displayRole as any} />
      <ProfileCompletionBadge role={displayRole as any} />
      <SecurityEnrollmentModal />
    </div>
  )
}
