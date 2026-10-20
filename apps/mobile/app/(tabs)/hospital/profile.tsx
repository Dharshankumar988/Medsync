import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Globe,
  LogOut,
  AlertCircle,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Colors } from '../../../constants/theme';
import { hospitalService, HospitalProfile } from '../../../services/hospital.service';
import { authService } from '../../../services/auth.service';
import { formatErrorMessage } from '../../../lib/api';

export default function HospitalProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<HospitalProfile>({
    id: '',
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    phone_number: '',
    email: '',
    website: '',
    type: 'hospital',
    is_verified: true,
    is_active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      const data = await hospitalService.getProfile();
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load hospital profile:', err);
      setError(err.message || 'Failed to load facility profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFieldChange = (field: keyof HospitalProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Validation Error', 'Facility name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await hospitalService.updateProfile(profile.id, profile);
      Alert.alert('Profile Saved', 'Hospital credentials and facility details updated successfully.');
    } catch (err: any) {
      Alert.alert('Save Failed', formatErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of the hospital console?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <RoleGuard allowedRole="hospital">
      <View style={styles.container}>
        <ScreenHeader
          title="Facility Profile"
          subtitle="Hospital credentials & facility settings"
        />

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.roles.hospital.primary} />
            <Text style={styles.loadingText}>Loading facility profile...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Profile Overview Card */}
            <Card style={styles.headerCard}>
              <CardContent>
                <View style={styles.headerRow}>
                  <View style={styles.avatarCircle}>
                    <Building2 size={26} color={Colors.roles.hospital.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facilityName}>{profile.name || 'Hospital Facility'}</Text>
                    <Text style={styles.facilityType}>
                      {profile.type === 'clinic' ? 'Private Medical Clinic' : 'Multi-Specialty Hospital'}
                    </Text>
                    <View style={styles.verifiedRow}>
                      <ShieldCheck size={14} color="#0284C7" style={{ marginRight: 4 }} />
                      <Text style={styles.verifiedText}>Verified Clinical Center</Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Facility Details Form */}
            <Card style={styles.formCard}>
              <CardContent>
                <Text style={styles.cardTitle}>Facility Details</Text>

                <Text style={styles.label}>Hospital / Facility Name *</Text>
                <TextInput
                  style={styles.input}
                  value={profile.name}
                  onChangeText={(v) => handleFieldChange('name', v)}
                />

                <Text style={styles.label}>Physical Campus Address *</Text>
                <TextInput
                  style={styles.input}
                  value={profile.address}
                  onChangeText={(v) => handleFieldChange('address', v)}
                  placeholder="Street address, campus building"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.city || ''}
                      onChangeText={(v) => handleFieldChange('city', v)}
                      placeholder="e.g. Bangalore"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.state || ''}
                      onChangeText={(v) => handleFieldChange('state', v)}
                      placeholder="e.g. Karnataka"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.label}>Pincode</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.pincode || ''}
                      onChangeText={(v) => handleFieldChange('pincode', v)}
                      placeholder="560001"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.label}>Contact Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={profile.phone_number || ''}
                      onChangeText={(v) => handleFieldChange('phone_number', v)}
                      placeholder="+91 80 2345 6789"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Official Facility Email</Text>
                <TextInput
                  style={styles.input}
                  value={profile.email || ''}
                  onChangeText={(v) => handleFieldChange('email', v)}
                  placeholder="contact@hospital.health"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Official Website URL</Text>
                <TextInput
                  style={styles.input}
                  value={profile.website || ''}
                  onChangeText={(v) => handleFieldChange('website', v)}
                  placeholder="https://hospital.medsync.health"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />

                <Button
                  title="Save Facility Profile"
                  loading={saving}
                  onPress={handleSave}
                  style={{ marginTop: 16 }}
                />
              </CardContent>
            </Card>

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.signOutText}>Sign Out of Hospital Console</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  headerCard: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  facilityName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  facilityType: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  formCard: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 8,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
