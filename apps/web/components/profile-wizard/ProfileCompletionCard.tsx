"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Progress } from "@medsync/ui";
import { AlertCircle, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useProfilePopupThrottle } from "@/hooks/useProfilePopupThrottle";
import { ProfileWizardModal } from "./ProfileWizardModal";

interface ProfileCompletionCardProps {
  userId: string;
  role: string;
}

export function ProfileCompletionCard({ userId, role }: ProfileCompletionCardProps) {
  const { percentage, missingFields, isComplete, isLoading } = useProfileCompletion(userId, role);
  const { shouldShow, dismiss, markShown } = useProfilePopupThrottle();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Mark as shown when the card renders (so next render within 30 min won't show)
  useEffect(() => {
    if (!isLoading && !isComplete && shouldShow) {
      markShown();
    }
  }, [isLoading, isComplete, shouldShow, markShown]);

  // Don't render if: loading, profile is complete, dismissed, or throttled (not shouldShow)
  if (isLoading || isComplete || isDismissed || !shouldShow) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    dismiss();
  };

  return (
    <>
      <Card className="mb-6 border-l-4 border-l-primary shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Complete Your Profile</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-2 -mr-2" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 space-y-3 w-full">
              <p className="text-sm text-muted-foreground">
                Your profile is <span className="font-semibold text-foreground">{percentage}%</span> complete. 
                A complete profile helps build trust and unlocks all platform features.
              </p>
              
              <div className="flex items-center gap-4">
                <Progress value={percentage} className="h-2 w-full max-w-md bg-primary/20" />
              </div>

              {missingFields.length > 0 && (
                <div className="text-xs text-muted-foreground pt-1">
                  Missing: {missingFields.slice(0, 3).join(", ")}
                  {missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ""}
                </div>
              )}
            </div>

            <Button onClick={() => setIsWizardOpen(true)} className="shrink-0 w-full md:w-auto">
              Complete Profile <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProfileWizardModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        userId={userId} 
        role={role} 
        onComplete={() => {
          // In a real app we might refetch or optimistic update
          // For now, modal handles state or we rely on page refresh
        }} 
      />
    </>
  );
}
