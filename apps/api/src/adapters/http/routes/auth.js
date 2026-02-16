import { createAuthRoutes } from '../controllers/auth.js';

export function createAuthHttpRoutes(context) {
  return createAuthRoutes(context);
}
