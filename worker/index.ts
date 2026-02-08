import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, SessionData } from "./types.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import reposRoutes from "./routes/repos.js";
import configRoutes from "./routes/config.js";
import contentRoutes from "./routes/content.js";
import githubRoutes from "./routes/github.js";

type AppEnv = {
  Bindings: Env;
  Variables: { githubToken: string; githubUsername: string };
};

const app = new Hono<AppEnv>();

app.use("*", cors({ origin: "*", credentials: true }));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Auth status (unauthenticated)
app.get("/api/auth/me", async (c) => {
  const cookies = c.req.header("Cookie") ?? "";
  const sessionMatch = cookies.match(/cms_session=([^;]*)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (!sessionId) {
    return c.json({ authenticated: false });
  }

  const session = await c.env.SESSIONS.get<SessionData>(sessionId, "json");
  if (!session) {
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
    username: session.githubUsername,
  });
});

// Auth routes (unauthenticated)
app.route("/auth", authRoutes);

// Protected API routes
app.use("/api/*", authMiddleware);
app.route("/api/github", githubRoutes);
app.route("/api/repos", reposRoutes);
app.route("/api/repos", configRoutes);
app.route("/api/repos", contentRoutes);

// SPA fallback — serve index.html for all non-API routes
app.get("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
