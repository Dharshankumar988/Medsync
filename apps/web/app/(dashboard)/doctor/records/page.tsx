"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function DoctorRecordsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient_id");

  useEffect(() => {
    if (patientId) {
      router.replace(`/doctor/patients/${patientId}?tab=records`);
    } else {
      router.replace("/doctor/patients");
    }
  }, [router, patientId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      <p className="text-sm font-medium text-muted-foreground">
        Redirecting to Patient Records Profile...
      </p>
    </div>
  );
}

export default function DoctorMedicalRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <DoctorRecordsRedirect />
    </Suspense>
  );
}
