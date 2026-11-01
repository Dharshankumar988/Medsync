import React from 'react';
import { View, SafeAreaView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { PulseAIChat } from '../../../components/pulse-ai/PulseAIChat';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { useTheme } from '../../../context/ThemeContext';

export default function PatientPulseAI() {
  const { theme, isDark } = useTheme();

  return (
    <RoleGuard allowedRole="patient">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack.Screen 
          options={{
            title: "Pulse AI (Patient)",
            headerShown: true,
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }} 
        />
        <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 16 : 0, backgroundColor: theme.background }}>
          <PulseAIChat role="patient" />
        </View>
      </SafeAreaView>
    </RoleGuard>
  );
}
