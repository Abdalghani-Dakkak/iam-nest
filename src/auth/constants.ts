export const jwtConstants = {
  secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',

  expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 300),

  refreshSecret:
    process.env.JWT_REFRESH_SECRET ?? 'dev-only-refresh-secret-change-me',

  refreshExpiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN ?? 604800),
};

export const IS_PUBLIC_KEY = 'isPublic';
