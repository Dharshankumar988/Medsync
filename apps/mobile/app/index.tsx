import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRole } from '../providers/role-provider';
import { LoadingScreen } from '../components/layout/LoadingScreen';

export default function IndexScreen() {
  const { role, isLoading, isAuthenticated } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !role) {
      router.replace('/(auth)/login');
    } else if (role === 'patient') {
      router.replace('/(tabs)/patient/dashboard');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, role, router]);

  return <LoadingScreen message="Initializing MedSync Vault..." />;
}
