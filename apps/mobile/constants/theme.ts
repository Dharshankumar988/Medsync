// ─── MedSync Mobile Design Tokens ───────────────────────────────────────────
// Mirrors the web app's globals.css and Tailwind config exactly.

export const Colors = {
  // ── Core surfaces ──
  background:       '#0A0A0A',   // Root page background
  card:             '#141414',   // Card surface
  cardElevated:     '#1C1C1C',   // Slightly lighter card (inner sections)
  input:            '#1C1C1E',   // Input field background
  muted:            '#1C1C1E',   // Muted surface

  // ── Borders ──
  border:           'rgba(255,255,255,0.08)',   // Default card border (matches border/60 in dark)
  borderStrong:     'rgba(255,255,255,0.14)',   // Focused / hover border
  divider:          'rgba(255,255,255,0.06)',   // Between items

  // ── Text ──
  text:             '#F5F5F5',   // Primary text
  textSecondary:    '#A1A1AA',   // Secondary text (zinc-400)
  textMuted:        '#71717A',   // Muted text (zinc-500)
  textSubtle:       '#52525B',   // Very muted (zinc-600)

  // ─────────────────────────────────────────────────────────────────────────
  // Role accent palettes — each role has a primary color that drives the
  // entire UI: tab bar active, stat icons, badges, buttons, glow, labels.
  // Matches the web's --role-primary CSS variables.
  // ─────────────────────────────────────────────────────────────────────────
  roles: {
    patient: {
      primary:      '#3B82F6',   // blue-500
      primaryDim:   '#2563EB',   // blue-600 (darker button)
      bg:           'rgba(59,130,246,0.10)',
      bgGlow:       'rgba(59,130,246,0.04)',
      bgGlowStrong: 'rgba(59,130,246,0.08)',
      text:         '#60A5FA',   // blue-400 (on dark bg)
      badgeBg:      'rgba(59,130,246,0.10)',
      badgeText:    '#60A5FA',
      badgeBorder:  'rgba(59,130,246,0.20)',
    },
    doctor: {
      primary:      '#10B981',   // emerald-500
      primaryDim:   '#059669',   // emerald-600
      bg:           'rgba(16,185,129,0.10)',
      bgGlow:       'rgba(16,185,129,0.04)',
      bgGlowStrong: 'rgba(16,185,129,0.08)',
      text:         '#34D399',   // emerald-400
      badgeBg:      'rgba(16,185,129,0.10)',
      badgeText:    '#34D399',
      badgeBorder:  'rgba(16,185,129,0.20)',
    },
    pharmacy: {
      primary:      '#F59E0B',   // amber-500
      primaryDim:   '#D97706',   // amber-600
      bg:           'rgba(245,158,11,0.10)',
      bgGlow:       'rgba(245,158,11,0.04)',
      bgGlowStrong: 'rgba(245,158,11,0.08)',
      text:         '#FBBF24',   // amber-400
      badgeBg:      'rgba(245,158,11,0.10)',
      badgeText:    '#FBBF24',
      badgeBorder:  'rgba(245,158,11,0.20)',
    },
    hospital: {
      primary:      '#8B5CF6',   // violet-500 (purple)
      primaryDim:   '#7C3AED',   // violet-600
      bg:           'rgba(139,92,246,0.10)',
      bgGlow:       'rgba(139,92,246,0.04)',
      bgGlowStrong: 'rgba(139,92,246,0.08)',
      text:         '#A78BFA',   // violet-400
      badgeBg:      'rgba(139,92,246,0.10)',
      badgeText:    '#A78BFA',
      badgeBorder:  'rgba(139,92,246,0.20)',
    },
    admin: {
      primary:      '#EF4444',   // red-500
      primaryDim:   '#DC2626',   // red-600
      bg:           'rgba(239,68,68,0.10)',
      bgGlow:       'rgba(239,68,68,0.04)',
      bgGlowStrong: 'rgba(239,68,68,0.08)',
      text:         '#F87171',   // red-400
      badgeBg:      'rgba(239,68,68,0.10)',
      badgeText:    '#F87171',
      badgeBorder:  'rgba(239,68,68,0.20)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Semantic palettes — used for status badges, stat card icons, etc.
  // Each has: primary (full color), bg (10% opacity), text (lighter shade),
  // border (20% opacity).
  // ─────────────────────────────────────────────────────────────────────────
  emerald: {
    primary:  '#10B981',
    bg:       'rgba(16,185,129,0.10)',
    text:     '#34D399',
    border:   'rgba(16,185,129,0.20)',
  },
  blue: {
    primary:  '#3B82F6',
    bg:       'rgba(59,130,246,0.10)',
    text:     '#60A5FA',
    border:   'rgba(59,130,246,0.20)',
  },
  amber: {
    primary:  '#F59E0B',
    bg:       'rgba(245,158,11,0.10)',
    text:     '#FBBF24',
    border:   'rgba(245,158,11,0.20)',
  },
  red: {
    primary:  '#EF4444',
    bg:       'rgba(239,68,68,0.10)',
    text:     '#F87171',
    border:   'rgba(239,68,68,0.20)',
  },
  violet: {
    primary:  '#8B5CF6',
    bg:       'rgba(139,92,246,0.10)',
    text:     '#A78BFA',
    border:   'rgba(139,92,246,0.20)',
  },
  orange: {
    primary:  '#F97316',
    bg:       'rgba(249,115,22,0.10)',
    text:     '#FB923C',
    border:   'rgba(249,115,22,0.20)',
  },
  indigo: {
    primary:  '#6366F1',
    bg:       'rgba(99,102,241,0.10)',
    text:     '#818CF8',
    border:   'rgba(99,102,241,0.20)',
  },
} as const;

// ── Spacing scale (4px grid) ──────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 48,
  hero: 64,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,   // rounded-2xl equivalent — most cards
  xl:   20,
  full: 999,
} as const;

// ── Typography ────────────────────────────────────────────────────────────
// Matches web's Tailwind typography classes exactly
export const Typography = {
  // Tiny role/page label above page titles: "PATIENT DASHBOARD"
  label: {
    fontSize:       11,
    fontWeight:     '600' as const,
    letterSpacing:  1.5,
    textTransform:  'uppercase' as const,
  },
  // Page main title: "Clinical Overview"
  h1: {
    fontSize:       28,
    fontWeight:     '700' as const,
    letterSpacing:  -0.5,
    lineHeight:     36,
  },
  // Section headers: "Recent Activity"
  h2: {
    fontSize:       18,
    fontWeight:     '600' as const,
    letterSpacing:  -0.2,
    lineHeight:     26,
  },
  // Card titles, list item names
  h3: {
    fontSize:       15,
    fontWeight:     '600' as const,
    lineHeight:     22,
  },
  // Stat card value: "12"
  statValue: {
    fontSize:       26,
    fontWeight:     '700' as const,
    letterSpacing:  -0.8,
  },
  // Body text
  body: {
    fontSize:       14,
    fontWeight:     '400' as const,
    lineHeight:     20,
  },
  bodyMedium: {
    fontSize:       14,
    fontWeight:     '500' as const,
    lineHeight:     20,
  },
  bodySemibold: {
    fontSize:       14,
    fontWeight:     '600' as const,
    lineHeight:     20,
  },
  // Captions, subtitles, muted descriptions
  caption: {
    fontSize:       12,
    fontWeight:     '400' as const,
    lineHeight:     16,
  },
  captionMedium: {
    fontSize:       12,
    fontWeight:     '500' as const,
    lineHeight:     16,
  },
  // Badge / pill labels
  badge: {
    fontSize:       11,
    fontWeight:     '600' as const,
    letterSpacing:  0.3,
  },
  // Monospace (IDs, hashes, PIN dots)
  mono: {
    fontSize:       12,
    fontFamily:     'monospace' as const,
    letterSpacing:  0.5,
  },
} as const;

// ── Shadow presets ────────────────────────────────────────────────────────
export const Shadows = {
  card: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius:  12,
    elevation:     6,
  },
  cardSubtle: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius:  6,
    elevation:     3,
  },
  button: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius:  4,
    elevation:     4,
  },
} as const;

// ── Status badge color map ─────────────────────────────────────────────────
// Matches the web's statusColors object for appointments / orders
export const StatusColors: Record<string, { bg: string; text: string; border: string }> = {
  PENDING:         Colors.amber,
  CONFIRMED:       Colors.blue,
  COMPLETED:       Colors.emerald,
  CANCELLED:       Colors.red,
  REJECTED:        Colors.red,
  RESCHEDULED:     Colors.violet,
  NO_SHOW:         { bg: 'rgba(113,113,122,0.10)', text: '#A1A1AA', border: 'rgba(113,113,122,0.20)' },
  // Order statuses
  ACCEPTED:        Colors.blue,
  PACKED:          Colors.indigo,
  OUT_FOR_DELIVERY:Colors.orange,
  DELIVERED:       Colors.emerald,
  DISPENSED:       Colors.emerald,
  ACTIVE:          Colors.emerald,
  REVOKED:         Colors.red,
  EXPIRED:         Colors.amber,
};

export const getRoleTheme = (role?: string | null) => {
  if (!role) return Colors.roles.patient;
  const key = role.toLowerCase() as keyof typeof Colors.roles;
  return Colors.roles[key] ?? Colors.roles.patient;
};
