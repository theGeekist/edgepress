import { createAccessToken } from '../auth.js';
import { error, json, readJson } from '../http.js';

function credentialsMatch(expected, supplied) {
  const a = String(expected ?? '');
  const b = String(supplied ?? '');
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export function createAuthRoutes({ runtime, store, route, authzErrorResponse }) {
  return [
    route('POST', '/v1/auth/token', async (request) => {
      try {
        const body = await readJson(request);
        const user = await store.getUserByUsername(body.username);
        // Production hardening should replace plaintext comparison with hashed+salted verification (argon2/bcrypt).
        if (!user || !credentialsMatch(user.password, body.password)) {
          return error('AUTH_INVALID', 'Invalid credentials', 401);
        }

        const accessToken = await createAccessToken(runtime, user);
        const refreshToken = `r_${runtime.uuid()}`;
        await store.saveRefreshToken(refreshToken, user.id);

        return json({
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            capabilities: user.capabilities
          }
        });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/auth/refresh', async (request) => {
      try {
        const body = await readJson(request);
        const userId = await store.getRefreshTokenUser(body.refreshToken);
        if (!userId) return error('AUTH_INVALID_REFRESH', 'Refresh token invalid', 401);
        const user = await store.getUserById(userId);
        if (!user) return error('AUTH_USER_NOT_FOUND', 'User not found', 401);

        const accessToken = await createAccessToken(runtime, user);
        const nextRefreshToken = `r_${runtime.uuid()}`;
        await store.revokeRefreshToken(body.refreshToken);
        await store.saveRefreshToken(nextRefreshToken, user.id);

        return json({ accessToken, refreshToken: nextRefreshToken });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/auth/logout', async (request) => {
      try {
        const body = await readJson(request);
        if (body.refreshToken) await store.revokeRefreshToken(body.refreshToken);
        return json({ ok: true });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
