"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
            await supabase.from("patients").update({ profile_picture_url: avatarUrl }).eq("user_id", user.id).is("profile_picture_url", null);
            await supabase.from("users").update({ profile_image_url: avatarUrl }).eq("id", user.id).is("profile_image_url", null);
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

        if (isMounted) {
          router.replace("/patient/dashboard?oauth=google");
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
