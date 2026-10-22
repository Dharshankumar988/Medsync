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
  UserCheck
} from "lucide-react";
import { SecurityService } from "@/services/security.service";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

const PRESET_AVATARS = [
  { id: "felix", name: "Felix", style: "Modern Guy", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" },
  { id: "jocelyn", name: "Jocelyn", style: "Casual Warm", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=ffdfbf" },
  { id: "aneka", name: "Aneka", style: "Professional", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=d1d4f9" },
  { id: "jude", name: "Jude", style: "Thoughtful", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jude&backgroundColor=c0aede" },
  { id: "avery", name: "Avery", style: "Friendly Smile", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Avery&backgroundColor=d1fae5" },
  { id: "maya", name: "Maya", style: "Creative", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya&backgroundColor=ffe4e6" },
  { id: "liam", name: "Liam", style: "Minimalist", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&backgroundColor=e0f2fe" },
  { id: "sophia", name: "Sophia", style: "Energetic", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&backgroundColor=fef3c7" },
  { id: "oliver", name: "Oliver", style: "Casual Vibe", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=ccfbf1" },
  { id: "elena", name: "Elena", style: "Gentle Spirit", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena&backgroundColor=ede9fe" },
  { id: "lucas", name: "Lucas", style: "Sharp & Neat", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=f1f5f9" },
  { id: "zoe", name: "Zoe", style: "Vibrant", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=ffedd5" },
  { id: "adv-sam", name: "Adventurer Sam", style: "Adventurer", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sam&backgroundColor=b6e3f4" },
  { id: "adv-mia", name: "Adventurer Mia", style: "Adventurer", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&backgroundColor=ffdfbf" },
  { id: "adv-leo", name: "Adventurer Leo", style: "Adventurer", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=d1d4f9" },
  { id: "adv-nora", name: "Adventurer Nora", style: "Adventurer", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nora&backgroundColor=ccfbf1" },
];

export default function SettingsPage() {
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("Patient");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState<boolean>(false);
  const [avatarTab, setAvatarTab] = useState<"presets" | "upload">("presets");
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
          .select("full_name, profile_picture_url")
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

        const activePic = pData?.profile_picture_url || uData?.profile_image_url || gPhoto || PRESET_AVATARS[0].url;
        setAvatarUrl(activePic);
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

      {/* ─── Profile Avatar & Photo ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Camera className="w-5 h-5 text-blue-500" /> Profile Avatar & Photo
                </CardTitle>
                <CardDescription className="mt-1">
                  Choose a personalized avatar or upload your own photo. This avatar appears across your medical records, doctor consultations, and clinical profile.
                </CardDescription>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto bg-blue-500/10 text-blue-600 border-blue-500/20 px-3 py-1 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-500" /> Customization
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Active Preview Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 rounded-2xl bg-muted/40 border border-border/40">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar
                    fallback={userName}
                    src={filePreview || selectedPreset || avatarUrl}
                    className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-lg ring-2 ring-primary/20 transition-transform group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarTab("upload");
                      fileInputRef.current?.click();
                    }}
                    className="absolute -bottom-1 -right-1 p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-transform hover:scale-110"
                    title="Upload photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    {userName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filePreview
                      ? "Custom photo selected (preview)"
                      : selectedPreset
                      ? "Preset avatar selected (preview)"
                      : "Current active patient avatar"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      Patient ID: {userId ? `${userId.slice(0, 8)}...` : "--"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick Actions (e.g. Google photo sync) */}
              <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
                {googleAvatar && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingAvatar}
                    onClick={() => handleApplyAvatarUrl(googleAvatar)}
                    className="text-xs rounded-xl border-border/70 hover:bg-muted gap-2"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google"
                      className="w-3.5 h-3.5"
                    />
                    Use Google Photo
                  </Button>
                )}
                {(selectedPreset || filePreview) && (
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
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset to Saved
                  </Button>
                )}
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-muted/60 rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => setAvatarTab("presets")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  avatarTab === "presets"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Curated Presets
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab("upload")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  avatarTab === "upload"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Custom Photo
              </button>
            </div>

            {/* Presets Gallery View */}
            {avatarTab === "presets" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = (selectedPreset || (!filePreview && avatarUrl)) === preset.url;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`group relative flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/10 shadow-sm ring-2 ring-blue-500/30"
                            : "border-border/60 hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="relative">
                          <Avatar
                            fallback={preset.name}
                            src={preset.url}
                            className="w-16 h-16 sm:w-18 sm:h-18 transition-transform group-hover:scale-105"
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground mt-2 truncate max-w-full">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-full">
                          {preset.style}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedPreset && (
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => handleApplyAvatarUrl(selectedPreset)}
                      disabled={savingAvatar}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm px-6"
                    >
                      {savingAvatar ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving Avatar...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" /> Apply Selected Avatar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Upload Custom Photo View */}
            {avatarTab === "upload" && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-blue-500/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-muted/20 hover:bg-muted/30 group"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Click to browse or drop an image here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Supports high-resolution PNG, JPG, or WEBP photos up to 5MB.
                  </p>
                </div>

                {selectedFile && filePreview && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Avatar
                        fallback="Preview"
                        src={filePreview}
                        className="w-14 h-14 border-2 border-blue-500/40"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Ready to save
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={savingAvatar}
                        onClick={() => {
                          setSelectedFile(null);
                          if (filePreview) {
                            URL.revokeObjectURL(filePreview);
                            setFilePreview(null);
                          }
                        }}
                        className="rounded-xl flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={savingAvatar}
                        onClick={handleUploadCustomPhoto}
                        className="rounded-xl flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                      >
                        {savingAvatar ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Uploading...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5" /> Save & Apply Photo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
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
