import axios from 'axios';
import { supabase } from '../lib/supabase';
import EventSource from "react-native-sse";
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  // Mobile needs absolute IPs, not localhost
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':')[0] || '192.168.1.100';
  return `http://${localhost}:8000/api/v1`;
};

const API_BASE_URL = getBaseUrl();

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json'
  };
};

export const aiService = {
  // Streaming Chat via react-native-sse
  streamChat(
    role: 'doctor' | 'patient' | 'pharmacy' | 'admin', 
    message: string, 
    sessionId: string | null,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return onError(new Error("Not authenticated"));

      const es = new EventSource(`${API_BASE_URL}/ai/${role}/chat/stream`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, session_id: sessionId || null }),
      });

      es.addEventListener("message", (event: any) => {
        if (event.data) {
          onChunk(event.data);
        }
      });

      es.addEventListener("error", (event: any) => {
        if (event.type === "error" && event.message) {
          onError(event.message);
        }
        es.close();
        onDone();
      });

      es.addEventListener("close", () => {
        onDone();
      });
    }).catch(onError);
  },

  // Standard Image Analysis using expo-file-system
  async analyzeImage(imageUri: string, scanType: string = 'bone') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    try {
      const response = await FileSystem.uploadAsync(
        `${API_BASE_URL}/ai/predict`,
        imageUri,
        {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          parameters: {
            scan_type: scanType
          },
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );
      
      return JSON.parse(response.body);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};
