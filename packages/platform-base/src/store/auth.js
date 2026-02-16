export function createAuthFeature(state, _runtime) {
  return {
    async seedUser(user) {
      state.users.set(user.id, user);
    },
    async getUserByUsername(username) {
      for (const user of state.users.values()) {
        if (user.username === username) return user;
      }
      return null;
    },
    async getUserById(id) {
      return state.users.get(id) || null;
    },
    async saveRefreshToken(token, userId) {
      state.refreshTokens.set(token, userId);
    },
    async getRefreshTokenUser(token) {
      return state.refreshTokens.get(token) || null;
    },
    async revokeRefreshToken(token) {
      state.refreshTokens.delete(token);
    }
  };
}
