export function createAuthD1(d1, D1_SQL, parseJsonSafe, ensureD1AppSchema) {
  return {
    async seedUser(user) {
      await ensureD1AppSchema();
      await d1.prepare(D1_SQL.upsertUser).bind(user.id, user.username, JSON.stringify(user)).run();
    },
    async getUserByUsername(username) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectUserByUsername).bind(username).first();
      return parseJsonSafe(row?.user_json);
    },
    async getUserById(id) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectUserById).bind(id).first();
      return parseJsonSafe(row?.user_json);
    },
    async saveRefreshToken(token, userId) {
      await ensureD1AppSchema();
      await d1.prepare(D1_SQL.upsertRefreshToken).bind(token, userId).run();
    },
    async getRefreshTokenUser(token) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectRefreshTokenUser).bind(token).first();
      return row?.user_id || null;
    },
    async revokeRefreshToken(token) {
      await ensureD1AppSchema();
      await d1.prepare(D1_SQL.deleteRefreshToken).bind(token).run();
    }
  };
}

export function createAuthKv(appKey, kvGetJson, kvGetString, kvPutJson, kvPutString, ensureKvSeeded, kvSeedUserFn, kvIndexAddFn) {
  return {
    async seedUser(user) {
      await ensureKvSeeded();
      await kvSeedUserFn(user, kvIndexAddFn);
    },
    async getUserByUsername(username) {
      await ensureKvSeeded();
      const userId = await kvGetString(appKey('user_by_username', username));
      if (!userId) return null;
      return kvGetJson(appKey('user', userId));
    },
    async getUserById(id) {
      await ensureKvSeeded();
      return kvGetJson(appKey('user', id));
    },
    async saveRefreshToken(token, userId) {
      await ensureKvSeeded();
      await kvPutString(appKey('refresh', token), userId);
    },
    async getRefreshTokenUser(token) {
      await ensureKvSeeded();
      return kvGetString(appKey('refresh', token));
    },
    async revokeRefreshToken(_token) {
      await ensureKvSeeded();
      // Note: kv.delete is handled at the store level
    }
  };
}
