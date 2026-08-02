"use client";

import React, { useEffect } from "react";
import { supabase, getUserProfile } from "@/lib/supabase";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function fetchRole() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const profile = getUserProfile(data.user);
        const role = profile.role.toLowerCase();
        document.documentElement.setAttribute("data-role", role);
      } else {
        document.documentElement.setAttribute("data-role", "patient");
      }
    }

    fetchRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const profile = getUserProfile(session.user);
          const role = profile.role.toLowerCase();
          document.documentElement.setAttribute("data-role", role);
        } else {
          document.documentElement.setAttribute("data-role", "patient");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
