"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@medsync/ui';
import { Button } from '@medsync/ui';
import { Input } from '@medsync/ui';
import { Store, Lock, KeyRound, Loader2, Camera, UserSquare2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import axios from 'axios';
import { FaceVerification } from '../FaceVerification';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
});

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
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
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

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
    const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
    axios.get(`${apiUrl}/pharmacies/all`).then(res => {
      if(res.data?.data) setPharmacies(res.data.data);
    }).catch(console.error);
  }, []);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionId || !pharmacyId || !address || !latitude || pin.length !== 6) return;
    setIsSubmitting(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error("Not authenticated");
      
      const formData = new FormData();
      formData.append('pharmacy_id', pharmacyId);
      formData.append('delivery_address', address);
      formData.append('delivery_latitude', latitude.toString());
      formData.append('delivery_longitude', longitude.toString());
      formData.append('pin', pin);
      
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
      
      toast.success("PIN reset successfully! You can now use it.");
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isForgotPin ? (
              <><UserSquare2 className="w-5 h-5 text-primary" /> Reset Authorization PIN</>
            ) : (
              <><Store className="w-5 h-5 text-primary" /> Secure Online Order</>
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
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Reset PIN
              </Button>
            </div>
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => setIsForgotPin(false)} disabled={isResetting}>
                Cancel Reset
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOrderSubmit} className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Select Pharmacy</label>
              <select 
                required
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
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
              <label className="text-sm font-medium text-foreground ml-1">Delivery Location</label>
              <LocationPickerMap 
                onLocationSelect={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onAddressFound={(addr) => {
                  if (!address) setAddress(addr);
                }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Delivery Address Details</label>
              <textarea 
                required
                className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm resize-none"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter complete delivery address (building, floor, etc.)..."
              />
            </div>
            
            <div className="space-y-2 pt-2">
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
              />
            </div>
            
            <Button 
              type="submit"
              className="w-full h-12 rounded-xl text-md shadow-md mt-4" 
              disabled={isSubmitting || !pharmacyId || !address || !latitude || pin.length !== 6}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize & Place Order"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
