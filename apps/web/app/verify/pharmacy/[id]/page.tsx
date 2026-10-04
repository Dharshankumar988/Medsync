"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@medsync/ui";
import { CheckCircle2, ShieldAlert, FileText, CreditCard, Loader2, Lock } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function VerifyPharmacyPage() {
  const { id: qr_identifier } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pharmacyData, setPharmacyData] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedRx, setSelectedRx] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [authPin, setAuthPin] = useState("");

  useEffect(() => {
    async function verifyAndLoad() {
      try {
        // 1. Verify Pharmacy on Blockchain
        const verifyRes = await api.post('/api/v1/pharmacy/verify-blockchain', { qr_data: qr_identifier });
        setPharmacyData(verifyRes.data.data);

        // 2. Load Patient's Prescriptions to Share
        const rxRes = await api.get('/api/v1/prescriptions/my');
        // Only allow un-dispensed prescriptions
        const availableRx = rxRes.data.data.filter((rx: any) => !rx.is_dispensed);
        setPrescriptions(availableRx);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to verify pharmacy.");
      } finally {
        setLoading(false);
      }
    }
    
    if (qr_identifier) {
      verifyAndLoad();
    }
  }, [qr_identifier]);

  const handleShareAndOrder = () => {
    if (!selectedRx) {
      toast.error("Please select a prescription to share");
      return;
    }
    setPaymentStep(true);
  };

  const handleDummyPayment = async () => {
    if (!authPin || authPin.length !== 6) {
      toast.error("Please enter your 6-digit Authorization PIN");
      return;
    }
    setPaymentProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pharmacy_id', pharmacyData.pharmacy_id);
      formData.append('pin', authPin);

      await api.post(`/api/v1/prescriptions/${selectedRx}/physical-pickup`, formData);
      setOrderComplete(true);
      toast.success("Payment successful! Prescription shared with pharmacy.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Authorization or payment failed");
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
        <p>Verifying Pharmacy Identity on Blockchain...</p>
      </div>
    );
  }

  if (!pharmacyData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold">Verification Failed</h1>
        <p className="text-muted-foreground mt-2 text-center">We could not verify this pharmacy&apos;s QR code. It may be fraudulent or inactive.</p>
        <Button className="mt-6" onClick={() => router.push('/')}>Return Home</Button>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground">Your prescription has been securely shared with {pharmacyData.business_name} and your payment was processed successfully.</p>
        <Button onClick={() => router.push('/')} className="w-full mt-4">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-10 px-4 pb-20">
      <Card className={`border-2 ${pharmacyData.verified_on_blockchain ? 'border-green-500/50' : 'border-red-500/50'}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {pharmacyData.verified_on_blockchain ? (
              <div className="flex flex-col items-center text-green-600 gap-2">
                <CheckCircle2 className="w-12 h-12" />
                <span className="font-bold text-lg">Verified Blockchain Pharmacy</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-red-500 gap-2">
                <ShieldAlert className="w-12 h-12" />
                <span className="font-bold text-lg">Warning: Unverified Pharmacy</span>
              </div>
            )}
          </div>
          <CardTitle className="text-3xl">{pharmacyData.business_name}</CardTitle>
          <CardDescription>{pharmacyData.address}</CardDescription>
        </CardHeader>
        <CardContent className="bg-muted/30 p-6 border-t space-y-4">
          <div className="text-sm space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Network</span>
              <span className="font-mono">{pharmacyData.network}</span>
            </div>
            {pharmacyData.transaction_hash && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Tx Hash</span>
                <span className="font-mono text-xs">{pharmacyData.transaction_hash.slice(0, 15)}...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!paymentStep ? (
        <Card>
          <CardHeader>
            <CardTitle>Share Prescription & Order</CardTitle>
            <CardDescription>Select a prescription to securely share with this pharmacy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescriptions.length === 0 ? (
              <div className="p-6 text-center border rounded-xl text-muted-foreground bg-muted/20">
                You have no active prescriptions to dispense.
              </div>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((rx) => (
                  <div 
                    key={rx.id} 
                    onClick={() => setSelectedRx(rx.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors flex items-start gap-3 ${selectedRx === rx.id ? 'border-primary bg-primary/5' : 'hover:border-border/80'}`}
                  >
                    <FileText className={`w-5 h-5 mt-0.5 ${selectedRx === rx.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <h4 className="font-semibold">{rx.diagnosis || 'General Prescription'}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Prescribed on {new Date(rx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button 
              className="w-full mt-4" 
              size="lg" 
              disabled={!selectedRx || !pharmacyData.verified_on_blockchain}
              onClick={handleShareAndOrder}
            >
              Share & Proceed to Payment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Secure Online Payment</CardTitle>
            <CardDescription>Complete your order for dispensing at {pharmacyData.business_name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span>Prescription Medicines</span>
                <span>$45.00</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee</span>
                <span>$2.50</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>$47.50</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Card Number</label>
                <input type="text" placeholder="**** **** **** ****" className="w-full p-2 border rounded-md font-mono" defaultValue="4242 4242 4242 4242" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expiry</label>
                  <input type="text" placeholder="MM/YY" className="w-full p-2 border rounded-md" defaultValue="12/28" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CVC</label>
                  <input type="text" placeholder="***" className="w-full p-2 border rounded-md" defaultValue="123" />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-primary" /> Authorization PIN (Patient)
              </label>
              <p className="text-xs text-muted-foreground">
                Enter your 6-digit PIN to securely authorize sharing and dispensing this prescription.
              </p>
              <input
                type="password"
                maxLength={6}
                placeholder="••••••"
                value={authPin}
                onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 border rounded-xl font-mono tracking-widest text-center text-xl bg-background shadow-inner"
              />
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl" 
              size="lg"
              onClick={handleDummyPayment}
              disabled={paymentProcessing || authPin.length !== 6}
            >
              {paymentProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {paymentProcessing ? 'Authorizing & Paying...' : 'Pay $47.50 & Authorize Dispense'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
