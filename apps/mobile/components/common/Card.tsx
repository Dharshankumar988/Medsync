import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';

export function Card({ style, children, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props}>{children}</View>;
}

export function CardContent({ style, children, ...props }: ViewProps) {
  return <View style={[styles.content, style]} {...props}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  content: {
    padding: 16,
  }
});
