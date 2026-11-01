import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Sparkles,
  User,
} from 'lucide-react-native';
import { useRole } from '../../providers/role-provider';
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
    return <LoadingScreen message="Loading MedSync Vault..." />;
  }

  if (!isAuthenticated || !role) {
    return <LoadingScreen message="Redirecting to sign in..." />;
  }

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: '#2563EB',
    tabBarInactiveTintColor: '#94A3B8',
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1.5,
      borderTopColor: 'rgba(37, 99, 235, 0.1)',
      height: Platform.OS === 'ios' ? 88 : 66,
      paddingBottom: Platform.OS === 'ios' ? 26 : 10,
      paddingTop: 8,
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 8,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 0.2,
      marginTop: -2,
    },
  };

  return (
    <View style={styles.container}>
      <Tabs screenOptions={screenOptions}>
        {/* ── 1. PATIENT HOME / DASHBOARD ── */}
        <Tabs.Screen
          name="patient/dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* ── 2. PATIENT RECORDS & PRESCRIPTIONS HUB ── */}
        <Tabs.Screen
          name="patient/records"
          options={{
            title: 'Records',
            tabBarIcon: ({ color, focused }) => (
              <FileText
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* ── 3. PATIENT VISITS & APPOINTMENTS ── */}
        <Tabs.Screen
          name="patient/appointments"
          options={{
            title: 'Visits',
            tabBarIcon: ({ color, focused }) => (
              <Calendar
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* ── 4. PULSE AI CLINICAL ASSISTANT ── */}
        <Tabs.Screen
          name="patient/pulse-ai"
          options={{
            title: 'Pulse AI',
            tabBarIcon: ({ color, focused }) => (
              <Sparkles
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* ── 5. PATIENT HEALTH & PROFILE ── */}
        <Tabs.Screen
          name="patient/profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <User
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* ── LEGACY NON-PATIENT SCREENS: STRICTLY HIDDEN FROM TABS ── */}
        <Tabs.Screen name="doctor/dashboard" options={{ href: null }} />
        <Tabs.Screen name="doctor/patients" options={{ href: null }} />
        <Tabs.Screen name="doctor/appointments" options={{ href: null }} />
        <Tabs.Screen name="doctor/pulse-ai" options={{ href: null }} />
        <Tabs.Screen name="doctor/profile" options={{ href: null }} />
        <Tabs.Screen name="hospital/dashboard" options={{ href: null }} />
        <Tabs.Screen name="hospital/doctors" options={{ href: null }} />
        <Tabs.Screen name="hospital/appointments" options={{ href: null }} />
        <Tabs.Screen name="hospital/profile" options={{ href: null }} />
        <Tabs.Screen name="pharmacy/dashboard" options={{ href: null }} />
        <Tabs.Screen name="pharmacy/inventory" options={{ href: null }} />
        <Tabs.Screen name="pharmacy/orders" options={{ href: null }} />
        <Tabs.Screen name="pharmacy/pulse-ai" options={{ href: null }} />
        <Tabs.Screen name="pharmacy/profile" options={{ href: null }} />
        <Tabs.Screen name="admin/dashboard" options={{ href: null }} />
        <Tabs.Screen name="admin/users" options={{ href: null }} />
        <Tabs.Screen name="admin/security" options={{ href: null }} />
        <Tabs.Screen name="admin/system" options={{ href: null }} />
        <Tabs.Screen name="admin/blockchain" options={{ href: null }} />
        <Tabs.Screen name="admin/profile" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
