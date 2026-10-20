import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LucideIcon, Info, CheckCircle2 } from 'lucide-react-native';
import { Role } from '../../providers/role-provider';
import { Colors, getRoleTheme } from '../../constants/theme';
import { getRoleDisplayName } from '../../navigation/routes';
import { RoleGuard } from './RoleGuard';
import { ScreenHeader } from './ScreenHeader';
import { Card, CardContent } from '../common/Card';

interface RolePlaceholderScreenProps {
  role: Role;
  title: string;
  subtitle: string;
  featureName: string;
  description: string;
  icon: LucideIcon;
  plannedFeatures?: string[];
}

export const RolePlaceholderScreen = React.memo(function RolePlaceholderScreen({
  role,
  title,
  subtitle,
  featureName,
  description,
  icon: Icon,
  plannedFeatures = [],
}: RolePlaceholderScreenProps) {
  const theme = getRoleTheme(role);

  return (
    <RoleGuard allowedRole={role}>
      <View style={styles.container}>
        <ScreenHeader title={title} subtitle={subtitle} />

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Status Banner */}
          <View style={[styles.banner, { backgroundColor: theme.bg, borderColor: theme.badgeBorder }]}>
            <Info size={18} color={theme.primary} />
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: theme.primary }]}>
                {getRoleDisplayName(role)} Feature — Under Development
              </Text>
              <Text style={styles.bannerSubtitle}>
                Native navigation and route access verified. Business logic will be implemented in Step 3.
              </Text>
            </View>
          </View>

          {/* Feature Overview Card */}
          <Card style={styles.card}>
            <CardContent>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.bg, borderColor: theme.badgeBorder }]}>
                  <Icon size={24} color={theme.primary} />
                </View>
                <View style={styles.cardTitleColumn}>
                  <Text style={styles.featureTitle}>{featureName}</Text>
                  <Text style={styles.featureCategory}>{getRoleDisplayName(role)} Portal</Text>
                </View>
              </View>

              <Text style={styles.description}>{description}</Text>
            </CardContent>
          </Card>

          {/* Planned Features Section */}
          {plannedFeatures.length > 0 && (
            <Card style={styles.card}>
              <CardContent>
                <Text style={styles.sectionTitle}>Planned Native Capabilities</Text>
                <View style={styles.featuresList}>
                  {plannedFeatures.map((item, index) => (
                    <View key={index} style={styles.featureItem}>
                      <CheckCircle2 size={16} color={theme.primary} style={styles.checkIcon} />
                      <Text style={styles.featureItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          )}
        </ScrollView>
      </View>
    </RoleGuard>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleColumn: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureCategory: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    marginTop: 1,
  },
  featureItemText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
});
