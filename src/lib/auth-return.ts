/** Only the public team invitation flow may override the normal login destination. */
export function invitationReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/invite/team?")) return null;
  try {
    const url = new URL(value, "https://link168.invalid");
    if (url.origin !== "https://link168.invalid" || url.pathname !== "/invite/team") return null;
    const token = url.searchParams.get("token");
    if (!token || !/^[a-zA-Z0-9_-]{32,256}$/.test(token)) return null;
    return `/invite/team?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}
