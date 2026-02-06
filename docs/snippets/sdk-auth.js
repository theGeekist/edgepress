import { createClient } from "../../packages/sdk/src/client.js";

const client = createClient({
  baseUrl: "http://localhost:8787"
});

const login = await client.token({ username: "admin", password: "admin" });

// Refresh exchanges refreshToken for a new access token.
await client.refresh({ refreshToken: login.refreshToken });

// Logout revokes the refresh token.
await client.logout({ refreshToken: login.refreshToken });
