import { Hono } from "hono";
import type { Env, SessionData } from "../types.js";

type AuthApp = { Bindings: Env };

const auth = new Hono<AuthApp>();

auth.get("/login", (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const callbackUrl = new URL("/auth/callback", c.req.url).toString();
  const state = crypto.randomUUID();

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", "repo");
  url.searchParams.set("state", state);

  // Store state for CSRF validation
  const isLocalhost = new URL(c.req.url).hostname === "localhost";
  const secure = isLocalhost ? "" : " Secure;";
  const response = c.redirect(url.toString());
  response.headers.set(
    "Set-Cookie",
    `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=600`
  );
  return response;
});

auth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return c.text("Missing code or state", 400);
  }

  // Validate CSRF state
  const cookies = c.req.header("Cookie") ?? "";
  const stateMatch = cookies.match(/oauth_state=([^;]*)/);
  const storedState = stateMatch ? stateMatch[1] : null;

  if (state !== storedState) {
    return c.text("Invalid state parameter", 400);
  }

  // Exchange code for token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    console.error("GitHub token exchange failed:", tokenData);
    return c.json(
      {
        error: "Failed to get access token",
        github_error: tokenData.error,
        github_error_description: (tokenData as Record<string, unknown>).error_description,
      },
      400
    );
  }

  // Get user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "samduke-cms",
    },
  });

  if (!userRes.ok) {
    return c.text("Failed to verify GitHub user", 400);
  }

  const user = (await userRes.json()) as { login: string };

  // Create session
  const sessionId = crypto.randomUUID();
  const session: SessionData = {
    githubToken: tokenData.access_token,
    githubUsername: user.login,
    createdAt: new Date().toISOString(),
  };

  await c.env.SESSIONS.put(sessionId, JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 30, // 30 days
  });

  const isLocal = new URL(c.req.url).hostname === "localhost";
  const sec = isLocal ? "" : " Secure;";
  const headers = new Headers();
  headers.set("Location", "/");
  headers.set(
    "Set-Cookie",
    `cms_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax;${sec} Max-Age=${60 * 60 * 24 * 30}`
  );
  // Clear oauth state cookie
  headers.append(
    "Set-Cookie",
    `oauth_state=; Path=/; HttpOnly; SameSite=Lax;${sec} Max-Age=0`
  );

  return new Response(null, { status: 302, headers });
});

auth.post("/logout", async (c) => {
  const cookies = c.req.header("Cookie") ?? "";
  const sessionMatch = cookies.match(/cms_session=([^;]*)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (sessionId) {
    await c.env.SESSIONS.delete(sessionId);
  }

  const isLocal = new URL(c.req.url).hostname === "localhost";
  const sec = isLocal ? "" : " Secure;";
  const headers = new Headers();
  headers.set(
    "Set-Cookie",
    `cms_session=; Path=/; HttpOnly; SameSite=Lax;${sec} Max-Age=0`
  );

  return c.json({ ok: true }, 200, Object.fromEntries(headers.entries()));
});

export default auth;
