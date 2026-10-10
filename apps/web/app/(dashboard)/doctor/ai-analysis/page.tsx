"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DoctorAIAnalysisPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/doctor/records");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Redirecting to Patient Records...</p>
    </div>
  );
}
