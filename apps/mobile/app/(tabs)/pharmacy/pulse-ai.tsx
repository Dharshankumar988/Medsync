import React from 'react';
import { View, SafeAreaView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { PulseAIChat } from '../../../components/pulse-ai/PulseAIChat';
import { RoleGuard } from '../../../components/layout/RoleGuard';

export default function PharmacyPulseAI() {
  return (
    <RoleGuard allowedRole="pharmacy">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <Stack.Screen 
          options={{
            title: "Pulse AI (Pharmacy)",
            headerShown: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerShadowVisible: false,
          }} 
        />
        <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 16 : 0 }}>
          <PulseAIChat role="pharmacy" />
        </View>
      </SafeAreaView>
    </RoleGuard>
  );
}
