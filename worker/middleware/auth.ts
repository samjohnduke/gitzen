import { createMiddleware } from "hono/factory";
import type { Env, SessionData } from "../types.js";

type AuthEnv = {
  Bindings: Env;
  Variables: {
    githubToken: string;
    githubUsername: string;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // Check for Bearer token (programmatic access)
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Validate token by fetching user
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "samduke-cms",
      },
    });
    if (res.ok) {
      const user = (await res.json()) as { login: string };
      c.set("githubToken", token);
      c.set("githubUsername", user.login);
      return next();
    }
    return c.json({ error: "Invalid token" }, 401);
  }

  // Check session cookie
  const sessionId = getCookie(c.req.raw, "cms_session");
  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = await c.env.SESSIONS.get<SessionData>(sessionId, "json");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("githubToken", session.githubToken);
  c.set("githubUsername", session.githubUsername);
  return next();
});

function getCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
