"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@medsync/ui';
import { Button } from '@medsync/ui';
import { Input } from '@medsync/ui';
import { ShieldCheck, Camera, Loader2, Store, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import axios from 'axios';
import { FaceVerification } from '../FaceVerification';

interface SecureOrderModalProps {
  prescriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderSuccess: () => void;
}

export default function SecureOrderModal({ prescriptionId, open, onOpenChange, onOrderSuccess }: SecureOrderModalProps) {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [pharmacyId, setPharmacyId] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState('');
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
    const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
    axios.get(`${apiUrl}/pharmacies/all`).then(res => {
      if(res.data?.data) setPharmacies(res.data.data);
    }).catch(console.error);
  }, []);

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

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionId || !pharmacyId || !address || !pin || !faceImage) return;
    setIsSubmitting(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error("Not authenticated");
      
      const formData = new FormData();
      formData.append('pharmacy_id', pharmacyId);
      formData.append('delivery_address', address);
      formData.append('pin', pin);
      formData.append('face_image', faceImage);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      await axios.post(`${apiUrl}/prescriptions/${prescriptionId}/order-online`, formData, {
        headers: { 
          Authorization: `Bearer ${session.session.access_token}`
        }
      });
      
      toast.success("Order placed successfully securely.");
      onOrderSuccess();
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> Secure Online Order
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleOrderSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Pharmacy</label>
            <select 
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={pharmacyId}
              onChange={e => setPharmacyId(e.target.value)}
            >
              <option value="" disabled>-- Select a network pharmacy --</option>
              {pharmacies.map(p => (
                <option key={p.id} value={p.user_id}>
                  {p.business_name} ({p.city})
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Address</label>
            <textarea 
              required
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter complete delivery address..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" /> 6-Digit Authorization PIN
            </label>
            <Input 
              required
              type="password" 
              placeholder="••••••" 
              className="tracking-widest font-mono text-center text-xl"
              maxLength={6}
              value={pin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" /> Live Face Verification
            </label>
            {!faceVerified ? (
              <FaceVerification 
                onVerify={async (file) => {
                  try {
                    const formData = new FormData();
                    formData.append('image', file);
                    
                    const { data: session } = await supabase.auth.getSession();
                    const token = session?.session?.access_token;
                    
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
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
              <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-emerald-500/10">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-emerald-700">Identity Verified Successfully</p>
              </div>
            )}
          </div>
          
          <Button 
            type="submit"
            className="w-full mt-4" 
            disabled={isSubmitting || !pharmacyId || !address || pin.length !== 6 || !faceImage}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize & Place Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
