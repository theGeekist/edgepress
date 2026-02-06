import { createAccessToken } from '../auth.js';
import { error, json, readJson } from '../http.js';

export function createAuthRoutes({ runtime, store, route }) {
  return [
    route('POST', '/v1/auth/token', async (request) => {
      const body = await readJson(request);
      const user = await store.getUserByUsername(body.username);
      if (!user || user.password !== body.password) {
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
    }),

    route('POST', '/v1/auth/refresh', async (request) => {
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
    }),

    route('POST', '/v1/auth/logout', async (request) => {
      const body = await readJson(request);
      if (body.refreshToken) await store.revokeRefreshToken(body.refreshToken);
      return json({ ok: true });
    })
  ];
}
