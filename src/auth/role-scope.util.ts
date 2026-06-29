import { JwtPayload } from './jwt-auth.guard';

export function roleScope(user?: JwtPayload): string | null {
  const name = user?.roleName;
  if (!name) return null;
  const dot = name.indexOf('.');
  return dot > 0 ? name.slice(0, dot) : null;
}
