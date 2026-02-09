import { Hono } from "hono";
import type { Env, UserRecord } from "../types.js";
import { encrypt, generateRandomHex, hmacSign } from "../lib/crypto.js";
import type { ApiTokenRecord, UserTokenIndex } from "../types.js";

type DeviceAuthApp = { Bindings: Env };

const deviceAuth = new Hono<DeviceAuthApp>();

// Step 1: Initiate device code flow
deviceAuth.post("/device", async (c) => {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_APP_CLIENT_ID,
    }),
  });

  if (!res.ok) {
    return c.json({ error: "Failed to initiate device flow" }, 502);
  }

  const data = (await res.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };

  return c.json({
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval,
  });
});

// Step 2: Poll for token (called by native app)
deviceAuth.post("/device/token", async (c) => {
  const { deviceCode } = await c.req.json<{ deviceCode: string }>();

  if (!deviceCode) {
    return c.json({ error: "deviceCode is required" }, 400);
  }

  const res = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: c.env.GITHUB_APP_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    }
  );

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
    interval?: number;
  };

  // GitHub returns specific errors during the polling phase
  if (data.error === "authorization_pending") {
    return c.json({ status: "pending" }, 200);
  }

  if (data.error === "slow_down") {
    return c.json(
      { status: "slow_down", interval: data.interval },
      200
    );
  }

  if (data.error === "expired_token") {
    return c.json({ status: "expired" }, 410);
  }

  if (data.error === "access_denied") {
    return c.json({ status: "denied" }, 403);
  }

  if (data.error || !data.access_token) {
    return c.json(
      { error: data.error_description ?? data.error ?? "Unknown error" },
      400
    );
  }

  // Success — create user record and CMS API token
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${data.access_token}`,
      "User-Agent": "samduke-cms",
    },
  });

  if (!userRes.ok) {
    return c.json({ error: "Failed to fetch GitHub user" }, 502);
  }

  const user = (await userRes.json()) as { id: number; login: string };
  const userId = String(user.id);

  // Encrypt and store tokens
  const encryptedGithubToken = await encrypt(
    data.access_token,
    c.env.ENCRYPTION_KEY
  );

  const encryptedRefreshToken = data.refresh_token
    ? await encrypt(data.refresh_token, c.env.ENCRYPTION_KEY)
    : null;

  const tokenExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  const existing = await c.env.CMS_DATA.get<UserRecord>(
    `user:${userId}`,
    "json"
  );

  const userRecord: UserRecord = {
    githubUserId: userId,
    githubUsername: user.login,
    encryptedGithubToken,
    encryptedRefreshToken,
    tokenExpiresAt,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await c.env.CMS_DATA.put(`user:${userId}`, JSON.stringify(userRecord));

  // Generate a CMS API token (all repos, safe permissions, 30-day expiry)
  const tokenId = generateRandomHex(20);
  const hmac = await hmacSign(tokenId, c.env.API_TOKEN_SECRET);
  const fullToken = `cms_${tokenId}.${hmac}`;

  const thirtyDays = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const apiToken: ApiTokenRecord = {
    tokenId,
    userId,
    name: `Device: ${user.login}`,
    repos: ["*"],
    permissions: [
      "content:read",
      "content:write",
      "config:read",
      "repos:read",
    ],
    createdAt: new Date().toISOString(),
    expiresAt: thirtyDays,
    lastUsedAt: null,
  };

  await c.env.CMS_DATA.put(
    `api-token:${tokenId}`,
    JSON.stringify(apiToken)
  );

  // Update user token index
  const indexKey = `user-tokens:${userId}`;
  const index = await c.env.CMS_DATA.get<UserTokenIndex>(indexKey, "json");
  const tokenIds = index?.tokenIds ?? [];
  tokenIds.push(tokenId);
  await c.env.CMS_DATA.put(indexKey, JSON.stringify({ tokenIds }));

  return c.json({
    status: "success",
    token: fullToken,
    expiresAt: thirtyDays,
    username: user.login,
  });
});

export default deviceAuth;
