"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, getUserProfile } from "@/lib/supabase";

type UserWithCompletion = {
  id: string;
  role: string;
  profile_completion_percentage?: number;
  [key: string]: any;
};

type AuthContextType = {
  user: UserWithCompletion | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = getUserProfile(session.user);
          
          // Fetch profile completion from db
          const { data: dbUser } = await supabase
            .from("users")
            .select("profile_completion_percentage")
            .eq("id", session.user.id)
            .single();

          if (mounted) {
            setUser({ 
              ...session.user, 
              ...profile,
              role: profile.role.toUpperCase(),
              profile_completion_percentage: dbUser?.profile_completion_percentage || 0
            });
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (err) {
        console.error("Error getting session:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = getUserProfile(session.user);
        const { data: dbUser } = await supabase
          .from("users")
          .select("profile_completion_percentage")
          .eq("id", session.user.id)
          .single();

        if (mounted) {
          setUser({ 
            ...session.user, 
            ...profile,
            role: profile.role.toUpperCase(),
            profile_completion_percentage: dbUser?.profile_completion_percentage || 0
          });
          setIsLoading(false);
        }
      } else if (mounted) {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
