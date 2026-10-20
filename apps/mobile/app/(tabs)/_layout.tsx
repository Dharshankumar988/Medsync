import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Activity,
  User,
  Users,
  ShoppingBag,
  Package,
  Shield,
  Server,
} from 'lucide-react-native';
import { useRole } from '../../providers/role-provider';
import { getRoleTheme } from '../../constants/theme';
import { LoadingScreen } from '../../components/layout/LoadingScreen';

export default function TabLayout() {
  const { role, isLoading, isAuthenticated } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingScreen message="Loading MedSync..." />;
  }

  if (!isAuthenticated || !role) {
    return <LoadingScreen message="Redirecting to sign in..." />;
  }

  const roleTheme = getRoleTheme(role);

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: roleTheme.primary,
    tabBarInactiveTintColor: '#64748B',
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      height: Platform.OS === 'ios' ? 86 : 64,
      paddingBottom: Platform.OS === 'ios' ? 24 : 8,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
    },
  };

  return (
    <Tabs screenOptions={screenOptions}>
      {/* ── PATIENT TABS ── */}
      <Tabs.Screen
        name="patient/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'patient' ? undefined : null,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patient/records"
        options={{
          title: 'Records',
          href: role === 'patient' ? undefined : null,
          tabBarIcon: ({ color, size }) => <FileText size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patient/appointments"
        options={{
          title: 'Appointments',
          href: role === 'patient' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Calendar size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patient/pulse-ai"
        options={{
          title: 'Pulse AI',
          href: role === 'patient' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Activity size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patient/profile"
        options={{
          title: 'Profile',
          href: role === 'patient' ? undefined : null,
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
        }}
      />

      {/* ── DOCTOR TABS ── */}
      <Tabs.Screen
        name="doctor/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'doctor' ? undefined : null,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="doctor/patients"
        options={{
          title: 'Patients',
          href: role === 'doctor' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Users size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="doctor/appointments"
        options={{
          title: 'Schedule',
          href: role === 'doctor' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Calendar size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="doctor/pulse-ai"
        options={{
          title: 'Pulse AI',
          href: role === 'doctor' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Activity size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="doctor/profile"
        options={{
          title: 'Profile',
          href: role === 'doctor' ? undefined : null,
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
        }}
      />

      {/* ── PHARMACY TABS ── */}
      <Tabs.Screen
        name="pharmacy/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'pharmacy' ? undefined : null,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pharmacy/orders"
        options={{
          title: 'Orders',
          href: role === 'pharmacy' ? undefined : null,
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pharmacy/inventory"
        options={{
          title: 'Inventory',
          href: role === 'pharmacy' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Package size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pharmacy/pulse-ai"
        options={{
          title: 'Pulse AI',
          href: role === 'pharmacy' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Activity size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pharmacy/profile"
        options={{
          title: 'Profile',
          href: role === 'pharmacy' ? undefined : null,
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
        }}
      />

      {/* ── HOSPITAL TABS ── */}
      <Tabs.Screen
        name="hospital/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'hospital' ? undefined : null,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hospital/doctors"
        options={{
          title: 'Doctors',
          href: role === 'hospital' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Users size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hospital/appointments"
        options={{
          title: 'Schedule',
          href: role === 'hospital' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Calendar size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hospital/profile"
        options={{
          title: 'Profile',
          href: role === 'hospital' ? undefined : null,
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
        }}
      />

      {/* ── ADMIN TABS ── */}
      <Tabs.Screen
        name="admin/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'admin' ? undefined : null,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin/users"
        options={{
          title: 'Users',
          href: role === 'admin' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Users size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin/security"
        options={{
          title: 'Security',
          href: role === 'admin' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Shield size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin/system"
        options={{
          title: 'System',
          href: role === 'admin' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Server size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin/profile"
        options={{
          title: 'Profile',
          href: role === 'admin' ? undefined : null,
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
