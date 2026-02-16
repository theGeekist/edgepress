import { createAccessToken } from '@geekist/edgepress/api-core/auth.js';
import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { createAuthFeature } from '@geekist/edgepress/auth';

export function createAuthRoutes({ runtime, store, route, authzErrorResponse }) {
  const auth = createAuthFeature({ runtime, store });

  return [
    route('POST', '/v1/auth/token', async (request) => {
      try {
        const body = await readJson(request);
        const result = await auth.login({
          username: body.username,
          password: body.password,
          createAccessToken
        });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/auth/refresh', async (request) => {
      try {
        const body = await readJson(request);
        const result = await auth.refresh({ refreshToken: body.refreshToken, createAccessToken });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/auth/logout', async (request) => {
      try {
        const body = await readJson(request);
        return json(await auth.logout({ refreshToken: body.refreshToken }));
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
