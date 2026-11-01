import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRICS_KEY = 'medsync_biometrics_enabled';

export const biometricsService = {
  /**
   * Check if the device has biometric hardware and enrolled biometrics (Face ID / Fingerprint)
   */
  async isAvailable(): Promise<{ available: boolean; biometryType?: 'FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | 'MULTIPLE' | 'NONE' }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return { available: false, biometryType: 'NONE' };
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return { available: true, biometryType: 'FACIAL_RECOGNITION' };
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return { available: true, biometryType: 'FINGERPRINT' };
      }
      return { available: true, biometryType: 'MULTIPLE' };
    } catch (e) {
      console.warn('Error checking biometrics availability:', e);
      return { available: false, biometryType: 'NONE' };
    }
  },

  /**
   * Check user preference whether biometrics is enabled in-app
   */
  async isEnabled(): Promise<boolean> {
    try {
      const stored = await SecureStore.getItemAsync(BIOMETRICS_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Set user preference
   */
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRICS_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('Error setting biometrics preference:', e);
    }
  },

  /**
   * Prompt biometric authentication using the phone's already set Face ID / Fingerprint
   */
  async authenticate(promptMessage = 'Authenticate with Face ID or Fingerprint'): Promise<{ success: boolean; error?: string }> {
    try {
      const { available } = await this.isAvailable();
      if (!available) {
        return { success: false, error: 'Biometrics not available or enrolled on this device' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use MedSync Account Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || 'Authentication cancelled' };
    } catch (e: any) {
      console.warn('Biometric authentication failed:', e);
      return { success: false, error: e?.message || 'Biometric authentication failed' };
    }
  },
};
