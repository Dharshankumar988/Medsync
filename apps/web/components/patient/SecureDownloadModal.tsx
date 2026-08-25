"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@medsync/ui';
import { Button } from '@medsync/ui';
import { Input } from '@medsync/ui';
import { ShieldCheck, Camera, Loader2, Lock, Key } from 'lucide-react';
import { SecurityService } from '@/services/security.service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import axios from 'axios';
import { FaceVerification } from '../FaceVerification';

interface SecureDownloadModalProps {
  prescriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SecureDownloadModal({ prescriptionId, open, onOpenChange }: SecureDownloadModalProps) {
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      setPassword('');
      setPin('');
      setFaceImage(null);
      setFaceVerified(false);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, stopCamera]);

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `auth_face.jpg`, { type: 'image/jpeg' });
            setFaceImage(file);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleDownload = async () => {
    if (!prescriptionId || !password || !pin || !faceImage) return;
    setIsSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error("Not authenticated");

      const authRes = await SecurityService.authorizeDownload(
        session.session.access_token,
        prescriptionId,
        pin,
        password,
        faceImage
      );

      const authRef = authRes.data.authorization_reference;

      // Now fetch the actual download URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;

      const response = await axios.get(`${apiUrl}/prescriptions/download/${authRef}`);
      const downloadUrl = response.data.data.url;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `prescription-${prescriptionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Download started securely.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Authorization failed.");
      setFaceImage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Secure Prescription Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Prescription documents contain highly sensitive medical information. Please verify your identity.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Account Password"
                className="pl-9"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="6-Digit Authorization PIN"
                className="pl-9 tracking-widest font-mono"
                maxLength={6}
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" /> Live Face Verification
            </label>
            {!faceVerified ? (
              <FaceVerification
                onVerify={async (file) => {
                  // Hit the fast verification endpoint
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
                      setFaceVerified(true);
                      setFaceImage(file);
                      return true;
                    }
                    return false;
                  } catch (err) {
                    console.error("Verification error", err);
                    return false;
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-emerald-500/10">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-emerald-700">Identity Verified Successfully</p>
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleDownload}
            disabled={isSubmitting || !password || pin.length !== 6 || !faceImage}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize & Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
