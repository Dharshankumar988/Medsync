import React, { useEffect, useState } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { LoadingScreen } from '../../components/layout/LoadingScreen';
import { FloatingQuickActions } from '../../components/common/FloatingQuickActions';
import { MandatoryPinSetupModal } from '../../components/patient/MandatoryPinSetupModal';
import { isStartupSplashDone, subscribeStartupSplash } from '../../components/layout/StartupSplash';
import { patientService } from '../../services/patient.service';

export default function TabLayout() {
  const { role, user, isLoading, isAuthenticated, logout } = useRole();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [splashReady, setSplashReady] = useState(() => isStartupSplashDone());
  const [requiresPinSetup, setRequiresPinSetup] = useState(false);

  useEffect(() => {
    return subscribeStartupSplash(() => setSplashReady(true));
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setRequiresPinSetup(false);
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    let active = true;
    const normalizedRole = (role || '').toLowerCase();

    if (
      isLoading ||
      !isAuthenticated ||
      !user?.id ||
      !['patient', 'pharmacy', 'doctor'].includes(normalizedRole)
    ) {
      setRequiresPinSetup(false);
      return;
    }

    patientService
      .getSecurityStatus()
      .then((sec) => {
        if (!active) return;
        const enrolled = Boolean(sec?.has_pin || sec?.status === 'COMPLETED');
        setRequiresPinSetup(!enrolled);
      })
      .catch(() => {
        // Do not lock user out on transient offline failure
      });

    return () => {
      active = false;
    };
  }, [isLoading, isAuthenticated, user?.id, role]);

  if (isLoading) {
    return <LoadingScreen message="Loading MedSync Vault..." />;
  }

  if (!isAuthenticated || !role) {
    return <LoadingScreen message="Redirecting to sign in..." />;
  }

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: isDark ? '#FAFAFA' : '#09090B',
    tabBarInactiveTintColor: isDark ? '#71717A' : '#A1A1AA',
    tabBarStyle: {
      backgroundColor: theme.tabBar,
      borderTopWidth: 1,
      borderTopColor: theme.tabBarBorder,
      height: Platform.OS === 'ios' ? 88 : 66,
      paddingBottom: Platform.OS === 'ios' ? 26 : 10,
      paddingTop: 8,
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

        {/* ── 4. PULSE AI CLINICAL COPILOT ── */}
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

        {/* ── 5. PATIENT PROFILE & VAULT SETTINGS ── */}
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
      </Tabs>

      {/* Floating Action Buttons above bottom menu: Bottom-Left Scan QR & Bottom-Right Pulse AI */}
      {!requiresPinSetup && <FloatingQuickActions />}

      {/* Mandatory First-Time Auth PIN Setup Gate */}
      <MandatoryPinSetupModal
        visible={splashReady && requiresPinSetup}
        role={role}
        userEmail={user?.email}
        onCompleted={() => setRequiresPinSetup(false)}
        onSignOut={async () => {
          setRequiresPinSetup(false);
          await logout();
          router.replace('/(auth)/login');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
