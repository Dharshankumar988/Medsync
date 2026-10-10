/**
 * Utility to format and normalize doctor names.
 * - Strips any redundant or repeated prefixes like "Dr. Dr.", "Dr. Dr ", "Dr. ", "Dr "
 * - Ensures a clean, single "Dr. [Name]" format.
 * - If name is missing, falls back to "Doctor".
 */
export function formatDoctorName(name?: string | null): string {
  if (!name || !name.trim()) return "Doctor";
  const trimmed = name.trim();
  // Strip all repeating "Dr." or "Dr" prefixes at start of string (case-insensitive)
  const stripped = trimmed.replace(/^(Dr\.?\s*)+/i, "").trim();
  if (!stripped) return "Doctor";
  return `Dr. ${stripped}`;
}

/**
 * Deduplicates an array of doctor objects by their ID or user_id.
 * Prevents repeating doctors in listings and dropdowns.
 */
export function deduplicateDoctors<T extends { id?: string; user_id?: string }>(doctors: T[]): T[] {
  const seen = new Set<string>();
  return (doctors || []).filter((doc) => {
    const key = doc.user_id || doc.id;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
