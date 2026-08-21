export const OWNER_EMAIL = 'William.chen@utah.edu';

export function isOwnerEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
}

export function isGitHubProvider(appMetadata: Record<string, unknown> | undefined) {
  if (!appMetadata) return false;

  if (appMetadata.provider === 'github') return true;

  return Array.isArray(appMetadata.providers) && appMetadata.providers.includes('github');
}
