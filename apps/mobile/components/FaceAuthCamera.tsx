import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

/**
 * Note: To fully implement MediaPipe face detection with Vision Camera, 
 * you typically need a frame processor plugin like react-native-vision-camera-face-detector.
 * This component provides the structural UX for MediaPipe integration and liveness guidance.
 */

interface FaceAuthCameraProps {
  onFaceDetected: (photoPath: string, livenessPassed: boolean, challengeType?: string) => void;
  onCancel: () => void;
}

export const FaceAuthCamera: React.FC<FaceAuthCameraProps> = ({ onFaceDetected, onCancel }) => {
  const device = useCameraDevice('front');
  const [hasPermission, setHasPermission] = useState(false);
  const [challenge, setChallenge] = useState<'SMILE' | 'OPEN_MOUTH'>('SMILE');
  
  const cameraRef = React.useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
    // Pick a random challenge
    setChallenge(Math.random() > 0.5 ? 'SMILE' : 'OPEN_MOUTH');
  }, []);

  const handleCapture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off'
      });
      // We assume liveness is passed here on frontend, actual validation is on backend now
      onFaceDetected(photo.path, true, challenge);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required.</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No front camera found.</Text>
      </View>
    );
  }

  const instructions = challenge === 'SMILE' 
    ? "Please SMILE and tap capture" 
    : "Please OPEN YOUR MOUTH and tap capture";

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      
      <View style={styles.overlay}>
        <View style={styles.ovalMask} />
      </View>

      <View style={styles.uiContainer}>
        <Text style={styles.guidanceText}>{instructions}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <Text style={styles.buttonText}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ovalMask: {
    width: 250,
    height: 350,
    borderRadius: 150,
    borderWidth: 4,
    borderColor: '#4ade80', // Green when aligned, could be dynamic based on frameProcessor
    backgroundColor: 'transparent',
  },
  uiContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  guidanceText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
  },
  captureButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
