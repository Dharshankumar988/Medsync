import { Stack } from 'expo-router';
import { QueryProvider } from '../providers/query-provider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryProvider>
  );
}
