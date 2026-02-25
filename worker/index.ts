import { Hono } from "hono";
import { cors } from "hono/cors";
import * as Sentry from "@sentry/cloudflare";
import type { Env, AppVariables, SessionRecord, UserRecord } from "./types.js";
import { authMiddleware } from "./middleware/auth.js";
import { bindingsMiddleware } from "./middleware/bindings.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.js";
import authRoutes from "./routes/auth.js";
import deviceAuthRoutes from "./routes/device-auth.js";
import reposRoutes from "./routes/repos.js";
import configRoutes from "./routes/config.js";
import contentRoutes from "./routes/content.js";
import githubRoutes from "./routes/github.js";
import tokensRoutes from "./routes/tokens.js";
import pullsRoutes from "./routes/pulls.js";
import siteRoutes from "./routes/site.jsx";

type AppEnv = {
  Bindings: Env;
  Variables: AppVariables;
};

const app = new Hono<AppEnv>();

// Platform bindings → KVStore + AppConfig on context
app.use("*", bindingsMiddleware);

app.use("*", cors({
  origin: (origin, c) => {
    const self = new URL(c.req.url).origin;
    if (origin === self) return origin;
    if (origin === "http://localhost:8787") return origin;
    return null;
  },
  credentials: true,
}));

// Security headers
app.use("*", async (c, next) => {
  // Generate a per-request nonce for inline scripts
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));
  c.set("cspNonce", nonce);

  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  const isLocal = new URL(c.req.url).hostname === "localhost";
  if (!isLocal) {
    c.header(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://avatars.githubusercontent.com data:; connect-src 'self' https://*.ingest.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
    );
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

// Request logger (generates requestId, flushes to Axiom via waitUntil)
app.use("*", requestLoggerMiddleware);

// Global error handler
app.onError((err, c) => {
  const logger = c.var.logger;
  const requestId = c.var.requestId ?? "unknown";
  if (logger) {
    logger.error("unhandled_error", {
      error: err.message,
      stack: err.stack,
    });
  }
  Sentry.captureException(err);
  return c.json({ error: "Internal server error", requestId }, 500);
});

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Debug: test Sentry error reporting
app.get("/api/debug/sentry", (c) => {
  throw new Error("Sentry worker test error");
});

// Auth status (unauthenticated)
app.get("/api/auth/me", async (c) => {
  const cookies = c.req.header("Cookie") ?? "";
  const sessionMatch = cookies.match(/cms_session=([^;]*)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (!sessionId) {
    return c.json({ authenticated: false });
  }

  const raw = await c.var.sessions.getText(sessionId);
  if (!raw) {
    return c.json({ authenticated: false });
  }

  const session = JSON.parse(raw) as SessionRecord;
  if (new Date(session.expiresAt) < new Date()) {
    return c.json({ authenticated: false });
  }
  const userRecord = await c.var.data.getJSON<UserRecord>(
    `user:${session.userId}`,
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

// Body size limit (1MB)
const MAX_BODY_SIZE = 1024 * 1024;
app.use("/api/*", async (c, next) => {
  const contentLength = c.req.header("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return c.json({ error: "Request body too large" }, 413);
  }
  return next();
});

// Protected API routes
app.use("/api/*", authMiddleware);
app.route("/api/github", githubRoutes);
app.route("/api/repos", reposRoutes);
app.route("/api/repos", configRoutes);
app.route("/api/repos", contentRoutes);
app.route("/api/repos", pullsRoutes);
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

const handler: ExportedHandler<Env> = {
  fetch(request, env, ctx) {
    if (!env.SENTRY_DSN) {
      return app.fetch(request, env, ctx);
    }
    const wrapped = Sentry.withSentry(
      (e: Env) => ({
        dsn: e.SENTRY_DSN,
        tracesSampleRate: 1.0,
      }),
      { fetch: app.fetch } as ExportedHandler<Env>,
    );
    return wrapped.fetch!(request, env, ctx);
  },
};

export default handler;
