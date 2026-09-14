"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@medsync/ui';
import { Button } from '@medsync/ui';
import { Input } from '@medsync/ui';
import { Lock, Download, KeyRound, Loader2, Camera, UserSquare2 } from 'lucide-react';
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
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forgot PIN Flow State
  const [isForgotPin, setIsForgotPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (open) {
      setPin('');
      setIsForgotPin(false);
      setNewPin('');
      setConfirmNewPin('');
    }
  }, [open]);

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionId || pin.length !== 6) return;
    setIsSubmitting(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error("Not authenticated");
      
      const formData = new FormData();
      formData.append('pin', pin);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const res = await axios.post(`${apiUrl}/prescriptions/${prescriptionId}/authorize-download`, formData, {
        headers: { Authorization: `Bearer ${session.session.access_token}` }
      });
      
      if (res.data?.data?.authorization_reference) {
        const ref = res.data.data.authorization_reference;
        const dlRes = await axios.get(`${apiUrl}/prescriptions/download/${ref}`, {
          headers: { Authorization: `Bearer ${session.session.access_token}` }
        });
        
        if (dlRes.data?.data?.url) {
          window.open(dlRes.data.data.url, '_blank');
          toast.success("Download authorized successfully.");
          onOpenChange(false);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Authorization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPinSubmit = async (file: File) => {
    if (newPin.length !== 6 || newPin !== confirmNewPin) {
      toast.error("New PIN must be 6 digits and match.");
      return false;
    }
    setIsResetting(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('new_pin', newPin);
      
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      await axios.post(`${apiUrl}/security/change-pin-face`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("PIN reset successfully! You can now use it to authorize the download.");
      setIsForgotPin(false);
      setPin('');
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to reset PIN.");
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isForgotPin ? (
              <><UserSquare2 className="w-5 h-5 text-primary" /> Reset Authorization PIN</>
            ) : (
              <><Lock className="w-5 h-5 text-primary" /> Secure Download Authorization</>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {isForgotPin ? (
          <div className="space-y-6 py-2">
            <p className="text-sm text-muted-foreground">
              Verify your identity using your enrolled Face ID to securely create a new PIN.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New 6-Digit PIN</label>
                  <Input 
                    type="password" 
                    placeholder="••••••" 
                    className="tracking-widest font-mono text-center text-lg h-12"
                    maxLength={6}
                    value={newPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm PIN</label>
                  <Input 
                    type="password" 
                    placeholder="••••••" 
                    className="tracking-widest font-mono text-center text-lg h-12"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
              
              {(newPin.length === 6 && newPin === confirmNewPin) ? (
                <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-primary">
                    <Camera className="w-4 h-4" /> Verify Face to Confirm Reset
                  </label>
                  <FaceVerification onVerify={handleForgotPinSubmit} />
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg border text-center text-sm text-muted-foreground">
                  Enter and confirm your new 6-digit PIN to enable the camera.
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => setIsForgotPin(false)} disabled={isResetting}>
                Cancel Reset
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDownloadSubmit} className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Downloading a prescription requires authorization to ensure your medical records remain private and secure.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" /> Authorization PIN
                </label>
                <button type="button" onClick={() => setIsForgotPin(true)} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Forgot PIN?
                </button>
              </div>
              <Input 
                required
                type="password" 
                placeholder="••••••" 
                className="tracking-widest font-mono text-center text-2xl h-14 rounded-xl shadow-sm border-2 focus-visible:border-primary focus-visible:ring-primary/20"
                maxLength={6}
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            
            <Button 
              type="submit"
              className="w-full h-12 rounded-xl text-md shadow-md" 
              disabled={isSubmitting || pin.length !== 6}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Download className="w-4 h-4 mr-2" /> Authorize & Download</>}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
