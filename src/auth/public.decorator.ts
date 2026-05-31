import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './constants';

/**
 * Marks a route (or controller) as exempt from the global JwtAuthGuard,
 * so it can be reached without a Bearer token.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
