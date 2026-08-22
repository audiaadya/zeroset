// Hosts are identified by their Supabase auth email. Only these accounts can
// publish the official "Current Week" bundle. Anyone else can create Community
// Sets under /community.
//
// To add another host, append the email to this array. The match is
// case-insensitive.
export const HOST_EMAILS: string[] = ['miadayshaar2@gmail.com'];

// Display name shown for the host on official bundles.
export const HOST_DISPLAY_NAME = 'audi.aadya';

export function isHostEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  return HOST_EMAILS.some((h) => h.toLowerCase() === norm);
}
