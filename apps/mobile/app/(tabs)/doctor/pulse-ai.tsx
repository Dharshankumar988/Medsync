import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Brain,
  MessageSquare,
  Sparkles,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { PulseAIChat } from '../../../components/pulse-ai/PulseAIChat';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { Colors } from '../../../constants/theme';
import { Button } from '../../../components/common/Button';
import { Card, CardContent } from '../../../components/common/Card';
import { aiService } from '../../../services/ai.service';

type ActiveMode = 'CHAT' | 'IMAGE_ANALYSIS';
type ScanType = 'bone' | 'brain' | 'kidney' | 'skin';

interface ScanTypeOption {
  id: ScanType;
  label: string;
  description: string;
}

const SCAN_TYPES: ScanTypeOption[] = [
  { id: 'bone', label: 'Bone X-Ray', description: 'Fracture & bone abnormality detection' },
  { id: 'brain', label: 'Brain MRI', description: 'Tumor & tissue anomaly analysis' },
  { id: 'kidney', label: 'Kidney CT', description: 'Renal cyst, tumor & stone screening' },
  { id: 'skin', label: 'Dermatology / Skin', description: 'Lesion & melanoma classification' },
];

export default function DoctorPulseAI() {
  const [mode, setMode] = useState<ActiveMode>('CHAT');
  const [scanType, setScanType] = useState<ScanType>('bone');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handlePickImage = async (useCamera = false) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      };

      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to capture diagnostic scans.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
        setAnalysisResult(null);
        setAnalysisError(null);
      }
    } catch (err: any) {
      console.error('Error picking scan image:', err);
      Alert.alert('Image Selection Failed', err.message || 'Could not select image.');
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedImageUri) {
      Alert.alert('Image Required', 'Please select or capture a medical scan image first.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const response = await aiService.analyzeImage(selectedImageUri, scanType);
      if (response && response.data) {
        setAnalysisResult(response.data);
      } else if (response && response.error) {
        setAnalysisError(response.error.message || 'Diagnostic model failed to analyze scan.');
      } else {
        setAnalysisResult(response);
      }
    } catch (err: any) {
      console.error('Diagnostic analysis error:', err);
      const detail = err.response?.data?.detail || err.message || 'Diagnostic service unavailable or timed out.';
      setAnalysisError(detail);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <RoleGuard allowedRole="doctor">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <Stack.Screen
          options={{
            title: 'PULSE AI (Doctor)',
            headerShown: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerShadowVisible: false,
          }}
        />

        {/* Mode Selector Tab Bar */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'CHAT' && styles.modeTabActive]}
            onPress={() => setMode('CHAT')}
          >
            <MessageSquare size={16} color={mode === 'CHAT' ? Colors.roles.doctor.primary : '#64748B'} />
            <Text style={[styles.modeTabText, mode === 'CHAT' && styles.modeTabTextActive]}>
              Clinical Assistant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'IMAGE_ANALYSIS' && styles.modeTabActive]}
            onPress={() => setMode('IMAGE_ANALYSIS')}
          >
            <Brain size={16} color={mode === 'IMAGE_ANALYSIS' ? Colors.roles.doctor.primary : '#64748B'} />
            <Text style={[styles.modeTabText, mode === 'IMAGE_ANALYSIS' && styles.modeTabTextActive]}>
              Diagnostic Imaging
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'CHAT' ? (
          <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 8 : 0 }}>
            <PulseAIChat role="doctor" />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Clinical Decision Support Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Info size={16} color="#0284C7" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.disclaimerText}>
                Clinical Decision Support: AI predictions and summaries assist physician evaluation and do not replace licensed radiological review.
              </Text>
            </View>

            {/* Scan Type Selector */}
            <Text style={styles.sectionTitle}>Select Scan Type</Text>
            <View style={styles.scanTypesGrid}>
              {SCAN_TYPES.map((st) => {
                const isSelected = st.id === scanType;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.scanTypeCard, isSelected && styles.scanTypeCardActive]}
                    onPress={() => {
                      setScanType(st.id);
                      setAnalysisResult(null);
                    }}
                  >
                    <Text style={[styles.scanTypeLabel, isSelected && styles.scanTypeLabelActive]}>
                      {st.label}
                    </Text>
                    <Text style={styles.scanTypeDesc}>{st.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Image Preview & Selection */}
            <Text style={styles.sectionTitle}>Medical Scan Image</Text>
            {selectedImageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} resizeMode="contain" />
                <View style={styles.previewActions}>
                  <Button
                    title="Change Scan"
                    size="sm"
                    variant="outline"
                    onPress={() => handlePickImage(false)}
                    style={{ marginRight: 8 }}
                  />
                  <Button
                    title="Take Photo"
                    size="sm"
                    variant="outline"
                    onPress={() => handlePickImage(true)}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Brain size={44} color="#94A3B8" />
                <Text style={styles.uploadTitle}>No Scan Selected</Text>
                <Text style={styles.uploadSub}>
                  Upload a high-resolution JPEG, PNG, or WebP scan (Max 5MB)
                </Text>

                <View style={styles.uploadBtnRow}>
                  <Button
                    title="Select From Library"
                    size="sm"
                    onPress={() => handlePickImage(false)}
                    style={{ marginRight: 8 }}
                  />
                  <Button
                    title="Camera Capture"
                    size="sm"
                    variant="outline"
                    onPress={() => handlePickImage(true)}
                  />
                </View>
              </View>
            )}

            {/* Analysis Action */}
            {selectedImageUri && (
              <Button
                title={analyzing ? 'Analyzing with Diagnostic AI...' : 'Run Diagnostic Analysis'}
                loading={analyzing}
                onPress={handleRunAnalysis}
                style={styles.runAnalysisBtn}
              />
            )}

            {/* Error Message */}
            {analysisError && (
              <View style={styles.errorBox}>
                <AlertTriangle size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Analysis Unavailable</Text>
                  <Text style={styles.errorDesc}>{analysisError}</Text>
                </View>
              </View>
            )}

            {/* Analysis Results Display */}
            {analysisResult && (
              <Card style={styles.resultCard}>
                <CardContent>
                  <View style={styles.resultHeader}>
                    <View style={styles.resultHeaderLeft}>
                      <CheckCircle2 size={20} color="#059669" />
                      <Text style={styles.resultHeaderTitle}>Analysis Report</Text>
                    </View>
                    {analysisResult.clinical_summary?.urgency ? (
                      <View
                        style={[
                          styles.urgencyBadge,
                          analysisResult.clinical_summary.urgency === 'urgent'
                            ? styles.urgencyBadgeUrgent
                            : styles.urgencyBadgeRoutine,
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyText,
                            {
                              color:
                                analysisResult.clinical_summary.urgency === 'urgent'
                                  ? '#DC2626'
                                  : '#059669',
                            },
                          ]}
                        >
                          {analysisResult.clinical_summary.urgency.toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Primary Model Prediction */}
                  {analysisResult.prediction && (
                    <View style={styles.predictionBox}>
                      <Text style={styles.predictionLabel}>Model Classification</Text>
                      <Text style={styles.predictionDiagnosis}>
                        {analysisResult.prediction.diagnosis ||
                          analysisResult.prediction.predicted_class ||
                          'Analysis Completed'}
                      </Text>
                      {analysisResult.prediction.confidence !== undefined ? (
                        <Text style={styles.predictionConfidence}>
                          Confidence:{' '}
                          {(analysisResult.prediction.confidence * 100).toFixed(1)}%
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Clinical Summary */}
                  {analysisResult.clinical_summary?.summary && (
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>Clinical Summary</Text>
                      <Text style={styles.summaryText}>{analysisResult.clinical_summary.summary}</Text>
                    </View>
                  )}

                  {/* Key Findings */}
                  {Array.isArray(analysisResult.clinical_summary?.key_findings) &&
                  analysisResult.clinical_summary.key_findings.length > 0 ? (
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>Key Findings</Text>
                      {analysisResult.clinical_summary.key_findings.map((f: string, idx: number) => (
                        <Text key={idx} style={styles.findingItem}>
                          • {f}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {/* Recommended Next Steps */}
                  {Array.isArray(analysisResult.clinical_summary?.recommended_next_steps) &&
                  analysisResult.clinical_summary.recommended_next_steps.length > 0 ? (
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>Recommended Next Steps</Text>
                      {analysisResult.clinical_summary.recommended_next_steps.map((s: string, idx: number) => (
                        <Text key={idx} style={styles.stepItem}>
                          {idx + 1}. {s}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {/* Disclaimer */}
                  <Text style={styles.resultDisclaimer}>
                    {analysisResult.clinical_summary?.disclaimer ||
                      'This analysis is generated by AI decision-support models for practitioner reference only.'}
                  </Text>
                </CardContent>
              </Card>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#E0F2FE',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginLeft: 6,
  },
  modeTabTextActive: {
    color: Colors.roles.doctor.primary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 4,
  },
  scanTypesGrid: {
    marginBottom: 16,
  },
  scanTypeCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  scanTypeCardActive: {
    borderColor: Colors.roles.doctor.primary,
    backgroundColor: '#F0F9FF',
  },
  scanTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  scanTypeLabelActive: {
    color: Colors.roles.doctor.primary,
  },
  scanTypeDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 8,
  },
  previewActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  uploadPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  uploadSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  uploadBtnRow: {
    flexDirection: 'row',
  },
  runAnalysisBtn: {
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorDesc: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  resultCard: {
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 6,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyBadgeRoutine: {
    backgroundColor: '#ECFDF5',
  },
  urgencyBadgeUrgent: {
    backgroundColor: '#FEE2E2',
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  predictionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  predictionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  predictionDiagnosis: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  predictionConfidence: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  summarySection: {
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  findingItem: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 3,
    paddingLeft: 4,
  },
  stepItem: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 3,
  },
  resultDisclaimer: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
});
