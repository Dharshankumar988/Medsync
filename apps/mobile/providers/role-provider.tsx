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
  avatar_url?: string | null;
  profile_image_url?: string | null;
  profile_picture_url?: string | null;
  user_metadata?: Record<string, any>;
}

export interface RoleContextValue {
  role: Role | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
  refresh: async () => {},
  updateUserAvatar: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const buildHydratedProfile = useCallback(async (authUser: any): Promise<{ userRole: Role; profile: UserProfile }> => {
    let rawRole = authUser.user_metadata?.role ?? authUser.app_metadata?.role;
    let userStatus = String(authUser.user_metadata?.status ?? authUser.app_metadata?.status ?? "ACTIVE").toUpperCase();
    let avatarUrl: string | null =
      (authUser.user_metadata?.profile_picture_url as string | undefined) ||
      (authUser.user_metadata?.profile_image_url as string | undefined) ||
      (authUser.user_metadata?.avatar_url as string | undefined) ||
      (authUser.user_metadata?.picture as string | undefined) ||
      null;
    let fullName: string | null =
      (authUser.user_metadata?.full_name as string | undefined) ??
      (authUser.user_metadata?.name as string | undefined) ??
      null;

    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role, status, profile_image_url')
        .eq('id', authUser.id)
        .maybeSingle();

      if (dbUser) {
        if (!rawRole && dbUser.role) {
          rawRole = dbUser.role;
        }
        if (dbUser.status) {
          userStatus = String(dbUser.status).toUpperCase();
        }
        if (dbUser.profile_image_url) {
          avatarUrl = dbUser.profile_image_url;
        }
      }
    } catch {
      // Ignore lookup error and proceed with available metadata
    }

    const userRole = (normalizeRole(rawRole) as Role) || "patient";

    if (!avatarUrl && (userRole === 'patient' || userRole === 'doctor')) {
      try {
        const table = userRole === 'patient' ? 'patients' : 'doctors';
        const { data: roleRow } = await supabase
          .from(table)
          .select('full_name, profile_picture_url')
          .eq('user_id', authUser.id)
          .maybeSingle();
        if (roleRow?.profile_picture_url) {
          avatarUrl = roleRow.profile_picture_url;
        }
        if (!fullName && roleRow?.full_name) {
          fullName = roleRow.full_name;
        }
      } catch {
        // Ignore fallback lookup error
      }
    }

    return {
      userRole,
      profile: {
        id: authUser.id,
        email: authUser.email ?? '',
        role: userRole,
        status: userStatus,
        full_name: fullName,
        avatar_url: avatarUrl,
        profile_image_url: avatarUrl,
        profile_picture_url: avatarUrl,
        user_metadata: authUser.user_metadata ?? {},
      },
    };
  }, []);

  const resolveUserFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setRole(null);
        setUser(null);
        return;
      }
      const { userRole, profile } = await buildHydratedProfile(data.user);
      setRole(userRole);
      setUser(profile);
    } catch {
      setRole(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [buildHydratedProfile]);

  useEffect(() => {
    resolveUserFromSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { userRole, profile } = await buildHydratedProfile(session.user);
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
  }, [resolveUserFromSupabase, buildHydratedProfile]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setRole(null);
      setUser(null);
    }
  }, []);

  const updateUserAvatar = useCallback((avatarUrl: string) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            avatar_url: avatarUrl,
            profile_image_url: avatarUrl,
            profile_picture_url: avatarUrl,
            user_metadata: {
              ...(prev.user_metadata || {}),
              avatar_url: avatarUrl,
              profile_image_url: avatarUrl,
              profile_picture_url: avatarUrl,
            },
          }
        : prev
    );
  }, []);

  const value = useMemo(
    () => ({
      role,
      user,
      isLoading,
      isAuthenticated: !!user && !!role,
      logout,
      refresh: resolveUserFromSupabase,
      updateUserAvatar,
    }),
    [role, user, isLoading, logout, resolveUserFromSupabase, updateUserAvatar]
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
