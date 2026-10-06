"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@medsync/ui';
import { Button } from '@medsync/ui';
import { Input } from '@medsync/ui';
import { Lock, Download, KeyRound, Loader2, Camera, UserSquare2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import axios from 'axios';

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
  const [currentPassword, setCurrentPassword] = useState('');
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

  const handleForgotPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || newPin !== confirmNewPin) {
      toast.error("New PIN must be 6 digits and match.");
      return false;
    }
    if (!currentPassword) {
      toast.error("Please enter your current account password.");
      return false;
    }
    setIsResetting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const formData = new FormData();
      formData.append('current_password', currentPassword);
      formData.append('new_pin', newPin);

      await axios.post(`${apiUrl}/security/reset-pin-with-password`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("PIN reset successfully! You can now use it to authorize the download.");
      setIsForgotPin(false);
      setPin('');
      setCurrentPassword('');
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
          <form onSubmit={handleForgotPinSubmit} className="space-y-6 py-2">
            <p className="text-sm text-muted-foreground">
              Verify your identity using your account password to securely create a new PIN.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Account Password</label>
                <Input 
                  type="password" 
                  placeholder="Enter your password" 
                  className="h-12"
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
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
                    required
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
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-2 space-y-3">
              <Button type="submit" className="w-full" disabled={isResetting || newPin.length !== 6 || newPin !== confirmNewPin || !currentPassword}>
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Reset PIN
              </Button>
            
              <Button variant="outline" className="w-full" type="button" onClick={() => setIsForgotPin(false)} disabled={isResetting}>
                Cancel Reset
              </Button>
            </div>
          </form>
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
