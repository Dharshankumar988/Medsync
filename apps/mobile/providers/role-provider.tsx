import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { supabase } from "../lib/supabase";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string>("patient");

  useEffect(() => {
    async function fetchRole() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const userRole = (data.user.user_metadata?.role as string) || "patient";
        setRole(userRole.toLowerCase());
      }
    }

    fetchRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const userRole = (session.user.user_metadata?.role as string) || "patient";
          setRole(userRole.toLowerCase());
        } else {
          setRole("patient");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={{ flex: 1 }} className={`theme-${role}`}>
      {children}
    </View>
  );
}
