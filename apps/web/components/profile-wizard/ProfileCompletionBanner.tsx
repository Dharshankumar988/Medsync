"use client";

import { useState } from "react";
import { Button } from "@medsync/ui";
import { AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react";
import { Progress } from "@medsync/ui";
import { ProfileWizardModal } from "./ProfileWizardModal";

interface ProfileCompletionBannerProps {
  userId: string;
  role: string;
  initialPercentage: number;
}

export function ProfileCompletionBanner({ userId, role, initialPercentage }: ProfileCompletionBannerProps) {
  const [percentage, setPercentage] = useState(initialPercentage);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  if (percentage >= 100) return null;

  return (
    <>
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Complete Your Profile</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Your profile is {percentage}% complete. Please provide additional information to access all platform features and receive your verified credential.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Progress value={percentage} className="h-2 flex-1 max-w-md bg-primary/20" />
              <span className="text-sm font-medium text-primary">{percentage}%</span>
            </div>
          </div>
          <Button onClick={() => setIsWizardOpen(true)} className="shrink-0 w-full sm:w-auto shadow-sm">
            Complete Profile <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <ProfileWizardModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        userId={userId} 
        role={role} 
        onComplete={(newPercentage) => setPercentage(newPercentage)} 
      />
    </>
  );
}
