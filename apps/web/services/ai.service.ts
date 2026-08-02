import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

let _aiTokenCache: string | null = null;
let _aiTokenExpiry = 0;

const getAuthHeaders = async () => {
  const now = Date.now();
  if (_aiTokenCache && now < _aiTokenExpiry) {
    return {
      'Authorization': `Bearer ${_aiTokenCache}`,
      'Content-Type': 'application/json'
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    _aiTokenCache = session.access_token;
    _aiTokenExpiry = now + 4 * 60 * 1000;
  }
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json'
  };
};

export const aiService = {
  // Standard Chat
  async chat(role: 'doctor' | 'patient' | 'pharmacy' | 'admin', message: string, sessionId?: string) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${API_BASE_URL}/ai/${role}/chat`, {
      message,
      session_id: sessionId || null
    }, { headers });
    return res.data;
  },

  // Streaming Chat (SSE via Fetch to allow reading the stream)
  async streamChat(
    role: 'doctor' | 'patient' | 'pharmacy' | 'admin', 
    message: string, 
    sessionId: string | null,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: any) => void,
    signal?: AbortSignal
  ) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/ai/${role}/chat/stream`, {
        method: 'POST',
        headers: headers as any,
        body: JSON.stringify({ message, session_id: sessionId || null }),
        signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error("ReadableStream not yet supported in this browser.");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(decoder.decode(value, { stream: true }));
      }
      onDone();
    } catch (err) {
      onError(err);
    }
  },

  // Session Management
  async getSessions() {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${API_BASE_URL}/ai/sessions`, { headers });
    return res.data;
  },

  async getSessionMessages(sessionId: string) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${API_BASE_URL}/ai/sessions/${sessionId}/messages`, { headers });
    return res.data;
  },

  async deleteSession(sessionId: string) {
    const headers = await getAuthHeaders();
    const res = await axios.delete(`${API_BASE_URL}/ai/sessions/${sessionId}`, { headers });
    return res.data;
  },

  async togglePin(sessionId: string, isPinned: boolean) {
    const headers = await getAuthHeaders();
    const res = await axios.patch(`${API_BASE_URL}/ai/sessions/${sessionId}/pin`, { is_pinned: isPinned }, { headers });
    return res.data;
  },

  // Image Analysis
  async analyzeImage(file: File) {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await axios.post(`${API_BASE_URL}/ai/analyze-image`, formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }
};
