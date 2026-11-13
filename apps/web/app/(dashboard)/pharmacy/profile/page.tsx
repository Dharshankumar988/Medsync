"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PharmacyProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pharmacy/settings");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

