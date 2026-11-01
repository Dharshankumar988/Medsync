import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Heart,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  X,
  Sparkles,
  Activity,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Scale,
} from 'lucide-react-native';
import { patientService } from '../../services/patient.service';
import { useTheme } from '../../context/ThemeContext';

export interface CompleteHealthProfileModalProps {
  visible: boolean;
  userId: string;
  initialData?: any;
  onClose: () => void;
  onCompleted: (updated?: any) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const COMMON_ALLERGIES = ['Penicillin', 'Peanuts', 'Sulfa Drugs', 'Dust Mites', 'Pollen', 'Latex', 'Aspirin'];
const COMMON_CHRONIC = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Thyroid', 'High Cholesterol', 'None'];

export function CompleteHealthProfileModal({
  visible,
  userId,
  initialData,
  onClose,
  onCompleted,
}: CompleteHealthProfileModalProps) {
  const { theme, isDark } = useTheme();

  // Active section tab: 'vitals' | 'medical' | 'contact'
  const [activeTab, setActiveTab] = useState<'vitals' | 'medical' | 'contact'>('vitals');

  // Vitals & Basics
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('MALE');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Medical History
  const [allergies, setAllergies] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [medicalAlerts, setMedicalAlerts] = useState('');

  // Contact & Emergency
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Populate initial data when opened
  useEffect(() => {
    if (initialData) {
      setFullName(initialData.full_name || '');
      setDateOfBirth(initialData.date_of_birth || '');
      setGender((initialData.gender || 'MALE').toUpperCase());
      setBloodGroup(initialData.blood_group || 'O+');
      setHeightCm(initialData.height_cm ? String(initialData.height_cm) : '');
      setWeightKg(initialData.weight_kg ? String(initialData.weight_kg) : '');
      setAllergies(initialData.allergies || '');
      setChronicDiseases(initialData.chronic_diseases || '');
      setMedicalAlerts(initialData.medical_alerts || '');
      setPhone(initialData.phone_number || initialData.contact_number || '');
      setAddress(initialData.address || '');
      setCity(initialData.city || '');
      setState(initialData.state || '');
      setCountry(initialData.country || '');
      setPincode(initialData.pincode || '');
      setEmergencyName(initialData.emergency_contact_name || '');
      setEmergencyPhone(initialData.emergency_contact_number || '');
    }
  }, [initialData, visible]);

  // Live BMI Calculation
  const bmiInfo = useMemo(() => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const heightInMeters = h / 100;
    const bmi = w / (heightInMeters * heightInMeters);
    let category = 'Normal';
    let color = '#10B981';
    if (bmi < 18.5) {
      category = 'Underweight';
      color = '#F59E0B';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Overweight';
      color = '#F59E0B';
    } else if (bmi >= 30) {
      category = 'Obese';
      color = '#EF4444';
    }
    return { value: bmi.toFixed(1), category, color };
  }, [heightCm, weightKg]);

  const toggleAllergyTag = (item: string) => {
    const current = allergies ? allergies.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (current.includes(item)) {
      setAllergies(current.filter((c) => c !== item).join(', '));
    } else {
      setAllergies([...current, item].join(', '));
    }
  };

  const toggleChronicTag = (item: string) => {
    if (item === 'None') {
      setChronicDiseases('None');
      return;
    }
    const current = chronicDiseases && chronicDiseases !== 'None'
      ? chronicDiseases.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    if (current.includes(item)) {
      setChronicDiseases(current.filter((c) => c !== item).join(', '));
    } else {
      setChronicDiseases([...current, item].join(', '));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const payload: Record<string, any> = {
        full_name: fullName.trim() || undefined,
        date_of_birth: dateOfBirth.trim() || undefined,
        gender,
        blood_group: bloodGroup,
        phone_number: phone.trim() || undefined,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_number: emergencyPhone.trim() || undefined,
        allergies: allergies.trim() || undefined,
        chronic_diseases: chronicDiseases.trim() || undefined,
        medical_alerts: medicalAlerts.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        pincode: pincode.trim() || undefined,
        profile_completion_percentage: 100,
      };

      if (heightCm) payload.height_cm = parseFloat(heightCm);
      if (weightKg) payload.weight_kg = parseFloat(weightKg);

      const res = await patientService.updateProfile(userId, payload);
      onCompleted(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update health profile.');
    } finally {
      setSaving(false);
    }
  };

  const currentAllergies = useMemo(
    () => (allergies ? allergies.split(',').map((s) => s.trim().toLowerCase()) : []),
    [allergies]
  );
  const currentChronic = useMemo(
    () => (chronicDiseases ? chronicDiseases.split(',').map((s) => s.trim().toLowerCase()) : []),
    [chronicDiseases]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: isDark ? '#141418' : '#FFFFFF',
              borderColor: isDark ? '#27272A' : '#E4E4E7',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
                    borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
                  },
                ]}
              >
                <Heart size={20} color="#38BDF8" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.title, { color: theme.text }]}>Patient Health Vault</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  Comprehensive medical & clinical identity
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              accessibilityLabel="Close"
            >
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Section Segment Tabs */}
          <View
            style={[
              styles.segmentTabs,
              { backgroundColor: isDark ? '#18181B' : '#F4F4F5', borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'vitals' && {
                  backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setActiveTab('vitals')}
            >
              <Activity
                size={14}
                color={activeTab === 'vitals' ? (isDark ? '#FAFAFA' : '#09090B') : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'vitals'
                        ? isDark
                          ? '#FAFAFA'
                          : '#09090B'
                        : theme.textMuted,
                  },
                ]}
              >
                Vitals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'medical' && {
                  backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setActiveTab('medical')}
            >
              <AlertTriangle
                size={14}
                color={activeTab === 'medical' ? (isDark ? '#FAFAFA' : '#09090B') : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'medical'
                        ? isDark
                          ? '#FAFAFA'
                          : '#09090B'
                        : theme.textMuted,
                  },
                ]}
              >
                Clinical
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'contact' && {
                  backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setActiveTab('contact')}
            >
              <MapPin
                size={14}
                color={activeTab === 'contact' ? (isDark ? '#FAFAFA' : '#09090B') : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'contact'
                        ? isDark
                          ? '#FAFAFA'
                          : '#09090B'
                        : theme.textMuted,
                  },
                ]}
              >
                Address & SOS
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Tab Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── TAB 1: VITALS & BASICS ── */}
            {activeTab === 'vitals' && (
              <View>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Full Legal Name</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <User size={16} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. Dharshan Kumar"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                {/* Date of Birth */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Date of Birth (YYYY-MM-DD)
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <Calendar size={16} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="YYYY-MM-DD (e.g. 1998-05-12)"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={dateOfBirth}
                      onChangeText={setDateOfBirth}
                    />
                  </View>
                </View>

                {/* Gender Pills */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Biological Sex</Text>
                  <View style={styles.pillRow}>
                    {GENDERS.map((g) => {
                      const selected = gender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: selected
                                ? isDark
                                  ? '#FAFAFA'
                                  : '#09090B'
                                : theme.card,
                              borderColor: selected
                                ? isDark
                                  ? '#FAFAFA'
                                  : '#09090B'
                                : theme.border,
                            },
                          ]}
                          onPress={() => setGender(g)}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              {
                                color: selected
                                  ? isDark
                                    ? '#09090B'
                                    : '#FFFFFF'
                                  : theme.textSecondary,
                              },
                            ]}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Blood Group Chips */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Blood Group</Text>
                  <View style={styles.pillGrid}>
                    {BLOOD_GROUPS.map((bg) => {
                      const selected = bloodGroup === bg;
                      return (
                        <TouchableOpacity
                          key={bg}
                          style={[
                            styles.bloodPill,
                            {
                              backgroundColor: selected
                                ? isDark
                                  ? '#FAFAFA'
                                  : '#09090B'
                                : theme.card,
                              borderColor: selected
                                ? isDark
                                  ? '#FAFAFA'
                                  : '#09090B'
                                : theme.border,
                            },
                          ]}
                          onPress={() => setBloodGroup(bg)}
                        >
                          <Text
                            style={[
                              styles.bloodPillText,
                              {
                                color: selected
                                  ? isDark
                                    ? '#09090B'
                                    : '#FFFFFF'
                                  : theme.textSecondary,
                              },
                            ]}
                          >
                            {bg}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Height & Weight */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Height (cm)</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="175"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Weight (kg)</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="70"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Calculated BMI Badge */}
                {bmiInfo && (
                  <View
                    style={[
                      styles.bmiCard,
                      {
                        backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Scale size={16} color={bmiInfo.color} style={{ marginRight: 8 }} />
                    <Text style={[styles.bmiText, { color: theme.text }]}>
                      Calculated BMI:{' '}
                      <Text style={{ fontWeight: '800', color: bmiInfo.color }}>
                        {bmiInfo.value}
                      </Text>{' '}
                      ({bmiInfo.category})
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── TAB 2: CLINICAL & HISTORY ── */}
            {activeTab === 'medical' && (
              <View>
                {/* Known Allergies */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Known Allergies
                  </Text>
                  <Text style={[styles.helperText, { color: theme.textMuted }]}>
                    Tap to toggle common allergies or enter custom list below
                  </Text>
                  <View style={styles.chipsContainer}>
                    {COMMON_ALLERGIES.map((item) => {
                      const active = currentAllergies.includes(item.toLowerCase());
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? isDark
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : '#FEF2F2'
                                : theme.card,
                              borderColor: active ? '#EF4444' : theme.border,
                            },
                          ]}
                          onPress={() => toggleAllergyTag(item)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: active ? '#EF4444' : theme.textSecondary },
                            ]}
                          >
                            {active ? '✓ ' : '+ '}
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.card, borderColor: theme.border, marginTop: 8 },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. Penicillin, Peanuts, Pollen"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={allergies}
                      onChangeText={setAllergies}
                    />
                  </View>
                </View>

                {/* Chronic Diseases */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Chronic Conditions
                  </Text>
                  <Text style={[styles.helperText, { color: theme.textMuted }]}>
                    Helps AI & physicians cross-check medication safety
                  </Text>
                  <View style={styles.chipsContainer}>
                    {COMMON_CHRONIC.map((item) => {
                      const active = currentChronic.includes(item.toLowerCase());
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? isDark
                                  ? 'rgba(56, 189, 248, 0.2)'
                                  : '#F0F9FF'
                                : theme.card,
                              borderColor: active ? '#38BDF8' : theme.border,
                            },
                          ]}
                          onPress={() => toggleChronicTag(item)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: active ? '#38BDF8' : theme.textSecondary },
                            ]}
                          >
                            {active ? '✓ ' : '+ '}
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.card, borderColor: theme.border, marginTop: 8 },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. Hypertension, Diabetes Type 2"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={chronicDiseases}
                      onChangeText={setChronicDiseases}
                    />
                  </View>
                </View>

                {/* Medical Alerts */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Critical Medical Alerts
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <AlertTriangle size={16} color="#F59E0B" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. Pacemaker implanted, Diabetic, Pregnant"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={medicalAlerts}
                      onChangeText={setMedicalAlerts}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ── TAB 3: CONTACT & EMERGENCY ── */}
            {activeTab === 'contact' && (
              <View>
                {/* Phone */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <Phone size={16} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="+91 98765 43210"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Emergency Contact */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      Emergency Contact Name
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="e.g. Sarah Doe"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={emergencyName}
                        onChangeText={setEmergencyName}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      Emergency Phone
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="+91 98765 43211"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={emergencyPhone}
                        onChangeText={setEmergencyPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Address */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Street Address</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <MapPin size={16} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. 123 Healthcare Ave, Apt 4B"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>
                </View>

                {/* City, State, Pincode */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>City</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Bengaluru"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Pincode</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="560001"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={pincode}
                        onChangeText={setPincode}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.primaryButton },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.88}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: theme.primaryButtonText },
                ]}
              >
                {saving ? 'Saving...' : 'Save Health Profile'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={[styles.skipButtonText, { color: theme.textMuted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheetCard: {
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  segmentTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 5,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  scrollBody: {
    paddingVertical: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  helperText: {
    fontSize: 11,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bloodPill: {
    width: '23%',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  bloodPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
    marginBottom: 12,
  },
  bmiText: {
    fontSize: 12.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  footerActions: {
    marginTop: 10,
    gap: 4,
  },
  saveButton: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
