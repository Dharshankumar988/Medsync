"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function RedirectToPatientReset() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const dest = params ? `/patient/reset-password?${params}` : `/patient/reset-password`;
    router.replace(dest);
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-3">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <p className="text-sm text-muted-foreground font-medium">Navigating to Patient Security Portal...</p>
    </div>
  );
}

export default function ResetPasswordRedirectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <RedirectToPatientReset />
    </Suspense>
  );
}
