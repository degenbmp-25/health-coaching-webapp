// Simple client-side authentication utilities
// NOTE: This is client-side auth for internal tools only.
// For production apps or high-value targets, use proper server-side auth (NextAuth, etc.)
// Client-side auth with hardcoded passwords can be trivially bypassed by viewing source.

const AUTH_KEY = 'habithletics_auth';

// Client passwords loaded from environment variable for easier deployment
// Format: NEXT_PUBLIC_CLIENT_PASSWORDS='{"demo":"workout2024","client1":"password123"}'
// Fallback defaults for development
const DEFAULT_PASSWORDS: Record<string, string> = {
  'demo': 'workout2024',
  'client1': 'password123',
  'beastmode': 'stronglift',
};

function getClientPasswords(): Record<string, string> {
  if (typeof window === 'undefined') return DEFAULT_PASSWORDS;
  
  try {
    const envVar = process.env.NEXT_PUBLIC_CLIENT_PASSWORDS;
    if (envVar) {
      return JSON.parse(envVar);
    }
  } catch (e) {
    console.error('Failed to parse NEXT_PUBLIC_CLIENT_PASSWORDS:', e);
  }
  return DEFAULT_PASSWORDS;
}

export function authenticate(password: string): boolean {
  const passwords = getClientPasswords();
  const valid = Object.values(passwords).includes(password);
  if (valid) {
    localStorage.setItem(AUTH_KEY, 'authenticated');
  }
  return valid;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_KEY) === 'authenticated';
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}
