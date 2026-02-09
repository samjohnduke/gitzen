import { createMiddleware } from "hono/factory";
import type {
  Env,
  AuthContext,
  LegacySessionData,
  SessionRecord,
  UserRecord,
  ApiTokenRecord,
} from "../types.js";
import { encrypt, decrypt, hmacVerify } from "../lib/crypto.js";

type AuthEnv = {
  Bindings: Env;
  Variables: {
    auth: AuthContext;
    // Legacy aliases — routes can use c.var.auth going forward
    githubToken: string;
    githubUsername: string;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer cms_")) {
    // CMS API token path
    const auth = await resolveApiToken(
      authHeader.slice(7),
      c.env.API_TOKEN_SECRET,
      c.env.ENCRYPTION_KEY,
      c.env.CMS_DATA
    );
    if (!auth) return c.json({ error: "Invalid or expired API token" }, 401);

    c.set("auth", auth);
    c.set("githubToken", auth.githubToken);
    c.set("githubUsername", auth.githubUsername);
    return next();
  }

  if (authHeader?.startsWith("Bearer ghp_")) {
    return c.json(
      {
        error:
          "Raw GitHub tokens are no longer accepted. Create a CMS API token at /settings/tokens.",
      },
      401
    );
  }

  // Session cookie path
  const sessionId = getCookie(c.req.raw, "cms_session");
  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const raw = await c.env.SESSIONS.get(sessionId, "text");
  if (!raw) return c.json({ error: "Unauthorized" }, 401);

  const parsed = JSON.parse(raw) as LegacySessionData | SessionRecord;

  let auth: AuthContext;

  if ("githubToken" in parsed) {
    // Legacy session — lazily migrate
    auth = await migrateLegacySession(
      sessionId,
      parsed as LegacySessionData,
      c.env
    );
  } else {
    // New-format session
    const session = parsed as SessionRecord;

    if (new Date(session.expiresAt) < new Date()) {
      await c.env.SESSIONS.delete(sessionId);
      return c.json({ error: "Session expired" }, 401);
    }

    const userRecord = await c.env.CMS_DATA.get<UserRecord>(
      `user:${session.userId}`,
      "json"
    );
    if (!userRecord) return c.json({ error: "User not found" }, 401);

    let githubToken = await decrypt(
      userRecord.encryptedGithubToken,
      c.env.ENCRYPTION_KEY
    );

    // Refresh GitHub token if expiring soon
    githubToken = await maybeRefreshToken(userRecord, githubToken, c.env);

    auth = {
      userId: userRecord.githubUserId,
      githubUsername: userRecord.githubUsername,
      githubToken,
      authMethod: "session",
    };
  }

  c.set("auth", auth);
  c.set("githubToken", auth.githubToken);
  c.set("githubUsername", auth.githubUsername);
  return next();
});

// --- API Token resolution ---

async function resolveApiToken(
  fullToken: string,
  apiTokenSecret: string,
  encryptionKey: string,
  kvData: KVNamespace
): Promise<AuthContext | null> {
  // Format: cms_{token_id}.{hmac_hex}
  const withoutPrefix = fullToken.slice(4); // strip "cms_"
  const dotIndex = withoutPrefix.indexOf(".");
  if (dotIndex === -1) return null;

  const tokenId = withoutPrefix.slice(0, dotIndex);
  const hmac = withoutPrefix.slice(dotIndex + 1);

  // Constant-time HMAC verification
  const valid = await hmacVerify(tokenId, hmac, apiTokenSecret);
  if (!valid) return null;

  // Look up token record
  const record = await kvData.get<ApiTokenRecord>(
    `api-token:${tokenId}`,
    "json"
  );
  if (!record) return null;

  // Check expiry — clean up expired tokens
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    await kvData.delete(`api-token:${tokenId}`).catch(() => {});
    // Best-effort cleanup of user token index
    const indexKey = `user-tokens:${record.userId}`;
    const index = await kvData.get<{ tokenIds: string[] }>(indexKey, "json").catch(() => null);
    if (index) {
      index.tokenIds = index.tokenIds.filter((id) => id !== tokenId);
      await kvData.put(indexKey, JSON.stringify(index)).catch(() => {});
    }
    return null;
  }

  // Look up user
  const userRecord = await kvData.get<UserRecord>(
    `user:${record.userId}`,
    "json"
  );
  if (!userRecord) return null;

  const githubToken = await decrypt(
    userRecord.encryptedGithubToken,
    encryptionKey
  );

  // Update lastUsedAt (best-effort, awaited to avoid dangling promises)
  const updated: ApiTokenRecord = {
    ...record,
    lastUsedAt: new Date().toISOString(),
  };
  await kvData.put(`api-token:${tokenId}`, JSON.stringify(updated)).catch(() => {});

  return {
    userId: record.userId,
    githubUsername: userRecord.githubUsername,
    githubToken,
    authMethod: "api-token",
    tokenScope: {
      repos: record.repos,
      permissions: record.permissions,
    },
  };
}

// --- Legacy session migration ---

async function migrateLegacySession(
  sessionId: string,
  legacy: LegacySessionData,
  env: Env
): Promise<AuthContext> {
  // Fetch GitHub user ID (immutable, needed as UserRecord key)
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${legacy.githubToken}`,
      "User-Agent": "samduke-cms",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch GitHub user during migration");
  }

  const ghUser = (await res.json()) as { id: number; login: string };
  const userId = String(ghUser.id);

  // Create or update UserRecord
  const existing = await env.CMS_DATA.get<UserRecord>(
    `user:${userId}`,
    "json"
  );

  const encryptedGithubToken = await encrypt(
    legacy.githubToken,
    env.ENCRYPTION_KEY
  );

  const userRecord: UserRecord = existing
    ? {
        ...existing,
        githubUsername: ghUser.login,
        encryptedGithubToken,
        updatedAt: new Date().toISOString(),
      }
    : {
        githubUserId: userId,
        githubUsername: ghUser.login,
        encryptedGithubToken,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  await env.CMS_DATA.put(`user:${userId}`, JSON.stringify(userRecord));

  // Rewrite session to new format
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const newSession: SessionRecord = {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  await env.SESSIONS.put(sessionId, JSON.stringify(newSession), {
    expirationTtl: 60 * 60 * 24 * 30,
  });

  return {
    userId,
    githubUsername: ghUser.login,
    githubToken: legacy.githubToken,
    authMethod: "session",
  };
}

// --- Token refresh ---

async function maybeRefreshToken(
  userRecord: UserRecord,
  currentToken: string,
  env: Env
): Promise<string> {
  if (!userRecord.tokenExpiresAt || !userRecord.encryptedRefreshToken) {
    return currentToken;
  }

  const expiresAt = new Date(userRecord.tokenExpiresAt);
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinFromNow) {
    return currentToken;
  }

  try {
    const refreshToken = await decrypt(
      userRecord.encryptedRefreshToken,
      env.ENCRYPTION_KEY
    );

    const res = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_APP_CLIENT_ID,
          client_secret: env.GITHUB_APP_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      }
    );

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) return currentToken;

    const newEncryptedToken = await encrypt(
      data.access_token,
      env.ENCRYPTION_KEY
    );
    const newEncryptedRefresh = data.refresh_token
      ? await encrypt(data.refresh_token, env.ENCRYPTION_KEY)
      : userRecord.encryptedRefreshToken;
    const newExpiry = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    const updated: UserRecord = {
      ...userRecord,
      encryptedGithubToken: newEncryptedToken,
      encryptedRefreshToken: newEncryptedRefresh,
      tokenExpiresAt: newExpiry,
      updatedAt: new Date().toISOString(),
    };

    await env.CMS_DATA.put(
      `user:${userRecord.githubUserId}`,
      JSON.stringify(updated)
    ).catch(() => {});

    return data.access_token;
  } catch {
    return currentToken;
  }
}

function getCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
