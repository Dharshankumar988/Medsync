import api from '../lib/api';
import { supabase } from '../lib/supabase';
import EventSource from 'react-native-sse';
import * as FileSystem from 'expo-file-system';

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'https://medsync-backend-rktc.onrender.com';
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

const API_BASE_URL = getBaseUrl();

export const aiService = {
  // Direct non-streaming chat via verified FastAPI /ai/pulse/chat
  chat: async (
    role: 'doctor' | 'patient' | 'pharmacy' | 'admin',
    message: string,
    sessionId?: string | null
  ) => {
    const res = await api.post('/ai/pulse/chat', {
      message,
      session_id: sessionId || null,
    });
    return res.data?.data;
  },

  // Streaming Chat via verified FastAPI /ai/pulse/chat/stream
  streamChat(
    role: 'doctor' | 'patient' | 'pharmacy' | 'admin',
    message: string,
    sessionId: string | null,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return onError(new Error('Not authenticated'));

      const es = new EventSource(`${API_BASE_URL}/ai/pulse/chat/stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, session_id: sessionId || null }),
        lineEndingCharacter: '\n',
      } as any);

      es.addEventListener('message', (event: any) => {
        if (event.data) {
          onChunk(event.data);
        }
      });

      es.addEventListener('error', (event: any) => {
        if (event.type === 'error' && event.message) {
          onError(event.message);
        }
        es.close();
        onDone();
      });

      es.addEventListener('close', () => {
        onDone();
      });
    }).catch(onError);
  },

  // Image analysis for medical imaging scans
  async analyzeImage(imageUri: string, scanType = 'bone') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    try {
      const response = await FileSystem.uploadAsync(
        `${API_BASE_URL}/ai/analyze-image`,
        imageUri,
        {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          parameters: {
            scan_type: scanType,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      return JSON.parse(response.body);
    } catch (e) {
      console.error('Image analysis error:', e);
      throw e;
    }
  },
};
