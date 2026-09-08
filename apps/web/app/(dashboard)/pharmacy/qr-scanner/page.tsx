"use client";

import { useState } from "react";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medsync/ui";
import { QrCode, ScanLine, Key, Loader2, CheckCircle2, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import { pharmacyService } from "@/services/pharmacy.service";

export default function QRScannerPage() {
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"SCAN" | "VERIFY_PIN" | "SUCCESS">("SCAN");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [basicData, setBasicData] = useState<any>(null);
  const [fullPrescriptionData, setFullPrescriptionData] = useState<any>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await pharmacyService.verifyQR(token);
      if (res.data?.is_valid) {
        setBasicData(res.data.data);
        if (res.data.data.status === "TAMPERED") {
          setError("WARNING: This prescription has been TAMPERED with. The data does not match the blockchain.");
        }
        setStep("VERIFY_PIN");
      } else {
        setError(res.message || "Invalid or tampered QR token.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to decode prescription token.");
    } finally {
      setIsLoading(false);
    }
  };

  const [faceImage, setFaceImage] = useState<File | null>(null);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!pin && !faceImage) || !basicData?.prescription_id) return;

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (pin) formData.append("pin", pin);
      if (faceImage) formData.append("face_image", faceImage);

      const res = await fetch(`/api/v1/prescriptions/${basicData.prescription_id}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure auth
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setFullPrescriptionData(data.data);
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
    if (!basicData?.prescription_id) return;
    setIsLoading(true);
    try {
      await pharmacyService.dispensePrescription(basicData.prescription_id);
      alert("Prescription marked as dispensed successfully!");
      // Reset
      setStep("SCAN");
      setToken("");
      setPin("");
      setBasicData(null);
      setFullPrescriptionData(null);
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
              {step === "SCAN" && "Scan the patient's prescription QR code or enter the secure MS- token manually."}
              {step === "VERIFY_PIN" && "Ask the patient to enter their 6-digit authorization PIN to unlock prescription details."}
              {step === "SUCCESS" && "The prescription is fully authorized and ready for dispensing."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6 border border-red-100 flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {step === "SCAN" && (
              <form onSubmit={handleScan} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter MS- token here..."
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

            {step === "VERIFY_PIN" && basicData && (
              <form onSubmit={handleVerifyPin} className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">Prescription ID:</span>
                    <span className="ml-2 font-mono text-xs">{basicData.prescription_id.split('-')[0]}...</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Patient:</span> {basicData.patient_name}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Doctor:</span> {basicData.doctor_name}
                  </div>
                  <div className="mt-2 text-sm font-semibold flex items-center">
                     Status: 
                     {basicData.status === "VERIFIED" && <span className="ml-2 text-emerald-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Blockchain Verified</span>}
                     {basicData.status === "PENDING" && <span className="ml-2 text-amber-600">Pending Anchoring</span>}
                     {basicData.status === "TAMPERED" && <span className="ml-2 text-red-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> TAMPERED</span>}
                  </div>
                </div>

                <div className="space-y-4">
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
                      disabled={!!faceImage || basicData.status === "TAMPERED"}
                    />
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Face Verification (Required if PIN locked)</label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      capture="user"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFaceImage(e.target.files[0]);
                          setPin("");
                        } else {
                          setFaceImage(null);
                        }
                      }}
                      disabled={basicData.status === "TAMPERED"}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("SCAN")}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={(!pin && !faceImage) || (pin.length > 0 && pin.length !== 6) || isLoading || basicData.status === "TAMPERED"}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize"}
                  </Button>
                </div>
              </form>
            )}

            {step === "SUCCESS" && fullPrescriptionData && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 flex items-center mb-2">
                    <ShieldCheck className="h-5 w-5 mr-2" />
                    Authentication Successful
                  </h4>
                  <p className="text-sm text-emerald-700">
                    Patient has authorized access to this prescription.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg border mt-4">
                  <h4 className="font-medium mb-3 border-b pb-2">Prescription Details</h4>
                  {fullPrescriptionData.diagnosis && (
                    <div className="mb-4">
                      <span className="text-xs text-muted-foreground block">Diagnosis</span>
                      <span className="text-sm font-medium">{fullPrescriptionData.diagnosis}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground block mb-2">Medications</span>
                    <ul className="space-y-2">
                    {fullPrescriptionData.items?.map((item: any, i: number) => (
                      <li key={i} className="text-sm flex justify-between items-center bg-background p-2 rounded border">
                        <span className="font-medium">{item.medicine_name}</span>
                        <span className="text-muted-foreground">{item.dosage} ({item.duration_days} days)</span>
                      </li>
                    ))}
                    </ul>
                  </div>
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
