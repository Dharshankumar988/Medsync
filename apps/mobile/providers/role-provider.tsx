import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { View } from "react-native";
import { supabase, normalizeRole } from "../lib/supabase";
import { authService } from "../services/auth.service";

export type Role = 'patient' | 'doctor' | 'pharmacy' | 'hospital' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  status: string;
  full_name?: string | null;
}

export interface RoleContextValue {
  role: Role | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
  refresh: async () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const resolveUserFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setRole(null);
        setUser(null);
        return;
      }
      let rawRole = data.user.user_metadata?.role ?? data.user.app_metadata?.role;
      let userStatus = String(data.user.user_metadata?.status ?? data.user.app_metadata?.status ?? "ACTIVE").toUpperCase();

      // Check canonical public.users table if role not set in auth metadata
      if (!rawRole) {
        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('role, is_active')
            .eq('id', data.user.id)
            .maybeSingle();

          if (dbUser?.role) {
            rawRole = dbUser.role;
            if (dbUser.is_active === false) {
              userStatus = 'SUSPENDED';
            }
          }
        } catch {
          // Ignore lookup error and proceed with available metadata
        }
      }

      const userRole = (normalizeRole(rawRole) as Role) || "patient";
      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email ?? '',
        role: userRole,
        status: userStatus,
        full_name: (data.user.user_metadata?.full_name as string) ?? (data.user.user_metadata?.name as string) ?? null,
      };
      setRole(userRole);
      setUser(profile);
    } catch {
      setRole(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveUserFromSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          let rawRole = session.user.user_metadata?.role ?? session.user.app_metadata?.role;
          let userStatus = String(session.user.user_metadata?.status ?? session.user.app_metadata?.status ?? "ACTIVE").toUpperCase();

          if (!rawRole) {
            try {
              const { data: dbUser } = await supabase
                .from('users')
                .select('role, is_active')
                .eq('id', session.user.id)
                .maybeSingle();

              if (dbUser?.role) {
                rawRole = dbUser.role;
                if (dbUser.is_active === false) {
                  userStatus = 'SUSPENDED';
                }
              }
            } catch {
              // Ignore lookup error
            }
          }

          const userRole = (normalizeRole(rawRole) as Role) || "patient";
          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email ?? '',
            role: userRole,
            status: userStatus,
            full_name: (session.user.user_metadata?.full_name as string) ?? (session.user.user_metadata?.name as string) ?? null,
          };
          setRole(userRole);
          setUser(profile);
          setIsLoading(false);
        } else {
          setRole(null);
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [resolveUserFromSupabase]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setRole(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      role,
      user,
      isLoading,
      isAuthenticated: !!user && !!role,
      logout,
      refresh: resolveUserFromSupabase,
    }),
    [role, user, isLoading, logout, resolveUserFromSupabase]
  );

  return (
    <RoleContext.Provider value={value}>
      <View style={{ flex: 1 }} className={`theme-${role || 'patient'}`}>
        {children}
      </View>
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);
