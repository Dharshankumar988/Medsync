"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@medsync/ui';
import { Button } from '@medsync/ui';
import { Input } from '@medsync/ui';
import { Store, Lock, KeyRound, Loader2, UserSquare2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
});

interface SecureOrderModalProps {
  prescriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderSuccess: () => void;
  initialPharmacyId?: string | null;
}

export default function SecureOrderModal({
  prescriptionId,
  open,
  onOpenChange,
  onOrderSuccess,
  initialPharmacyId,
}: SecureOrderModalProps) {
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
      if (initialPharmacyId) {
        setPharmacyId(initialPharmacyId);
      }
    }
  }, [open, initialPharmacyId]);

  useEffect(() => {
    api
      .get('/api/v1/pharmacies/all')
      .then((res) => {
        if (res.data?.data) setPharmacies(res.data.data);
      })
      .catch(console.error);
  }, []);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionId || !pharmacyId || !address || !latitude || pin.length !== 6) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('pharmacy_id', pharmacyId);
      formData.append('delivery_address', address);
      formData.append('delivery_latitude', latitude.toString());
      formData.append('delivery_longitude', longitude.toString());
      formData.append('pin', pin);

      await api.post(`/api/v1/prescriptions/${prescriptionId}/order-online`, formData);

      toast.success('Order placed successfully.');
      onOrderSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Authorization failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || newPin !== confirmNewPin) {
      toast.error('New PIN must be 6 digits and match.');
      return;
    }
    if (!currentPassword) {
      toast.error('Please enter your current account password.');
      return;
    }
    setIsResetting(true);
    try {
      const formData = new FormData();
      formData.append('current_password', currentPassword);
      formData.append('new_pin', newPin);

      await api.post('/api/v1/security/reset-pin-with-password', formData);

      toast.success('PIN reset successfully! You can now use it.');
      setIsForgotPin(false);
      setPin('');
      setCurrentPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to reset PIN.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border/80 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {isForgotPin ? (
              <>
                <UserSquare2 className="w-5 h-5 text-primary" /> Reset Authorization PIN
              </>
            ) : (
              <>
                <Store className="w-5 h-5 text-primary" /> Secure Online Order
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isForgotPin ? (
          <form onSubmit={handleForgotPinSubmit} className="space-y-5 py-2">
            <p className="text-sm text-muted-foreground">
              Verify your identity using your account password to create a new 6-digit authorization PIN.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Current Account Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="h-11 rounded-xl bg-background border-border/80"
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">New PIN</label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    className="tracking-widest font-mono text-center text-lg h-11 rounded-xl bg-background border-border/80"
                    maxLength={6}
                    value={newPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPin(e.target.value.replace(/\D/g, ''))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm PIN</label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    className="tracking-widest font-mono text-center text-lg h-11 rounded-xl bg-background border-border/80"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setConfirmNewPin(e.target.value.replace(/\D/g, ''))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={
                  isResetting ||
                  newPin.length !== 6 ||
                  newPin !== confirmNewPin ||
                  !currentPassword
                }
              >
                {isResetting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Reset PIN
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl border-border/80"
                onClick={() => setIsForgotPin(false)}
                disabled={isResetting}
              >
                Cancel Reset
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOrderSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Select Network Pharmacy</label>
              <select
                required
                className="flex h-11 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
                value={pharmacyId}
                onChange={(e) => setPharmacyId(e.target.value)}
              >
                <option value="" disabled>
                  -- Select a network pharmacy --
                </option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.user_id}>
                    {p.business_name} ({p.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Delivery Point on Map</label>
              <LocationPickerMap
                initialLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
                onLocationSelect={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onAddressFound={(addr) => {
                  setAddress(addr);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Delivery Address Details</label>
              <textarea
                required
                className="flex min-h-[75px] w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm resize-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door number, apartment, floor, landmark instructions..."
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <Lock className="w-4 h-4 text-primary" /> Authorization PIN
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPin(true)}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Forgot PIN?
                </button>
              </div>
              <Input
                required
                type="password"
                placeholder="••••••"
                className="tracking-widest font-mono text-center text-xl h-12 rounded-xl bg-background border border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                maxLength={6}
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPin(e.target.value.replace(/\D/g, ''))
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-3"
              disabled={
                isSubmitting ||
                !pharmacyId ||
                !address ||
                !latitude ||
                pin.length !== 6
              }
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Authorize & Place Order
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
