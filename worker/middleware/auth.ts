import { createMiddleware } from "hono/factory";
import type {
  AppVariables,
  AuthContext,
  SessionRecord,
  UserRecord,
  ApiTokenRecord,
} from "../types.js";
import type { KVStore } from "../lib/kv.js";
import type { AppConfig } from "../lib/config.js";
import type { RequestLogger } from "../lib/logger.js";
import { encrypt, decrypt, hmacVerify } from "../lib/crypto.js";

type AuthEnv = {
  Variables: AppVariables;
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  const logger: RequestLogger | undefined = c.var.logger;

  if (authHeader?.startsWith("Bearer cms_")) {
    // CMS API token path
    const auth = await resolveApiToken(
      authHeader.slice(7),
      c.var.config.apiTokenSecret,
      c.var.config.encryptionKey,
      c.var.data,
      logger
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

  const raw = await c.var.sessions.getText(sessionId);
  if (!raw) return c.json({ error: "Unauthorized" }, 401);

  const session = JSON.parse(raw) as SessionRecord;

  if (new Date(session.expiresAt) < new Date()) {
    await c.var.sessions.delete(sessionId);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userRecord = await c.var.data.getJSON<UserRecord>(
    `user:${session.userId}`,
  );
  if (!userRecord) return c.json({ error: "Unauthorized" }, 401);

  let githubToken = await decrypt(
    userRecord.encryptedGithubToken,
    c.var.config.encryptionKey
  );

  // Refresh GitHub token if expiring soon
  githubToken = await maybeRefreshToken(
    userRecord,
    githubToken,
    { data: c.var.data, config: c.var.config },
    logger,
  );

  const auth: AuthContext = {
    userId: userRecord.githubUserId,
    githubUsername: userRecord.githubUsername,
    githubToken,
    authMethod: "session",
  };

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
  kvData: KVStore,
  logger?: RequestLogger
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
  const record = await kvData.getJSON<ApiTokenRecord>(
    `api-token:${tokenId}`,
  );
  if (!record) return null;

  // Check expiry — clean up expired tokens
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    await kvData.delete(`api-token:${tokenId}`).catch((e) => {
      logger?.warn("kv_delete_failed", { key: `api-token:${tokenId}`, error: String(e) });
    });
    // Best-effort cleanup of user token index
    const indexKey = `user-tokens:${record.userId}`;
    const index = await kvData.getJSON<{ tokenIds: string[] }>(indexKey).catch((e) => {
      logger?.warn("kv_get_failed", { key: indexKey, error: String(e) });
      return null;
    });
    if (index) {
      index.tokenIds = index.tokenIds.filter((id) => id !== tokenId);
      await kvData.put(indexKey, JSON.stringify(index)).catch((e) => {
        logger?.warn("kv_put_failed", { key: indexKey, error: String(e) });
      });
    }
    return null;
  }

  // Look up user
  const userRecord = await kvData.getJSON<UserRecord>(
    `user:${record.userId}`,
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
  await kvData.put(`api-token:${tokenId}`, JSON.stringify(updated)).catch((e) => {
    logger?.warn("kv_put_failed", { key: `api-token:${tokenId}`, error: String(e) });
  });

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

// --- Token refresh ---

async function maybeRefreshToken(
  userRecord: UserRecord,
  currentToken: string,
  deps: { data: KVStore; config: AppConfig },
  logger?: RequestLogger
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
      deps.config.encryptionKey
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
          client_id: deps.config.githubAppClientId,
          client_secret: deps.config.githubAppClientSecret,
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
      deps.config.encryptionKey
    );
    const newEncryptedRefresh = data.refresh_token
      ? await encrypt(data.refresh_token, deps.config.encryptionKey)
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

    await deps.data.put(
      `user:${userRecord.githubUserId}`,
      JSON.stringify(updated)
    ).catch((e) => {
      logger?.warn("kv_put_failed", { key: `user:${userRecord.githubUserId}`, error: String(e) });
    });

    return data.access_token;
  } catch (e) {
    logger?.warn("token_refresh_failed", { userId: userRecord.githubUserId, error: String(e) });
    return currentToken;
  }
}

function getCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
