import { JwtPayload } from './jwt-auth.guard';

/**
 * Returns the "system scope" for a request, derived from the caller's role.
 *
 * A system-scoped role like `complaints.admin` is restricted to its own system:
 * the prefix before the first dot (`complaints`). Listing endpoints use this to
 * show only that system's roles/permissions (names starting with the prefix).
 *
 * Top-level roles without a dot (e.g. `admin`, `security_officer`) return
 * `null` — meaning no restriction, they see everything.
 */
export function roleScope(user?: JwtPayload): string | null {
  const name = user?.roleName;
  if (!name) return null;
  const dot = name.indexOf('.');
  return dot > 0 ? name.slice(0, dot) : null;
}
