"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Skeleton, Badge } from "@medsync/ui";
import { Avatar } from "@medsync/ui/components/avatar";
import {
  Settings,
  Download,
  Mail,
  Bell,
  Smartphone,
  Shield,
  LogOut,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Check,
  RefreshCw,
  UserCheck,
  Shuffle
} from "lucide-react";
import { SecurityService } from "@/services/security.service";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { PRESET_AVATARS, MALE_AVATARS, FEMALE_AVATARS, getRandomAvatarByGender } from "@/lib/avatars";

export default function SettingsPage() {
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("Patient");
  const [patientGender, setPatientGender] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [prefs, setPrefs] = useState({
    email_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [resetModal, setResetModal] = useState<'pin' | null>(null);

  // Security Reset State
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
        // 1. Notification preferences
        const { data: prefData } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (prefData) {
          setPrefs({
            email_enabled: prefData.email_enabled ?? true,
            push_enabled: prefData.push_enabled ?? true,
            in_app_enabled: prefData.in_app_enabled ?? true,
          });
        }

        // 2. Patient avatar & identity
        const { data: pData } = await supabase
          .from("patients")
          .select("full_name, profile_picture_url, gender")
          .eq("user_id", userId)
          .maybeSingle();

        const { data: uData } = await supabase
          .from("users")
          .select("profile_image_url")
          .eq("id", userId)
          .maybeSingle();

        const { data: authUserData } = await supabase.auth.getUser();
        const gPhoto = authUserData.user?.user_metadata?.avatar_url || authUserData.user?.user_metadata?.picture;
        const gName = authUserData.user?.user_metadata?.full_name || authUserData.user?.user_metadata?.name;

        if (gPhoto) setGoogleAvatar(gPhoto);
        setUserName(pData?.full_name || gName || authUserData.user?.email?.split("@")[0] || "Patient");
        if (pData?.gender) setPatientGender(pData.gender);

        const activePic = pData?.profile_picture_url || uData?.profile_image_url || gPhoto;
        if (activePic) {
          setAvatarUrl(activePic);
        } else {
          // Proactively assign random avatar based on gender (3 male / 3 female)
          const fallbackPic = getRandomAvatarByGender(pData?.gender);
          setAvatarUrl(fallbackPic);
          handleApplyAvatarUrl(fallbackPic);
        }
      } catch (err) {
        console.error("Error loading settings", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [userId]);

  const handleSelectPreset = (url: string) => {
    setSelectedPreset(url);
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
  };

  const handleRandomizeAvatar = () => {
    const isFemale = patientGender ? patientGender.toLowerCase() === "female" : false;
    const pool = isFemale ? FEMALE_AVATARS : MALE_AVATARS;
    const remaining = pool.filter(a => a.url !== (selectedPreset || avatarUrl));
    const chosen = remaining.length > 0 
      ? remaining[Math.floor(Math.random() * remaining.length)].url 
      : pool[Math.floor(Math.random() * pool.length)].url;
    setSelectedPreset(chosen);
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
  };

  const handleApplyAvatarUrl = async (targetUrl: string) => {
    if (!targetUrl || !userId) return;
    setSavingAvatar(true);
    try {
      // 1. Update backend DB
      try {
        await api.put("/api/v1/users/me/avatar", { avatar_url: targetUrl });
      } catch (backendErr) {
        console.warn("Backend avatar sync notice:", backendErr);
      }

      // 2. Update Supabase tables
      await supabase
        .from("patients")
        .update({ profile_picture_url: targetUrl })
        .eq("user_id", userId);

      await supabase
        .from("users")
        .update({ profile_image_url: targetUrl })
        .eq("id", userId);

      // 3. Update Supabase Auth user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: targetUrl, picture: targetUrl }
      });

      setAvatarUrl(targetUrl);
      setSelectedPreset(null);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview(null);
      }
      setSelectedFile(null);
      toast.success("Avatar updated successfully!");
    } catch (err: any) {
      console.error("Failed to update avatar:", err);
      toast.error(err.message || "Failed to update avatar");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please choose a smaller image.");
      return;
    }

    setSelectedFile(file);
    setSelectedPreset(null);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  const handleUploadCustomPhoto = async () => {
    if (!selectedFile || !userId) return;
    setSavingAvatar(true);

    try {
      let uploadedUrl: string | null = null;

      // 1. Try uploading to backend API
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const { data: res } = await api.post("/api/v1/users/me/profile-image", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        if (res?.data?.profile_image_url) {
          uploadedUrl = res.data.profile_image_url;
        }
      } catch (apiErr: any) {
        console.warn("Backend image upload notice:", apiErr);
      }

      // 2. If backend didn't return public url, attempt Supabase storage upload
      if (!uploadedUrl) {
        const fileExt = selectedFile.name.split('.').pop() || "jpg";
        const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;
        const { data: storageData, error: storageErr } = await supabase.storage
          .from("avatars")
          .upload(filePath, selectedFile, { upsert: true });

        if (!storageErr && storageData) {
          const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          uploadedUrl = publicData.publicUrl;
        } else {
          // If avatars bucket fails, attempt prescriptions bucket
          const { error: prescErr } = await supabase.storage
            .from("prescriptions")
            .upload(filePath, selectedFile, { upsert: true });
          if (!prescErr) {
            const { data: publicData } = supabase.storage.from("prescriptions").getPublicUrl(filePath);
            uploadedUrl = publicData.publicUrl;
          }
        }
      }

      if (!uploadedUrl) {
        throw new Error("Unable to upload image file to storage. Please try again.");
      }

      // 3. Persist to Supabase tables and Auth
      await supabase
        .from("patients")
        .update({ profile_picture_url: uploadedUrl })
        .eq("user_id", userId);

      await supabase
        .from("users")
        .update({ profile_image_url: uploadedUrl })
        .eq("id", userId);

      await supabase.auth.updateUser({
        data: { avatar_url: uploadedUrl, picture: uploadedUrl }
      });

      setAvatarUrl(uploadedUrl);
      setSelectedFile(null);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview(null);
      }
      toast.success("Profile photo uploaded and saved successfully!");
    } catch (err: any) {
      console.error("Upload photo error:", err);
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setSavingAvatar(false);
    }
  };

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
      setPrefs(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  const handleExportData = async () => {
    if (!userId) return;
    setIsExporting(true);

    try {
      const response = await api.get(`/api/v1/fhir/Patient/${userId}/$export`, {
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

  const handleResetPin = async () => {
    if (!currentPassword) {
      setErrorMsg('Please enter your current account password.');
      return;
    }
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setErrorMsg('New PIN must be exactly 6 digits.');
      return;
    }
    if (confirmPin.length !== 6) {
      setErrorMsg('Please confirm your 6-digit PIN.');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('New PIN and Confirm PIN do not match.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        const formData = new FormData();
        formData.append('current_password', currentPassword);
        formData.append('new_pin', pin);

        await api.post('/api/v1/security/reset-pin-with-password', formData, {
          headers: { Authorization: `Bearer ${session.session.access_token}` }
        });

        toast.success('PIN reset successfully');
        setResetModal(null);
        setPin('');
        setConfirmPin('');
        setCurrentPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to reset PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences, profile avatar, and security.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>

      {/* ─── Profile Avatar (Compact) ─── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-border/60 shadow-sm rounded-xl overflow-hidden bg-card/90">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="p-4 sm:p-5 space-y-3">
            {/* Header & Active Avatar Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative group shrink-0">
                  <Avatar
                    fallback={userName}
                    src={filePreview || selectedPreset || avatarUrl}
                    className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-background shadow-xs ring-1 ring-border transition-transform group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow transition-transform hover:scale-110"
                    title="Upload custom photo"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{userName}</h3>
                    {patientGender && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize font-normal border-border/70">
                        {patientGender.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filePreview
                      ? "Custom photo chosen (preview)"
                      : selectedPreset
                      ? "Preset chosen (preview)"
                      : "Active patient avatar"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={savingAvatar}
                  onClick={handleRandomizeAvatar}
                  className="h-7 text-xs px-2.5 rounded-lg border-border/70 hover:bg-muted gap-1.5"
                  title="Randomly allot avatar by gender"
                >
                  <Shuffle className="w-3 h-3 text-muted-foreground" />
                  <span>Randomize</span>
                </Button>

                {googleAvatar && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={savingAvatar}
                    onClick={() => handleApplyAvatarUrl(googleAvatar)}
                    className="h-7 text-xs px-2.5 rounded-lg border-border/70 hover:bg-muted gap-1.5"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google"
                      className="w-3 h-3"
                    />
                    <span>Google Photo</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs px-2.5 rounded-lg border-border/70 hover:bg-muted gap-1.5"
                >
                  <Upload className="w-3 h-3 text-muted-foreground" />
                  <span>Upload Photo</span>
                </Button>
              </div>
            </div>

            {/* 6 Curated Avatars (3 Male, 3 Female) */}
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  6 Curated Avatars (3 Male • 3 Female)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Click to select
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = (selectedPreset || (!filePreview && avatarUrl)) === preset.url;
                  return (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`group relative flex flex-col items-center p-1.5 rounded-lg border transition-all text-center ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/10 shadow-xs ring-1 ring-blue-500/40"
                          : "border-border/50 hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="relative">
                        <Avatar
                          fallback={preset.name}
                          src={preset.url}
                          className="w-10 h-10 sm:w-11 sm:h-11 transition-transform group-hover:scale-105"
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-foreground mt-1 truncate max-w-full">
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground capitalize">
                        {preset.gender}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Pending Selection / Upload Bar */}
            {(selectedPreset || (selectedFile && filePreview)) && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs animate-in fade-in">
                <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-xs font-medium">
                  {selectedFile ? `File: ${selectedFile.name}` : "New avatar selected"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={savingAvatar}
                    onClick={() => {
                      setSelectedPreset(null);
                      setSelectedFile(null);
                      if (filePreview) {
                        URL.revokeObjectURL(filePreview);
                        setFilePreview(null);
                      }
                    }}
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={savingAvatar}
                    onClick={() => {
                      if (selectedFile) {
                        handleUploadCustomPhoto();
                      } else if (selectedPreset) {
                        handleApplyAvatarUrl(selectedPreset);
                      }
                    }}
                    className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {savingAvatar ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" /> Apply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notification Preferences
            </CardTitle>
            <CardDescription>Choose how you want to receive updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive updates via email</div>
              </div>
              <Button
                variant={prefs.email_enabled ? "default" : "outline"}
                onClick={() => togglePref("email_enabled")}
              >
                {prefs.email_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Receive in-app push alerts</div>
              </div>
              <Button
                variant={prefs.push_enabled ? "default" : "outline"}
                onClick={() => togglePref("push_enabled")}
              >
                {prefs.push_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">In-App Notifications</div>
                <div className="text-sm text-muted-foreground">Show notifications in the app</div>
              </div>
              <Button
                variant={prefs.in_app_enabled ? "default" : "outline"}
                onClick={() => togglePref("in_app_enabled")}
              >
                {prefs.in_app_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Security
            </CardTitle>
            <CardDescription>Manage your authorization PIN.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setResetModal('pin')}
            >
              Reset Authorization PIN
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" /> Data Export
            </CardTitle>
            <CardDescription>Download your health data in FHIR format.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export Health Data
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl relative border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => {
                setResetModal(null);
                setPin("");
                setConfirmPin("");
                setCurrentPassword("");
                setErrorMsg("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4">Reset Authorization PIN</h2>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your account password to authorize PIN reset.</p>

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className="w-full bg-muted/30 border border-border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="Enter your account password"
                />
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">New 6-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''));
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="••••••"
                  className="w-full bg-muted/30 border border-border p-3 rounded-xl text-center tracking-widest text-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Confirm 6-Digit PIN</label>
                  {confirmPin.length > 0 && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                        pin === confirmPin && pin.length === 6
                          ? "text-emerald-500"
                          : confirmPin.length >= pin.length
                          ? "text-rose-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {pin === confirmPin && pin.length === 6 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> PINs match
                        </>
                      ) : confirmPin.length >= pin.length ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> PINs do not match
                        </>
                      ) : null}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replace(/\D/g, ''));
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="••••••"
                  className={`w-full bg-muted/30 border p-3 rounded-xl text-center tracking-widest text-xl font-mono focus:outline-none focus:ring-2 transition-all ${
                    confirmPin.length === 6
                      ? pin === confirmPin
                        ? "border-emerald-500/60 focus:ring-emerald-500/30 text-emerald-500"
                        : "border-rose-500/60 focus:ring-rose-500/30 text-rose-500"
                      : "border-border focus:ring-primary/40"
                  }`}
                />
              </div>

              {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

              <Button
                className="w-full mt-2"
                disabled={
                  isSubmitting ||
                  !currentPassword ||
                  pin.length !== 6 ||
                  confirmPin.length !== 6 ||
                  pin !== confirmPin
                }
                onClick={handleResetPin}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reset PIN
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
