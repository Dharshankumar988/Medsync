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

  // Streaming Chat via verified FastAPI /ai/pulse/chat/stream with robust XHR and fallback
  streamChat(
    role: 'doctor' | 'patient' | 'pharmacy' | 'admin',
    message: string,
    sessionId: string | null,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ) {
    let completed = false;
    let receivedAnyText = false;

    const fallbackToDirectChat = () => {
      if (completed) return;
      completed = true;
      aiService
        .chat(role, message, sessionId)
        .then((res) => {
          const reply = res?.reply || res?.message || 'I am ready to assist with your medical questions.';
          if (!receivedAnyText) {
            onChunk(reply);
          }
          onDone();
        })
        .catch((err) => {
          onError(err);
          onDone();
        });
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!session) return onError(new Error('Not authenticated'));

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/ai/pulse/chat/stream`);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.setRequestHeader('Content-Type', 'application/json');

        let lastIndex = 0;

        xhr.onprogress = () => {
          const fullText = xhr.responseText || '';
          if (fullText.length > lastIndex) {
            const newChunk = fullText.slice(lastIndex);
            lastIndex = fullText.length;
            receivedAnyText = true;
            onChunk(newChunk);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            completed = true;
            if (xhr.responseText && xhr.responseText.length > lastIndex) {
              const remaining = xhr.responseText.slice(lastIndex);
              receivedAnyText = true;
              onChunk(remaining);
            }
            if (!receivedAnyText) {
              fallbackToDirectChat();
            } else {
              onDone();
            }
          } else {
            fallbackToDirectChat();
          }
        };

        xhr.onerror = () => {
          fallbackToDirectChat();
        };

        xhr.ontimeout = () => {
          fallbackToDirectChat();
        };

        xhr.timeout = 30000;
        xhr.send(JSON.stringify({ message, session_id: sessionId || null }));
      })
      .catch((err) => {
        fallbackToDirectChat();
      });
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

  async analyzeMedicalImage(imageUri: string, _prompt?: string) {
    return aiService.analyzeImage(imageUri, 'medical_scan');
  },
};
