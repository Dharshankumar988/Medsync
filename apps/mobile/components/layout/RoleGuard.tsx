import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Role, useRole } from '../../providers/role-provider';
import { LoadingScreen } from './LoadingScreen';
import { UnauthorizedScreen } from './UnauthorizedScreen';

interface RoleGuardProps {
  allowedRole: Role;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const { role, isLoading, isAuthenticated } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingScreen message="Verifying role permissions..." />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen message="Redirecting to sign in..." />;
  }

  if (role !== allowedRole) {
    return <UnauthorizedScreen requiredRole={allowedRole} currentRole={role} />;
  }

  return <>{children}</>;
}
