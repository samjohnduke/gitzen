import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AuthContext, SessionRecord, LegacySessionData, UserRecord } from "./types.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import deviceAuthRoutes from "./routes/device-auth.js";
import reposRoutes from "./routes/repos.js";
import configRoutes from "./routes/config.js";
import contentRoutes from "./routes/content.js";
import githubRoutes from "./routes/github.js";
import tokensRoutes from "./routes/tokens.js";
import siteRoutes from "./routes/site.jsx";

type AppEnv = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

const app = new Hono<AppEnv>();

app.use("*", cors({ origin: "*", credentials: true }));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Auth status (unauthenticated) — supports both old and new session formats
app.get("/api/auth/me", async (c) => {
  const cookies = c.req.header("Cookie") ?? "";
  const sessionMatch = cookies.match(/cms_session=([^;]*)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (!sessionId) {
    return c.json({ authenticated: false });
  }

  const raw = await c.env.SESSIONS.get(sessionId, "text");
  if (!raw) {
    return c.json({ authenticated: false });
  }

  const parsed = JSON.parse(raw) as LegacySessionData | SessionRecord;

  if ("githubUsername" in parsed) {
    // Legacy format — still has username inline
    return c.json({
      authenticated: true,
      username: (parsed as LegacySessionData).githubUsername,
    });
  }

  // New format — look up username from UserRecord
  const session = parsed as SessionRecord;
  const userRecord = await c.env.CMS_DATA.get<UserRecord>(
    `user:${session.userId}`,
    "json"
  );

  if (!userRecord) {
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
    username: userRecord.githubUsername,
  });
});

// Auth routes (unauthenticated)
app.route("/auth", authRoutes);
app.route("/auth", deviceAuthRoutes);

// Landing page + docs (unauthenticated, server-rendered)
app.route("/", siteRoutes);

// Protected API routes
app.use("/api/*", authMiddleware);
app.route("/api/github", githubRoutes);
app.route("/api/repos", reposRoutes);
app.route("/api/repos", configRoutes);
app.route("/api/repos", contentRoutes);
app.route("/api/tokens", tokensRoutes);

// SPA fallback — serve index.html for /app/* routes only
app.get("/app/*", async (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/index.html";
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});
app.get("/app", async (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/index.html";
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

// 404 for everything else
app.notFound((c) => {
  return c.html(
    `<!doctype html><html><head><meta charset="utf-8"><title>Not Found</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#666}div{text-align:center}h1{font-size:72px;margin:0;color:#333}p{margin-top:8px}a{color:#0066cc;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><div><h1>404</h1><p>Page not found. <a href="/">Go home</a></p></div></body></html>`,
    404
  );
});

export default app;
