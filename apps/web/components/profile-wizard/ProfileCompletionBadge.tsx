"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileService } from "@/services/profile.service";
import { Button } from "@medsync/ui";
import { AlertCircle, X, ChevronRight } from "lucide-react";
import { ProfileWizardModal } from "./ProfileWizardModal";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export function ProfileCompletionBadge({ role = "patient" }: { role?: "patient" | "doctor" | "pharmacy" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileService.getProfile(userId),
    enabled: !!userId,
  });

  if (!profile) return null;

  const completion = profile.profile_completion_percentage || 0;

  if (completion >= 100) return null;

  return (
    <>
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-card border border-amber-500/30 p-3 rounded-xl shadow-lg shadow-amber-500/5 max-w-sm"
          >
            <div className="flex-shrink-0 h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Profile Incomplete</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your profile is {completion}% complete.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 h-8 px-2" onClick={() => setIsOpen(true)}>
                Complete <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => setIsDismissed(true)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileWizardModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={() => setIsOpen(false)}
        role={role}
        userId={userId}
      />
    </>
  );
}
