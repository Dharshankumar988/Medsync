import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PatientDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient Dashboard</Text>
      <Text style={styles.subtitle}>Welcome to your secure health portal.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#64748b' }
});
