"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@medsync/ui";
import { Button } from "@medsync/ui";
import { User, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

const POPUP_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function ProfileCompletionModal() {
  const { user, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !user) return;
    
    // Only show for patients who haven't completed their profile
    if (user.role !== "PATIENT" || (user.profile_completion_percentage && user.profile_completion_percentage >= 100)) {
      return;
    }

    // Do not show if already on the profile page
    if (pathname?.includes("/profile")) {
      return;
    }

    const checkAndShowModal = () => {
      const lastShownStr = localStorage.getItem("lastProfileCompletionPopup");
      const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : 0;
      const now = Date.now();

      if (now - lastShown >= POPUP_INTERVAL) {
        setIsOpen(true);
        localStorage.setItem("lastProfileCompletionPopup", now.toString());
      }
    };

    // Check immediately on mount
    checkAndShowModal();

    // And set interval to check
    const interval = setInterval(checkAndShowModal, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, isLoading, pathname]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-xl">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Your medical profile is incomplete ({user?.profile_completion_percentage || 0}%). 
            To book appointments and get the best experience, please complete all required medical information.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            className="w-full" 
            onClick={() => {
              setIsOpen(false);
              router.push("/patient/profile");
            }}
          >
            <User className="w-4 h-4 mr-2" /> Complete Profile Now
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setIsOpen(false)}
          >
            Remind Me Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
