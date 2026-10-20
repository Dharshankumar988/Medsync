import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  FileText,
  Upload,
  X,
  Lock,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  FileUp,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { patientService } from '../../services/patient.service';
import { Colors } from '../../constants/theme';
import { Button } from '../common/Button';
import { MedicalLoadingIndicator } from '../common/MedicalLoadingIndicator';
import { formatErrorMessage } from '../../lib/api';

interface UploadRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadRecordModal({
  visible,
  onClose,
  onSuccess,
}: UploadRecordModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPin('');
    setSelectedFile(null);
    setError('');
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        });
        setError('');
      }
    } catch (err: any) {
      console.warn('Document picking failed:', err);
      setError('Could not access document picker.');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!selectedFile) {
      setError('Please select a PDF document or lab image.');
      return;
    }

    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('6-digit Authorization PIN is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await patientService.uploadRecord({
        title: title.trim(),
        description: description.trim() || undefined,
        pin,
        file: selectedFile,
      });

      Alert.alert(
        'Upload Successful',
        'Your medical record has been securely encrypted and saved to your health vault.'
      );
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <View style={styles.iconCircle}>
                <FileUp size={20} color={Colors.roles.patient.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Add Medical Record</Text>
                <Text style={styles.headerSubtitle}>Encrypted Clinical File Upload</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <MedicalLoadingIndicator
                message="Encrypting & Uploading File..."
                subMessage="Hashing document and generating cryptographic proof"
                color={Colors.roles.patient.primary}
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {error ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Record Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Complete Blood Count, Chest X-Ray"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Clinical Notes / Summary (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Brief diagnostic findings or doctor notes"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* File Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Diagnostic Document (PDF / Image) *</Text>
                {selectedFile ? (
                  <View style={styles.fileSelectedBox}>
                    <View style={styles.fileIconBox}>
                      <FileCheck size={22} color="#059669" />
                    </View>
                    <View style={styles.fileMetaBox}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      <Text style={styles.fileSize}>
                        {formatFileSize(selectedFile.size)} • Ready for upload
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeFileBtn}
                      onPress={() => setSelectedFile(null)}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={handlePickDocument}
                    activeOpacity={0.8}
                  >
                    <Upload size={22} color={Colors.roles.patient.primary} />
                    <Text style={styles.pickerBtnText}>Choose File from Device</Text>
                    <Text style={styles.pickerHint}>Supports PDF, PNG, JPG (up to 25MB)</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* PIN Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Authorization PIN (6 digits) *</Text>
                <View style={styles.pinWrapper}>
                  <Lock size={18} color="#64748B" style={styles.pinIcon} />
                  <TextInput
                    style={styles.pinInput}
                    placeholder="Enter 6-digit PIN to sign upload"
                    placeholderTextColor="#94A3B8"
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="numeric"
                    maxLength={6}
                    secureTextEntry
                  />
                </View>
                <Text style={styles.pinHint}>
                  Your Authorization PIN is required to generate the verifiable cryptographic signature.
                </Text>
              </View>

              {/* Submit CTA */}
              <Button
                title="Encrypt & Upload Record"
                onPress={handleSubmit}
                style={styles.submitBtn}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  pickerBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  pickerHint: {
    fontSize: 11,
    color: '#64748B',
  },
  fileSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    gap: 10,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMetaBox: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  fileSize: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  pinWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  pinIcon: {
    marginRight: 8,
  },
  pinInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    letterSpacing: 2,
  },
  pinHint: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: 6,
    backgroundColor: '#2563EB',
  },
});
