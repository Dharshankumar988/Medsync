"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Skeleton } from "@medsync/ui";
import { Settings, Download, Mail, Bell, Smartphone, Shield, LogOut, Camera, Loader2, X } from "lucide-react";
import { SecurityService } from "@/services/security.service";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [userId, setUserId] = useState<string>("");
  const [prefs, setPrefs] = useState({
    email_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [resetModal, setResetModal] = useState<'pin' | 'face' | null>(null);
  
  // Security Reset State
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [faceImages, setFaceImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const router = useRouter();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    async function loadSettings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();
          
        if (data) {
          setPrefs({
            email_enabled: data.email_enabled,
            push_enabled: data.push_enabled,
            in_app_enabled: data.in_app_enabled,
          });
        } else {
          // default insert
          await supabase.from("notification_preferences").insert({
            user_id: userId,
            email_enabled: true,
            push_enabled: true,
            in_app_enabled: true,
          });
        }
      } catch (err) {
        console.error("Error loading settings", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, [userId]);

  const togglePref = async (key: keyof typeof prefs) => {
    const newValue = !prefs[key];
    setPrefs(prev => ({ ...prev, [key]: newValue }));
    
    try {
      await supabase
        .from("notification_preferences")
        .update({ [key]: newValue })
        .eq("user_id", userId);
      toast.success("Preferences updated");
    } catch (err) {
      console.error("Error updating preferences", err);
      toast.error("Failed to update preferences");
      // revert
      setPrefs(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  const handleExportData = async () => {
    if (!userId) return;
    setIsExporting(true);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const response = await axios.get(`${apiUrl}/fhir/Patient/${userId}/$export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/fhir+json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medsync-health-data-${userId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Data export successful");
    } catch (err) {
      console.error("Export error", err);
      toast.error("Failed to export health data. FHIR service may be unavailable.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
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
    if (resetModal) {
      setPin(""); setConfirmPin(""); setFaceImages([]); setErrorMsg("");
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [resetModal, stopCamera]);

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `face_${faceImages.length + 1}.jpg`, { type: 'image/jpeg' });
            setFaceImages(prev => [...prev, file]);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleResetPin = async () => {
    if (pin.length !== 6 || pin !== confirmPin) {
      setErrorMsg("PINs do not match or are invalid.");
      return;
    }
    if (faceImages.length === 0) {
      setErrorMsg("Please capture your face for authorization.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      await SecurityService.changePinWithFace(session?.session?.access_token as string, pin, faceImages[0]);
      toast.success("PIN reset successfully!");
      setResetModal(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to reset PIN");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFace = async () => {
    if (pin.length !== 6) {
      setErrorMsg("Please enter your existing PIN.");
      return;
    }
    if (faceImages.length < 3) {
      setErrorMsg("Please capture 3 new face samples.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      await SecurityService.changeFaceWithPin(session?.session?.access_token as string, pin, faceImages);
      toast.success("Face ID reset successfully!");
      setResetModal(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to reset Face ID");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">Account</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
            Manage your app preferences and data.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6">
        <Card className="rounded-2xl border border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Control how and when you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => togglePref('email_enabled')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.email_enabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.email_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Smartphone className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates on your device</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => togglePref('push_enabled')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.push_enabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.push_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <Bell className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-medium">In-App Notifications</p>
                      <p className="text-sm text-muted-foreground">Show alerts inside the dashboard</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => togglePref('in_app_enabled')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.in_app_enabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.in_app_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>Export your medical data or manage your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border/50 rounded-xl gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Export Health Data</p>
                  <p className="text-sm text-muted-foreground">Download a copy of your records in FHIR format.</p>
                </div>
              </div>
              <Button onClick={handleExportData} disabled={isExporting} variant="outline" className="shrink-0">
                {isExporting ? "Exporting..." : "Export Data"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle>Security & Authentication</CardTitle>
            <CardDescription>Manage your PIN and Face ID settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border/50 rounded-xl gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Reset PIN</p>
                  <p className="text-sm text-muted-foreground">Use your Face ID to set a new PIN.</p>
                </div>
              </div>
              <Button onClick={() => setResetModal('pin')} variant="outline" className="shrink-0">
                Change PIN
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border/50 rounded-xl gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Reset Face ID</p>
                  <p className="text-sm text-muted-foreground">Use your PIN to re-enroll your face.</p>
                </div>
              </div>
              <Button onClick={() => setResetModal('face')} variant="outline" className="shrink-0">
                Change Face ID
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">End your current session safely.</p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
             </div>
          </CardContent>
        </Card>
      </div>

      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl relative border">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setResetModal(null)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4">{resetModal === 'pin' ? 'Reset Authorization PIN' : 'Reset Face ID'}</h2>
            
            <div className="space-y-4">
              {resetModal === 'pin' && (
                <>
                  <p className="text-sm text-muted-foreground">Capture your face for authorization, then enter a new PIN.</p>
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
                      <div className="w-[60%] h-[80%] rounded-[50%] border-4 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div>
                    </div>
                  </div>
                  {faceImages.length === 0 ? (
                    <Button className="w-full flex gap-2" onClick={captureFace}><Camera className="h-4 w-4"/> Capture Face</Button>
                  ) : (
                    <div className="text-green-500 text-sm font-medium flex items-center justify-center gap-2 bg-green-500/10 p-2 rounded-lg">
                      Face Captured Successfully
                    </div>
                  )}
                  
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">New 6-Digit PIN</p>
                    <input 
                      type="password" inputMode="numeric" maxLength={6}
                      value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-muted/30 border border-border p-3 rounded-xl text-center tracking-widest text-xl"
                    />
                    <p className="text-sm font-medium">Confirm New PIN</p>
                    <input 
                      type="password" inputMode="numeric" maxLength={6}
                      value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-muted/30 border border-border p-3 rounded-xl text-center tracking-widest text-xl"
                    />
                  </div>
                  {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
                  <Button className="w-full" disabled={isSubmitting} onClick={handleResetPin}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Reset PIN"}
                  </Button>
                </>
              )}

              {resetModal === 'face' && (
                <>
                  <p className="text-sm text-muted-foreground">Enter your existing PIN for authorization, then capture 3 new face samples.</p>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium">Existing 6-Digit PIN</p>
                    <input 
                      type="password" inputMode="numeric" maxLength={6}
                      value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-muted/30 border border-border p-3 rounded-xl text-center tracking-widest text-xl"
                    />
                  </div>

                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
                      <div className="w-[60%] h-[80%] rounded-[50%] border-4 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {faceImages.length < 3 ? (
                      <Button className="w-full flex gap-2" onClick={captureFace}>
                        <Camera className="w-4 h-4" /> Capture New Sample {faceImages.length + 1}/3
                      </Button>
                    ) : (
                      <div className="w-full text-green-500 text-sm font-medium flex items-center justify-center gap-2 bg-green-500/10 p-2 rounded-lg">
                        3 Samples Captured
                      </div>
                    )}
                  </div>

                  {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
                  <Button className="w-full mt-4" disabled={isSubmitting} onClick={handleResetFace}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Enroll New Face ID"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
