import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, LogBox } from 'react-native';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from '../providers/role-provider';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { StartupSplash } from '../components/layout/StartupSplash';

LogBox.ignoreLogs([
  '[EventSource] Unable to identify the line ending character',
  'No route named',
]);

const queryClient = new QueryClient();

function NavigationStack() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url && (url.includes('auth/callback') || url.includes('callback'))) {
        router.replace({
          pathname: '/(auth)/callback',
          params: { rawUrl: url },
        });
      }
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StartupSplash />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RoleProvider>
            <NavigationStack />
          </RoleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
