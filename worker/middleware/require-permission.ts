import { createMiddleware } from "hono/factory";
import type { Env, AuthContext } from "../types.js";
import type { Permission } from "../../shared/types.js";

type PermEnv = {
  Bindings: Env;
  Variables: {
    auth: AuthContext;
    githubToken: string;
    githubUsername: string;
  };
};

/**
 * Middleware factory: require the request's auth context to include
 * the given permission. Session auth bypasses all scope checks.
 */
export function requirePermission(...permissions: Permission[]) {
  return createMiddleware<PermEnv>(async (c, next) => {
    const auth = c.var.auth;

    // Session auth has full access — intentional design decision: session users
    // are the repo owner and have already authenticated via GitHub OAuth.
    if (auth.authMethod === "session") return next();

    // API tokens must have all required permissions
    const granted = auth.tokenScope?.permissions ?? [];
    for (const perm of permissions) {
      if (!granted.includes(perm)) {
        return c.json(
          { error: `Insufficient permissions. Required: ${perm}` },
          403
        );
      }
    }

    return next();
  });
}

/**
 * Middleware: require the request's auth context to have access to the
 * repo in the `:repo` URL param. Session auth bypasses scope checks.
 */
export function requireRepoAccess() {
  return createMiddleware<PermEnv>(async (c, next) => {
    const auth = c.var.auth;

    // Session auth bypasses repo scope — same rationale as permission bypass above.
    if (auth.authMethod === "session") return next();

    const repos = auth.tokenScope?.repos ?? [];
    if (repos.includes("*")) return next();

    const repoParam = decodeURIComponent(c.req.param("repo") ?? "");
    if (!repoParam) return next();

    if (!repos.includes(repoParam)) {
      return c.json(
        { error: `Token does not have access to repo: ${repoParam}` },
        403
      );
    }

    return next();
  });
}

/**
 * Middleware: require session auth (API tokens cannot access this route).
 */
export function requireSession() {
  return createMiddleware<PermEnv>(async (c, next) => {
    const auth = c.var.auth;

    if (auth.authMethod !== "session") {
      return c.json(
        { error: "This endpoint requires browser session auth" },
        403
      );
    }

    return next();
  });
}
