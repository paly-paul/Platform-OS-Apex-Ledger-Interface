/**
 * TEMPORARY / DEV-ONLY — hardcoded credentials for frontend dev iteration.
 *
 * These are NOT production auth. When the FastAPI backend auth endpoints are
 * wired in, delete this file and replace all references to DEV_CREDENTIALS
 * with a real /auth/login API call. Do not ship this to production.
 */
export const DEV_CREDENTIALS = {
  username: 'analyst@apexledger.dev',
  password: 'apex2025',
} as const;
