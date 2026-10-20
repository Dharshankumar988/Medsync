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
    } else {
      router.replace(`/(tabs)/${role}/dashboard` as any);
    }
  }, [isLoading, isAuthenticated, role, router]);

  return <LoadingScreen message="Initializing MedSync..." />;
}
