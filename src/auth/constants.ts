// JWT config. Falls back to dev secrets so the app runs out of the box;
// set JWT_SECRET / JWT_REFRESH_SECRET (and optionally the *_EXPIRES_IN vars)
// in the environment for any real deployment. Use a DIFFERENT value for the
// refresh secret so an access token can never be replayed as a refresh token.
export const jwtConstants = {
  // Access token: short-lived, sent on every request.
  secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  // Access token lifetime in seconds (default 5 minutes).
  expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 300),
  // Refresh token: long-lived, exchanged at /auth/refresh for a new pair.
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ?? 'dev-only-refresh-secret-change-me',
  // Refresh token lifetime in seconds (default 7 days).
  refreshExpiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN ?? 604800),
};

// Metadata key used by @Public() and read by JwtAuthGuard.
export const IS_PUBLIC_KEY = 'isPublic';
