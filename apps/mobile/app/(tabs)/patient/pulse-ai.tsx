import React from 'react';
import { View } from 'react-native';
import { PulseAIChat } from '../../../components/pulse-ai/PulseAIChat';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useTheme } from '../../../context/ThemeContext';

export default function PatientPulseAI() {
  const { theme } = useTheme();

  return (
    <RoleGuard allowedRole="patient">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScreenHeader
          title="Pulse AI"
          subtitle="Clinical Symptom Triage & Diagnostic Copilot"
        />
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <PulseAIChat role="patient" />
        </View>
      </View>
    </RoleGuard>
  );
}
