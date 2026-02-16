export function createAuthFeature({ runtime, store }) {
  function credentialsMatch(expected, supplied) {
    const a = String(expected ?? '');
    const b = String(supplied ?? '');
    let diff = a.length ^ b.length;
    for (let index = 0; index < a.length; index += 1) {
      diff |= a.charCodeAt(index) ^ (b.charCodeAt(index) || 0);
    }
    return diff === 0;
  }

  async function login({ username, password, createAccessToken }) {
    const user = await store.getUserByUsername(username);
    if (!user || !credentialsMatch(user.password, password)) {
      return { error: { code: 'AUTH_INVALID', message: 'Invalid credentials', status: 401 } };
    }

    const accessToken = await createAccessToken(runtime, user);
    const refreshToken = `r_${runtime.uuid()}`;
    await store.saveRefreshToken(refreshToken, user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        capabilities: user.capabilities
      }
    };
  }

  async function refresh({ refreshToken, createAccessToken }) {
    const userId = await store.getRefreshTokenUser(refreshToken);
    if (!userId) return { error: { code: 'AUTH_INVALID_REFRESH', message: 'Refresh token invalid', status: 401 } };
    const user = await store.getUserById(userId);
    if (!user) return { error: { code: 'AUTH_USER_NOT_FOUND', message: 'User not found', status: 401 } };

    const accessToken = await createAccessToken(runtime, user);
    const nextRefreshToken = `r_${runtime.uuid()}`;
    await store.saveRefreshToken(nextRefreshToken, user.id);
    await store.revokeRefreshToken(refreshToken);

    return { accessToken, refreshToken: nextRefreshToken };
  }

  async function logout({ refreshToken }) {
    if (refreshToken) await store.revokeRefreshToken(refreshToken);
    return { ok: true };
  }

  return {
    login,
    refresh,
    logout
  };
}
