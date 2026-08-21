"use client";

import { useState } from "react";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medsync/ui";
import { QrCode, ScanLine, Key, Loader2, CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import { pharmacyService } from "@/services/pharmacy.service";

export default function QRScannerPage() {
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"SCAN" | "VERIFY_PIN" | "SUCCESS">("SCAN");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [prescriptionData, setPrescriptionData] = useState<any>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await pharmacyService.verifyQR(token);
      if (res.success && res.data) {
        setPrescriptionData(res.data);
        setStep("VERIFY_PIN");
      } else {
        setError(res.message || "Invalid or expired QR token.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to decode prescription token.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !prescriptionData?.prescription?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      // In a real app, the backend verifies the PIN against the patient's hash
      const res = await fetch(`/api/v1/prescriptions/${prescriptionData.prescription.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure auth
        },
        body: JSON.stringify({ pin })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStep("SUCCESS");
      } else {
        setError(data.detail || data.message || "Invalid Authorization PIN.");
      }
    } catch (err: any) {
      setError("Failed to verify PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDispense = async () => {
    if (!prescriptionData?.prescription?.id) return;
    setIsLoading(true);
    try {
      await pharmacyService.dispensePrescription(prescriptionData.prescription.id);
      alert("Prescription marked as dispensed successfully!");
      // Reset
      setStep("SCAN");
      setToken("");
      setPin("");
      setPrescriptionData(null);
    } catch (err) {
      alert("Failed to dispense prescription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Prescription Scanner</h2>
      </div>
      
      <div className="flex justify-center mt-8">
        <Card className="w-full max-w-lg shadow-lg border-primary/10">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                {step === "SCAN" && <ScanLine className="h-8 w-8 text-primary" />}
                {step === "VERIFY_PIN" && <Key className="h-8 w-8 text-primary" />}
                {step === "SUCCESS" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {step === "SCAN" && "Scan QR Token"}
              {step === "VERIFY_PIN" && "Patient Authorization"}
              {step === "SUCCESS" && "Verification Complete"}
            </CardTitle>
            <CardDescription>
              {step === "SCAN" && "Scan the patient's prescription QR code or enter the secure token manually."}
              {step === "VERIFY_PIN" && "Ask the patient to enter their 6-digit authorization PIN."}
              {step === "SUCCESS" && "The prescription has been cryptographically verified."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6 border border-red-100 flex items-start">
                <ShieldCheck className="h-5 w-5 mr-2 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {step === "SCAN" && (
              <form onSubmit={handleScan} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Paste secure token here..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="font-mono text-center"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!token || isLoading} size="lg">
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
                  Verify Token
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Powered by MedSync Secure Hash Protocol
                </p>
              </form>
            )}

            {step === "VERIFY_PIN" && prescriptionData && (
              <form onSubmit={handleVerifyPin} className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">Prescription ID:</span>
                    <span className="ml-2 font-mono text-xs">{prescriptionData.prescription.id.split('-')[0]}...</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Patient:</span> {prescriptionData.patient.name}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Doctor:</span> {prescriptionData.doctor.name}
                  </div>
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Medications</p>
                    {prescriptionData.prescription.items?.map((item: any, i: number) => (
                      <div key={i} className="text-sm flex justify-between">
                        <span>{item.medicine_name}</span>
                        <span className="text-muted-foreground">{item.dosage} ({item.duration_days} days)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Authorization PIN</label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="text-center text-2xl tracking-widest h-14"
                    autoFocus
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("SCAN")}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={pin.length !== 6 || isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize"}
                  </Button>
                </div>
              </form>
            )}

            {step === "SUCCESS" && prescriptionData && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 flex items-center mb-2">
                    <ShieldCheck className="h-5 w-5 mr-2" />
                    Blockchain Verified
                  </h4>
                  <p className="text-sm text-emerald-700">
                    This prescription has been cryptographically verified against the MedSync Blockchain Registry.
                  </p>
                </div>
                
                <Button onClick={handleDispense} className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Dispense Medications"}
                </Button>
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
