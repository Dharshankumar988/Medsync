"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { ShieldCheck, Camera, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SecurityService } from "@/services/security.service";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";

export default function SecuritySettingsPage() {
  const [step, setStep] = useState<"initial" | "face_verification" | "set_new_pin" | "success">("initial");
  
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [faceError, setFaceError] = useState("");
  
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const handleStartFaceAuth = () => {
    setStep("face_verification");
    setFaceError("");
  };

  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const captureAndVerify = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setVerifyingFace(true);
    setFaceError("");
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setFaceError("Could not capture image. Please try again.");
      setVerifyingFace(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Convert base64 to File
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const file = new File([blob], "face_auth.jpg", { type: "image/jpeg" });

      const response = await SecurityService.verifyFace(session.access_token, file);
      if (!response.verified) {
         throw new Error("Face verification failed. Please try again.");
      }
      
      setStep("set_new_pin");
    } catch (e: any) {
      console.error(e);
      setFaceError(e.message || "Face verification failed. Make sure you are clearly visible.");
    } finally {
      setVerifyingFace(false);
    }
  }, [webcamRef]);

  const handleChangePin = async () => {
    setPinError("");
    
    if (newPin.length !== 6 || confirmPin.length !== 6) {
      setPinError("PIN must be exactly 6 digits.");
      return;
    }
    
    if (newPin !== confirmPin) {
      setPinError("PINs do not match.");
      return;
    }
    
    setSavingPin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      if (!webcamRef.current) throw new Error("Webcam not available");
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Could not capture image for verification.");
      
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const faceImage = new File([blob], "face_auth.jpg", { type: "image/jpeg" });

      await SecurityService.changePinWithFace(session.access_token, newPin, faceImage);
      
      setStep("success");
    } catch (e: any) {
      console.error(e);
      setPinError(e.message || "Failed to update PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your Face ID and PIN authorization credentials.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "initial" && (
          <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="rounded-2xl border border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-blue-500" />
                  Authorization PIN
                </CardTitle>
                <CardDescription>
                  Your PIN is used to authorize prescription sharing and payments. Never expose your old PIN to change it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-600">
                    To reset or change your PIN, we require a live Face ID verification to ensure it&apos;s really you. Your old PIN is not required.
                  </p>
                </div>
                
                <Button 
                  onClick={handleStartFaceAuth}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 rounded-xl"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Change PIN using Face ID
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "face_verification" && (
          <motion.div key="face" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="rounded-2xl border-emerald-500/30 border-2 overflow-hidden">
              <CardHeader className="text-center pb-2 bg-emerald-500/5">
                <CardTitle>Verify Your Identity</CardTitle>
                <CardDescription>Look directly at the camera</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative aspect-video max-w-sm mx-auto rounded-2xl overflow-hidden bg-black mb-6 border-2 border-emerald-500/20">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    onUserMedia={handleUserMedia}
                    className="w-full h-full object-cover"
                  />
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {/* Face detection target overlay */}
                  <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500/50 border-b-emerald-500/50 rounded-[40%] scale-75 pointer-events-none" />
                </div>

                {faceError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-600 justify-center">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {faceError}
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setStep("initial")} disabled={verifyingFace}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-500 min-w-[140px]" 
                    onClick={captureAndVerify}
                    disabled={!isCameraReady || verifyingFace}
                  >
                    {verifyingFace ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying</> : "Verify Face ID"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "set_new_pin" && (
          <motion.div key="new_pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <Card className="rounded-2xl border-blue-500/30 border-2">
              <CardHeader className="text-center pb-2 bg-blue-500/5">
                <div className="mx-auto bg-emerald-500/20 text-emerald-600 p-2 rounded-full mb-3 inline-flex items-center gap-1 text-xs font-semibold px-3">
                  <CheckCircle2 className="h-4 w-4" /> Face Verified
                </div>
                <CardTitle>Create New PIN</CardTitle>
                <CardDescription>Enter a new 6-digit PIN</CardDescription>
              </CardHeader>
              <CardContent className="p-8 max-w-sm mx-auto space-y-6 text-center">
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">New PIN</label>
                    <Input 
                      type="password" 
                      placeholder="• • • • • •" 
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      maxLength={6}
                      className="text-center text-2xl tracking-[0.5em] h-14 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Confirm PIN</label>
                    <Input 
                      type="password" 
                      placeholder="• • • • • •" 
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      maxLength={6}
                      className="text-center text-2xl tracking-[0.5em] h-14 rounded-xl"
                    />
                  </div>
                </div>

                {pinError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-600 text-left">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {pinError}
                  </div>
                )}

                <Button 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 rounded-xl"
                  onClick={handleChangePin}
                  disabled={newPin.length < 6 || confirmPin.length < 6 || savingPin}
                >
                  {savingPin ? <Loader2 className="animate-spin h-5 w-5" /> : "Save New PIN"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="rounded-2xl border-emerald-500/40 shadow-lg text-center">
              <CardContent className="p-12 space-y-6">
                <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">PIN Updated</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                    Your authorization PIN has been successfully changed using Face ID verification.
                  </p>
                </div>
                <Button onClick={() => setStep("initial")} variant="outline" className="mt-4">
                  Back to Security Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
