'use client';

import React from 'react';
import { FaceVerification } from '@/components/FaceVerification';
import axios from 'axios';
import { supabase } from '@/lib/supabase';

export default function VerifyTestPage() {
  const [status, setStatus] = React.useState<string | null>(null);

  const handleVerify = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const res = await axios.post(`${apiUrl}/security/verify-face`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.verified) {
        setStatus('Verified successfully!');
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      setStatus('Verification failed');
      return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-lg bg-slate-900 rounded-xl shadow-2xl p-6 border border-slate-800">
        <h1 className="text-2xl font-bold mb-2">Biometric Verification Test</h1>
        <p className="text-slate-400 mb-6 text-sm">
          This page tests the Hybrid Edge architecture using MediaPipe Face Detection and MobileFaceNet.
        </p>
        
        <FaceVerification 
          onVerify={handleVerify} 
          onSuccess={() => setStatus('Access Granted. Face Matches Profile.')}
          onError={(err) => setStatus(`Error: ${err}`)}
        />
        
        {status && (
          <div className="mt-6 p-4 rounded bg-slate-800 text-center font-medium">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
