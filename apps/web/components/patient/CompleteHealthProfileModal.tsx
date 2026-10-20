"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from "@medsync/ui";
import { HeartPulse, ArrowRight, ShieldCheck, User } from "lucide-react";

interface CompleteHealthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function CompleteHealthProfileModal({
  isOpen,
  onClose,
  userId,
}: CompleteHealthProfileModalProps) {
  const router = useRouter();

  const handleGoToMyHealth = () => {
    // Record dismissal for session and navigate to health profile
    sessionStorage.setItem(`medsync_profile_popup_dismissed_${userId}`, "true");
    onClose();
    router.push("/patient/my-health");
  };

  const handleRemindLater = () => {
    // Suppress for current session so it does not harass the user repeatedly
    sessionStorage.setItem(`medsync_profile_popup_dismissed_${userId}`, "true");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleRemindLater(); }}>
      <DialogContent className="sm:max-w-[460px] p-6 rounded-2xl bg-card border border-border/70 shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-500 mb-1">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Complete Your Health Profile
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Welcome to MedSync! To book doctor appointments, order prescriptions, and enable emergency care identification, please enter your mandatory personal health details:
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 rounded-xl p-3 border border-border/50 my-2 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-foreground/80">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span><strong>Date of Birth:</strong> Required for clinical dosage & age bracket</span>
          </div>
          <div className="flex items-center gap-2 text-foreground/80">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <span><strong>Gender:</strong> Required for physiological reference ranges</span>
          </div>
          <div className="flex items-center gap-2 text-foreground/80">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span><strong>Blood Group:</strong> Critical for emergency clinical care</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            type="button"
            onClick={handleGoToMyHealth}
            className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all group"
          >
            <User className="mr-2 h-4 w-4" />
            Complete Profile Now
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleRemindLater}
            className="w-full h-10 text-xs text-muted-foreground hover:text-foreground rounded-xl"
          >
            Remind Me Later
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 mt-1">
          <ShieldCheck className="h-3 w-3" />
          <span>Encrypted under your MedSync security domain</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
