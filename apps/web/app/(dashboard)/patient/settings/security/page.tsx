"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@medsync/ui";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, KeyRound, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SecurityService } from "@/services/security.service";
import { motion, AnimatePresence } from "framer-motion";

export default function SecuritySettingsPage() {
  const [step, setStep] = useState<"initial" | "set_new_pin" | "success">("initial");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const handleStartReset = () => {
    setStep("set_new_pin");
    setPinError("");
    setCurrentPassword("");
    setNewPin("");
  };

  const handleChangePin = async () => {
    setPinError("");
    
    if (!currentPassword) {
      setPinError("Please enter your current account password.");
      return;
    }
    
    if (newPin.length !== 6) {
      setPinError("PIN must be exactly 6 digits.");
      return;
    }
    
    setSavingPin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      await SecurityService.resetPinWithPassword(session.access_token, currentPassword, newPin);
      
      setStep("success");
    } catch (e: any) {
      console.error(e);
      setPinError(e.response?.data?.detail || e.message || "Failed to update PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your authorization credentials.
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
                    To reset or change your PIN, we require your account password to ensure it&apos;s really you. Your old PIN is not required.
                  </p>
                </div>
                
                <Button 
                  onClick={handleStartReset}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 rounded-xl"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Reset PIN with Password
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "set_new_pin" && (
          <motion.div key="new_pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <Card className="rounded-2xl border-blue-500/30 border-2">
              <CardHeader className="text-center pb-2 bg-blue-500/5">
                <CardTitle>Create New PIN</CardTitle>
                <CardDescription>Enter your password and a new 6-digit PIN</CardDescription>
              </CardHeader>
              <CardContent className="p-8 max-w-sm mx-auto space-y-6 text-center">
                
                <div className="space-y-4 text-left">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Current Account Password</label>
                    <Input 
                      type="password" 
                      placeholder="Enter your password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block mt-6">New PIN</label>
                    <Input 
                      type="password" 
                      placeholder="• • • • • •" 
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
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

                <div className="space-y-3 pt-2">
                  <Button 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 rounded-xl"
                    onClick={handleChangePin}
                    disabled={newPin.length < 6 || !currentPassword || savingPin}
                  >
                    {savingPin ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Lock className="h-5 w-5 mr-2" />}
                    Save New PIN
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-xl"
                    onClick={() => setStep("initial")}
                    disabled={savingPin}
                  >
                    Cancel
                  </Button>
                </div>
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
                    Your authorization PIN has been successfully updated.
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
