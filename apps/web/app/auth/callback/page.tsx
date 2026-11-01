"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  LockKeyhole, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound,
  AlertTriangle 
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardDescription, Alert, AlertDescription } from "@medsync/ui";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileDeepLink, setMobileDeepLink] = useState<string | null>(null);

  // Immediate password setup state for Google OAuth signups
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    let isMounted = true;
    let hasSynced = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function handleAuthCallback() {
      try {
        // Exchange code for session (Supabase handles hash or code automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          // Listen for onAuthStateChange in case session is being processed asynchronously
          const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession?.user && isMounted && !hasSynced) {
              if (timeoutId) clearTimeout(timeoutId);
              await processUserSync(newSession.user);
            }
          });
          authSubscription = listener.subscription;

          // Timeout fallback if no session establishes after 4 seconds
          timeoutId = setTimeout(() => {
            if (isMounted && !hasSynced) {
              setErrorMsg("Unable to retrieve authentication session from Google. Please try logging in again.");
            }
          }, 4000);
          return;
        }

        await processUserSync(session.user);
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        if (isMounted) {
          setErrorMsg(err.message || "Failed to complete Google authentication.");
        }
      }
    }

    async function processUserSync(user: any) {
      if (hasSynced) return;
      hasSynced = true;
      if (timeoutId) clearTimeout(timeoutId);

      try {
        const rawRole = searchParams.get("role") || "PATIENT";
        const role = rawRole.toUpperCase() === "PATIENT" ? "PATIENT" : "PATIENT"; // Strictly patient
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0] : "Google User");

        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

        // Sync with backend database
        try {
          await api.post("/api/v1/auth/sync", {
            id: user.id,
            email: user.email,
            role: role,
            full_name: fullName,
            is_verified: true,
            auth_provider: "google",
            profile_picture_url: avatarUrl || undefined,
          });
        } catch (syncErr) {
          console.warn("Backend OAuth sync warning:", syncErr);
        }

        if (avatarUrl) {
          try {
            await supabase.from("patients").update({ profile_picture_url: avatarUrl }).eq("user_id", user.id);
            await supabase.from("users").update({ profile_image_url: avatarUrl }).eq("id", user.id);
            try {
              await api.put("/api/v1/users/me/avatar", { avatar_url: avatarUrl });
            } catch {}
          } catch (e) {
            console.warn("Direct Supabase avatar update notice:", e);
          }
        }

        // Set role in Supabase user metadata if missing
        if (!user.user_metadata?.role) {
          await supabase.auth.updateUser({
            data: { role: "PATIENT" },
          });
        }

        // Check if user is authenticating from a mobile device
        const isMobileDevice =
          typeof window !== "undefined" &&
          (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || searchParams.get("source") === "mobile");

        const { data: { session: activeSession } } = await supabase.auth.getSession();

        if (isMobileDevice && activeSession?.access_token && activeSession?.refresh_token) {
          const appDeepLink = `medsync://auth/callback?access_token=${encodeURIComponent(
            activeSession.access_token
          )}&refresh_token=${encodeURIComponent(activeSession.refresh_token)}`;

          if (isMounted) {
            setMobileDeepLink(appDeepLink);
          }
        }

        // Check if user has already configured an account password
        const hasExistingPassword =
          user.user_metadata?.has_password === true ||
          (typeof window !== "undefined" && localStorage.getItem(`medsync_pwd_set_${user.id}`) === "true");

        if (!hasExistingPassword) {
          // Immediately require setting an account password BEFORE entering dashboard
          if (isMounted) {
            setPendingUser({
              id: user.id,
              email: user.email || "",
              fullName: fullName,
            });
            setNeedsPasswordSetup(true);
          }
          return;
        }

        // Returning user who already configured their password
        if (isMobileDevice && activeSession?.access_token && activeSession?.refresh_token) {
          const appDeepLink = `medsync://auth/callback?access_token=${encodeURIComponent(
            activeSession.access_token
          )}&refresh_token=${encodeURIComponent(activeSession.refresh_token)}`;
          try {
            window.location.href = appDeepLink;
          } catch {}
          return;
        }

        if (isMounted) {
          router.replace("/patient/dashboard");
        }
      } catch (err: any) {
        console.error("Processing Google user failed:", err);
        if (isMounted) {
          setErrorMsg("Account sync failed. Please try logging in again.");
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleImmediatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setPasswordFormError(null);

    if (password.length < 6) {
      setPasswordFormError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordFormError("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsSavingPassword(true);
    try {
      // 1. Update Supabase Auth user password and metadata
      const { error: supaErr } = await supabase.auth.updateUser({
        password: password,
        data: { has_password: true },
      });

      if (supaErr) {
        console.warn("Supabase auth updateUser notice:", supaErr);
      }

      // 2. Call backend endpoint to set encrypted password in auth.users
      try {
        await api.post("/api/v1/auth/set-oauth-password", {
          password: password,
          confirm_password: confirmPassword,
        });
      } catch (backendErr: any) {
        console.warn("Backend set-oauth-password notice:", backendErr);
      }

      // 3. Mark client localStorage latch
      if (typeof window !== "undefined") {
        localStorage.setItem(`medsync_pwd_set_${pendingUser.id}`, "true");
      }

      toast.success("Account password configured successfully! Taking you to your dashboard...");

      // If mobile deep link was prepared, trigger mobile app return
      if (mobileDeepLink) {
        try {
          window.location.href = mobileDeepLink;
          return;
        } catch {}
      }

      // Web: Navigate to patient setup / my-health
      router.replace("/patient/my-health?oauth=google&setup=true");
    } catch (err: any) {
      console.error("Failed to set password:", err);
      setPasswordFormError(err.message || "Failed to save password. Please try again.");
      setIsSavingPassword(false);
    }
  };

  if (errorMsg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-destructive/20 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Authentication Error</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Mandatory Initial Password Setup Immediately After Google OAuth Access
  if (needsPasswordSetup && pendingUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-1">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium">
              <span>Google Account Connected</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Set Your Account Password
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Welcome, <strong className="text-foreground">{pendingUser.fullName}</strong>! Before proceeding, setting an account password is required to secure your clinical vault and configure your 6-digit Authorization PIN.
            </p>
          </div>

          {passwordFormError && (
            <Alert variant="destructive" className="py-2.5 bg-destructive/10 text-destructive border-destructive/20 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mr-2" />
              <AlertDescription>{passwordFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleImmediatePasswordSubmit} className="space-y-4">
            {/* Account Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Account Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter secure password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSavingPassword}
                  required
                  className="h-11 pr-10 text-sm bg-background border-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= level ? strength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>Password strength: <strong className={strength.score >= 3 ? "text-emerald-500" : "text-amber-500"}>{strength.label}</strong></span>
                    <span>Min 6 characters</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Account Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Confirm Account Password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password to confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSavingPassword}
                  required
                  className="h-11 pr-10 text-sm bg-background border-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {passwordsMatch && (
                <p className="text-[11px] font-medium text-emerald-500 flex items-center gap-1 pt-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Passwords match
                </p>
              )}

              {passwordsMismatch && (
                <p className="text-[11px] font-medium text-red-500 flex items-center gap-1 pt-0.5">
                  <AlertTriangle className="h-3 w-3" /> Passwords do not match
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSavingPassword || !passwordsMatch || password.length < 6}
                className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all"
              >
                {isSavingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuring Password...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Set Password & Continue
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mobileDeepLink) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Authenticated with Google!</h2>
            <p className="text-sm text-muted-foreground">
              Opening your MedSync mobile app. If it doesn't open automatically, tap below:
            </p>
          </div>
          <div className="pt-2">
            <a
              href={mobileDeepLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors w-full shadow-lg"
            >
              Open MedSync Mobile App
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Connecting to Google...
          </h2>
          <p className="text-xs text-muted-foreground">
            Synchronizing your MedSync health workspace. Please wait a moment.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
