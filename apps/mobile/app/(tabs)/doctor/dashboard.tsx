import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DoctorDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Doctor Dashboard</Text>
      <Text style={styles.subtitle}>Manage your patients and AI analysis here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#64748b' }
});
