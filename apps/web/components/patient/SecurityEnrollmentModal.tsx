"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSecurityEnrollment } from '@/hooks/useSecurityEnrollment';
import { SecurityService } from '@/services/security.service';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, ShieldCheck, Camera, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { Button, Input } from '@medsync/ui';

export default function SecurityEnrollmentModal() {
  const [userId, setUserId] = useState<string>();
  const [role, setRole] = useState<string>();
  
  useEffect(() => {
    authService.me().then(u => {
      setUserId(u.id);
      setRole(u.role.toLowerCase());
    }).catch(() => {});
  }, []);

  const { status, isLoading: isStatusLoading } = useSecurityEnrollment(userId, role);
  
  const [step, setStep] = useState<number>(1);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [faceImages, setFaceImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (status === 'PIN_CREATED') {
      setStep(2);
    }
  }, [status]);

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
    if (step === 2 && !stream) {
      startCamera();
    }
    return () => { stopCamera(); };
  }, [step, stopCamera, stream]);

  if (role !== 'patient' || isStatusLoading || status === 'COMPLETED') {
    return null;
  }

  const handlePinSubmit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinError('PIN must be 6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('PINs do not match.');
      return;
    }
    setPinError('');
    setIsSubmitting(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        await SecurityService.enrollPin(session.session.access_token, pin);
        setStep(2);
      }
    } catch (err: any) {
      setPinError(err.response?.data?.detail || 'Failed to enroll PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `face_${faceImages.length + 1}.jpg`, { type: 'image/jpeg' });
            setFaceImages(prev => [...prev, file]);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleFaceSubmit = async () => {
    if (faceImages.length < 3) return;
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        await SecurityService.enrollFace(session.session.access_token, faceImages);
        window.location.reload(); // Reload to remove modal and refresh status
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to enroll face. Make sure your face is clearly visible.');
      setFaceImages([]); // Reset on failure
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md px-4">
      <div className="w-full max-w-md bg-card p-6 rounded-2xl shadow-xl border border-border/50 relative overflow-hidden">
        
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Secure Your Prescriptions</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            We need to securely enroll your Authorization PIN and face to protect sensitive prescription access.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Create 6-Digit Authorization PIN
            </h3>
            <p className="text-sm text-muted-foreground">This PIN is used to authorize downloading prescriptions and offline pharmacy dispensing.</p>
            
            <div>
              <Input 
                type="password" 
                placeholder="Enter 6-digit PIN" 
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-xl tracking-widest"
              />
            </div>
            <div>
              <Input 
                type="password" 
                placeholder="Confirm 6-digit PIN" 
                maxLength={6}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-xl tracking-widest"
              />
            </div>
            
            {pinError && <p className="text-destructive text-sm text-center">{pinError}</p>}
            
            <Button className="w-full" onClick={handlePinSubmit} disabled={isSubmitting || pin.length !== 6 || confirmPin.length !== 6}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Face Verification Enrollment
            </h3>
            <p className="text-sm text-muted-foreground">
              Please capture 3 samples (e.g., neutral, slight angle, different expression).
              This protects you from unauthorized online pharmacy orders.
            </p>
            
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border border-white/50 ${faceImages.length > i ? 'bg-primary border-primary' : 'bg-black/50'}`} />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {faceImages.length < 3 ? (
                <Button className="w-full flex gap-2" onClick={captureFace}>
                  <Camera className="w-4 h-4" /> Capture Sample {faceImages.length + 1}/3
                </Button>
              ) : (
                <Button className="w-full flex gap-2" onClick={handleFaceSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Enroll Face</>}
                </Button>
              )}
            </div>
            {faceImages.length > 0 && faceImages.length < 3 && (
              <Button variant="ghost" className="w-full text-xs" onClick={() => setFaceImages([])}>Reset Captures</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
