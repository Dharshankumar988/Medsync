"use client";

import { getAvatarByGender } from "@/lib/avatars";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Alert, AlertDescription } from "@medsync/ui";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { profileService } from "@/services/profile.service";
import { authService } from "@/services/auth.service";
import { Loader2, Save, Heart, Camera, Upload, Activity, PhoneCall, UserCheck, Lock, Eye, EyeOff, KeyRound, ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

function MyHealthContent() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password setup for Google OAuth / general accounts
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Gmail OTP Reset Password Flow for Configured Accounts
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOtpDigits, setResetOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const resetOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(60);
  const [canResendResetOtp, setCanResendResetOtp] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const isFromOAuth = searchParams?.get("oauth") === "google" || searchParams?.get("setup") === "true";
  
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
    phone_number: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    // Medical & Clinical Details (Shown in Doctor's tabs)
    medical_alerts: "",
    allergies: "",
    chronic_diseases: "",
    height_cm: "",
    weight_kg: "",
    // Emergency Contact
    emergency_contact_name: "",
    emergency_contact_number: ""
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setUserEmail(data.user.email || "");
        const isGoogle = data.user.app_metadata?.provider === "google" ||
          (Array.isArray(data.user.app_metadata?.providers) && data.user.app_metadata.providers.includes("google")) ||
          searchParams?.get("oauth") === "google";
        setIsGoogleUser(Boolean(isGoogle));
        const hasPwd = Boolean(data.user.user_metadata?.has_password) || (typeof window !== "undefined" && localStorage.getItem(`medsync_pwd_set_${data.user.id}`) === "true");
        setHasPassword(hasPwd);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (!isResetModalOpen) return;
    if (resetCountdown > 0) {
      const timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResendResetOtp(true);
    }
  }, [resetCountdown, isResetModalOpen]);

  useEffect(() => {
    if (!userId) return;
    
    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("user_id", userId)
          .single();
          
        if (error) {
          console.error("Supabase error fetching patient profile:", error);
          if (error.code !== 'PGRST116') {
            toast.error("Failed to load patient information");
          }
        }
          
        if (data) {
          setAvatarUrl(data.profile_picture_url || getAvatarByGender(data.gender));
          setFormData({
            full_name: data.full_name || "",
            date_of_birth: data.date_of_birth || "",
            gender: data.gender || "",
            blood_group: data.blood_group || "",
            phone_number: data.phone_number || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            pincode: data.pincode || "",
            medical_alerts: data.medical_alerts || "",
            allergies: data.allergies || "",
            chronic_diseases: data.chronic_diseases || "",
            height_cm: data.height_cm ? String(data.height_cm) : "",
            weight_kg: data.weight_kg ? String(data.weight_kg) : "",
            emergency_contact_name: data.emergency_contact_name || "",
            emergency_contact_number: data.emergency_contact_number || ""
          });

          if (data.date_of_birth && data.gender && data.blood_group) {
            localStorage.setItem(`medsync_profile_completed_${userId}`, "true");
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "gender") {
      const isDefault = !avatarUrl || avatarUrl.includes("dicebear.com");
      if (isDefault) {
        const newAvatar = getAvatarByGender(value);
        setAvatarUrl(newAvatar);
        if (userId) {
          supabase.from("patients").update({ profile_picture_url: newAvatar }).eq("user_id", userId).then();
          supabase.from("users").update({ profile_image_url: newAvatar }).eq("id", userId).then();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("medsync:avatar-updated", { detail: { url: newAvatar } }));
          }
        }
      }
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file exceeds 5MB limit.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      let uploadedUrl: string | null = null;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await api.post("/api/v1/users/me/profile-image", fd);
        uploadedUrl = res.data?.data?.profile_image_url;
      } catch (e) {
        console.warn("Backend image upload fallback:", e);
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const max = 400;
              let w = img.width, h = img.height;
              if (w > h) { if (w > max) { h *= max/w; w = max; } }
              else { if (h > max) { w *= max/h; h = max; } }
              canvas.width = w; canvas.height = h;
              canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.src = ev.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      }

      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        await supabase.from("patients").update({ profile_picture_url: uploadedUrl }).eq("user_id", userId);
        await supabase.from("users").update({ profile_image_url: uploadedUrl }).eq("id", userId);
        try {
          await supabase.auth.updateUser({ data: { avatar_url: uploadedUrl, picture: uploadedUrl } });
        } catch {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("medsync:avatar-updated", { detail: { url: uploadedUrl } }));
        }
        toast.success("Profile photo updated successfully!");
      }
    } catch (err: any) {
      toast.error("Failed to upload image: " + (err.message || ""));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleStartResetFlow = async () => {
    if (!userEmail) {
      toast.error("Unable to find registered email address.");
      return;
    }
    setResetError(null);
    setResetSuccess(false);
    setResetOtpDigits(["", "", "", "", "", ""]);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setIsResetModalOpen(true);
    setIsSendingResetOtp(true);
    setResetCountdown(60);
    setCanResendResetOtp(false);

    try {
      await authService.sendResetOtp(userEmail);
      toast.success("Authentic 6-digit OTP code dispatched to your Gmail!");
      setTimeout(() => {
        resetOtpRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to dispatch verification code via Gmail.";
      setResetError(msg);
      toast.error(msg);
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleResendResetOtp = async () => {
    if (!canResendResetOtp || isSendingResetOtp || !userEmail) return;
    setIsSendingResetOtp(true);
    setResetError(null);
    try {
      await authService.sendResetOtp(userEmail);
      toast.success("New 6-digit verification code sent to your Gmail!");
      setResetCountdown(60);
      setCanResendResetOtp(false);
      setResetOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        resetOtpRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to resend code.";
      setResetError(msg);
      toast.error(msg);
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleResetOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const copy = [...resetOtpDigits];
      copy[index] = "";
      setResetOtpDigits(copy);
      return;
    }
    const char = cleaned.slice(-1);
    const copy = [...resetOtpDigits];
    copy[index] = char;
    setResetOtpDigits(copy);

    if (index < 5 && char) {
      resetOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleResetOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !resetOtpDigits[index] && index > 0) {
      resetOtpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      resetOtpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      resetOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleResetOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const copy = [...resetOtpDigits];
    for (let i = 0; i < pasted.length; i++) {
      copy[i] = pasted[i];
    }
    setResetOtpDigits(copy);
    const nextIdx = Math.min(pasted.length, 5);
    resetOtpRefs.current[nextIdx]?.focus();
  };

  const handleVerifyResetOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const otpCode = resetOtpDigits.join("");
    if (otpCode.length !== 6) {
      setResetError("Please enter all 6 digits of the OTP code sent to your Gmail.");
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("New Password and Confirm Password do not match.");
      return;
    }

    setIsVerifyingResetOtp(true);
    try {
      // 1. Backend verification and password encryption
      await authService.verifyResetOtp({
        email: userEmail,
        otp_code: otpCode,
        new_password: resetNewPassword,
        confirm_password: resetConfirmPassword,
      });

      // 2. Client Supabase auth sync
      try {
        await supabase.auth.updateUser({
          password: resetNewPassword,
          data: { has_password: true },
        });
      } catch (authErr) {
        console.warn("Supabase auth sync notice:", authErr);
      }

      if (typeof window !== "undefined" && userId) {
        localStorage.setItem(`medsync_pwd_set_${userId}`, "true");
      }

      setResetSuccess(true);
      toast.success("Account password updated successfully via Gmail OTP!");
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccess(false);
        setResetOtpDigits(["", "", "", "", "", ""]);
        setResetNewPassword("");
        setResetConfirmPassword("");
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to verify OTP or update password.";
      setResetError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New Password and Confirm Password do not match.");
      return;
    }
    setIsSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { has_password: true }
      });
      if (error) {
        toast.error(error.message || "Failed to set password");
        return;
      }
      try {
        await api.post("/api/v1/auth/set-oauth-password", {
          password: newPassword,
          confirm_password: confirmPassword,
        });
      } catch (backendErr) {
        console.warn("Backend set-oauth-password notice:", backendErr);
      }
      if (typeof window !== "undefined" && userId) {
        localStorage.setItem(`medsync_pwd_set_${userId}`, "true");
      }
      toast.success("Account password set successfully! You can now use this password for PIN setup and secure actions.");
      setPasswordSuccess(true);
      setHasPassword(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update account password");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // If user filled in password fields as part of full save, update password
      // Only set initial password if account has no password yet (configured passwords must go through Gmail OTP flow)
      if (!hasPassword && newPassword) {
        if (newPassword.length < 6) {
          toast.error("Password must be at least 6 characters.");
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error("New Password and Confirm Password do not match.");
          setSaving(false);
          return;
        }
        try {
          const { error: pwdErr } = await supabase.auth.updateUser({
            password: newPassword,
            data: { has_password: true }
          });
          if (pwdErr) {
            console.warn("Password update notice during profile save:", pwdErr);
          } else {
            setPasswordSuccess(true);
            setHasPassword(true);
            setNewPassword("");
            setConfirmPassword("");
          }
        } catch (e) {
          console.warn("Password update notice:", e);
        }
      }

      const payload: any = {
        ...formData,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        profile_completion_percentage: 100,
      };

      // 1. Try saving via backend API
      try {
        await profileService.updateProfileCompletion(userId, payload);
      } catch (backendErr) {
        console.warn("Backend profile completion update fallback to Supabase direct:", backendErr);
      }

      // 2. Also update Supabase for direct client queries
      const { error: supaErr } = await supabase
        .from("patients")
        .update({
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          blood_group: formData.blood_group,
          phone_number: formData.phone_number,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          medical_alerts: formData.medical_alerts,
          allergies: formData.allergies,
          chronic_diseases: formData.chronic_diseases,
          height_cm: payload.height_cm,
          weight_kg: payload.weight_kg,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_number: formData.emergency_contact_number,
          profile_picture_url: avatarUrl || undefined,
        })
        .eq("user_id", userId);

      if (supaErr) {
        throw supaErr;
      }

      if (avatarUrl) {
        await supabase.from("users").update({ profile_image_url: avatarUrl }).eq("id", userId);
      }

      if (formData.date_of_birth && formData.gender && formData.blood_group) {
        localStorage.setItem(`medsync_profile_completed_${userId}`, "true");
      }

      toast.success("Health profile and clinical details updated successfully");
    } catch (err) {
      console.error("Error saving profile", err);
      toast.error("Failed to update health profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative space-y-8 pb-12 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-2">My Health</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
            Health Profile
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg leading-relaxed">
            Manage your personal credentials, allergies, vitals, and medical alerts. These will appear in your clinical summary for doctors.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} className="w-full sm:w-auto shadow-md">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Changes
        </Button>
      </motion.div>

      {/* Google OAuth Onboarding Banner */}
      {(isFromOAuth || (isGoogleUser && !hasPassword)) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/15 via-primary/10 to-emerald-500/10 border border-blue-500/30 flex items-start gap-3.5 shadow-sm"
        >
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-500 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                Welcome to MedSync! Complete Your Health Profile
              </h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold">
                Setup Required
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please complete your health credentials and emergency contacts below so your clinical data is accessible to treating physicians.
              <strong> Crucial:</strong> Set your account password below so you can configure your 6-digit Authorization PIN for booking appointments, downloading records, and ordering prescriptions.
            </p>
          </div>
        </motion.div>
      )}

      {/* Account Password Card (Required for PIN setup, reset, and identity confirmation) */}
      <Card className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/[0.04] via-card to-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <span>Account Password</span>
              {isGoogleUser && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-normal">
                  Google Account
                </span>
              )}
            </div>
            {(hasPassword || passwordSuccess) ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Password Configured
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Setup Required
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {(hasPassword || passwordSuccess) ? (
            /* Protected Password Configured View - Direct edits disabled, Reset via Gmail OTP only */
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your account password is encrypted and protects your clinical health records. For your protection, direct password changes are restricted. To change or reset your password, you must authorize via an authentic 6-digit OTP sent to your registered Gmail address.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Account Protection Active</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Protected
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To modify your password, an authentic 6-digit verification code will be dispatched to:
                  </p>
                  {userEmail && (
                    <p className="text-xs font-mono font-semibold text-primary pt-0.5">
                      {userEmail}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartResetFlow}
                  disabled={isSendingResetOtp}
                  className="shrink-0 rounded-xl border-primary/30 hover:bg-primary/10 text-xs font-semibold"
                >
                  {isSendingResetOtp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  )}
                  Reset Password via Gmail OTP
                </Button>
              </div>
            </div>
          ) : (
            /* Initial Password Creation for Google Users */
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Since you signed up with Google, setting an account password is required to enroll your secure 6-digit Authorization PIN for booking appointments and downloading records.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Account Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter secure password (min 6 chars)"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Confirm Account Password</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password to confirm"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSettingPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                  onClick={handleSetPassword}
                  className="rounded-xl border-primary/30 hover:bg-primary/10 text-xs font-semibold"
                >
                  {isSettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <KeyRound className="w-3.5 h-3.5 mr-1.5 text-primary" />}
                  Set Account Password
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Reset Password via Gmail OTP Modal ─── */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-1">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium">
              <span>Gmail 2FA Verification</span>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Reset Account Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              We dispatched an authentic 6-digit OTP code to <strong className="text-foreground">{userEmail}</strong>. Please check your Gmail inbox (including Spam or Updates folder) and enter it below.
            </DialogDescription>
          </DialogHeader>

          {resetError && (
            <Alert variant="destructive" className="py-2.5 bg-destructive/10 text-destructive border-destructive/20 text-xs mt-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mr-2" />
              <AlertDescription>{resetError}</AlertDescription>
            </Alert>
          )}

          {resetSuccess && (
            <Alert className="py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mr-2" />
              <AlertDescription>Password updated successfully! Closing...</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerifyResetOtpSubmit} className="space-y-4 mt-3">
            {/* 6-digit OTP Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">
                6-Digit Verification Code
              </label>
              <div className="flex justify-between gap-2">
                {resetOtpDigits.map((digit, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => { resetOtpRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleResetOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleResetOtpKeyDown(idx, e)}
                    onPaste={handleResetOtpPaste}
                    disabled={isVerifyingResetOtp || isSendingResetOtp}
                    className="w-11 h-12 text-center text-lg font-bold font-mono rounded-xl bg-background border-input focus:ring-2 focus:ring-primary shadow-sm"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Didn't receive the email?</span>
                {canResendResetOtp ? (
                  <button
                    type="button"
                    onClick={handleResendResetOtp}
                    disabled={isSendingResetOtp}
                    className="text-primary hover:underline font-semibold"
                  >
                    {isSendingResetOtp ? "Sending..." : "Resend Code"}
                  </button>
                ) : (
                  <span className="text-muted-foreground/70">
                    Resend code in <strong className="text-foreground">{resetCountdown}s</strong>
                  </span>
                )}
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-foreground/80">New Password</label>
              <div className="relative">
                <Input
                  type={showResetNewPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  disabled={isVerifyingResetOtp}
                  required
                  className="h-11 pr-10 text-sm bg-background border-input"
                />
                <button
                  type="button"
                  onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                  className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground"
                  tabIndex={-1}
                >
                  {showResetNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showResetConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  disabled={isVerifyingResetOtp}
                  required
                  className="h-11 pr-10 text-sm bg-background border-input"
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground"
                  tabIndex={-1}
                >
                  {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isVerifyingResetOtp || resetOtpDigits.some((d) => !d) || resetNewPassword.length < 6 || resetNewPassword !== resetConfirmPassword}
                className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all"
              >
                {isVerifyingResetOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying OTP & Updating...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify OTP & Update Password
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isVerifyingResetOtp}
                className="w-full h-10 text-xs text-muted-foreground hover:text-foreground rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <Card className="rounded-2xl border border-border/60 bg-card/50">
          <CardContent className="p-6 space-y-6">
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 1. Personal Details */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="w-5 h-5 text-blue-500" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Profile Photo Display & Upload */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-primary/10 shadow-sm flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Change Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Profile Picture</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically syncs with selected gender, or upload your own custom photo.
                  </p>
                  <div className="pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl h-8 text-xs gap-1.5"
                    >
                      {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-primary" />}
                      {isUploadingPhoto ? "Uploading..." : "Upload Custom Photo"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <Input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Enter your full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                  <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Blood Group</label>
                  <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  <Input name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+91 ..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Address</label>
                  <Input name="address" value={formData.address} onChange={handleChange} placeholder="Street address" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">City</label>
                  <Input name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Bengaluru" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State / Province</label>
                  <Input name="state" value={formData.state} onChange={handleChange} placeholder="e.g. Karnataka" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Allergies & Medical Alerts (Displayed in Doctor's Patient Summary) */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg text-rose-500">
                <Heart className="w-5 h-5 text-rose-500" />
                Allergies & Medical Alerts (Doctor&apos;s Clinical View)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Profile Photo Display & Upload */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-primary/10 shadow-sm flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Change Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Profile Picture</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically syncs with selected gender, or upload your own custom photo.
                  </p>
                  <div className="pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl h-8 text-xs gap-1.5"
                    >
                      {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-primary" />}
                      {isUploadingPhoto ? "Uploading..." : "Upload Custom Photo"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Medical Alerts</label>
                  <Input 
                    name="medical_alerts" 
                    value={formData.medical_alerts} 
                    onChange={handleChange} 
                    placeholder="e.g. Diabetic, Pacemaker, Bleeding disorder" 
                  />
                  <p className="text-[11px] text-muted-foreground">Important alerts highlighted in doctor consultations.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Known Allergies</label>
                  <Input 
                    name="allergies" 
                    value={formData.allergies} 
                    onChange={handleChange} 
                    placeholder="e.g. Penicillin, Peanuts, Sulfa drugs" 
                  />
                  <p className="text-[11px] text-muted-foreground">Drug, food, or environmental allergies.</p>
                </div>
                <div className="col-span-full space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Chronic Diseases / Existing Conditions</label>
                  <Input 
                    name="chronic_diseases" 
                    value={formData.chronic_diseases} 
                    onChange={handleChange} 
                    placeholder="e.g. Hypertension, Asthma, Thyroid disorder" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Vitals Summary (Displayed in Doctor's Patient View) */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-500">
                <Activity className="w-5 h-5 text-emerald-500" />
                Vitals Summary (Doctor&apos;s Clinical View)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Height (cm)</label>
                  <Input 
                    type="number" 
                    name="height_cm" 
                    value={formData.height_cm} 
                    onChange={handleChange} 
                    placeholder="e.g. 175" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Weight (kg)</label>
                  <Input 
                    type="number" 
                    name="weight_kg" 
                    value={formData.weight_kg} 
                    onChange={handleChange} 
                    placeholder="e.g. 70" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Emergency Contact */}
          <Card className="rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PhoneCall className="w-5 h-5 text-amber-500" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Contact Name</label>
                  <Input 
                    name="emergency_contact_name" 
                    value={formData.emergency_contact_name} 
                    onChange={handleChange} 
                    placeholder="e.g. Jane Doe (Spouse)" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Emergency Phone Number</label>
                  <Input 
                    name="emergency_contact_number" 
                    value={formData.emergency_contact_number} 
                    onChange={handleChange} 
                    placeholder="e.g. +91 9876543210" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save All Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyHealthPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <MyHealthContent />
    </Suspense>
  );
}
