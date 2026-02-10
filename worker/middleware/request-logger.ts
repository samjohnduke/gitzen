import { createMiddleware } from "hono/factory";
import type { AppVariables } from "../types.js";
import { RequestLogger } from "../lib/logger.js";
import { ingestToAxiom } from "../lib/axiom.js";

type LoggerEnv = {
  Variables: AppVariables;
};

export const requestLoggerMiddleware = createMiddleware<LoggerEnv>(
  async (c, next) => {
    const requestId = crypto.randomUUID();
    const logger = new RequestLogger(requestId);

    c.set("logger", logger);
    c.set("requestId", requestId);

    const start = Date.now();

    await next();

    const duration_ms = Date.now() - start;

    // Add request summary event
    const auth = c.var.auth;
    logger.info("request", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms,
      authMethod: auth?.authMethod,
      userId: auth?.userId,
    });

    // Set response header
    c.header("X-Request-ID", requestId);

    // Flush to Axiom if configured, otherwise log to console for local dev
    const events = logger.flush();
    const config = c.var.config;
    if (config?.axiomApiToken && config?.axiomDataset) {
      const bgTask = ingestToAxiom(events, config.axiomDataset, config.axiomApiToken);
      if (c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(bgTask);
      } else {
        bgTask.catch(console.error);
      }
    } else {
      for (const event of events) {
        const { level, message, requestId: _rid, _time, ...data } = event;
        const prefix = `[${level.toUpperCase()}] ${message}`;
        const hasData = Object.keys(data).length > 0;
        if (level === "error") {
          console.error(prefix, hasData ? data : "");
        } else if (level === "warn") {
          console.warn(prefix, hasData ? data : "");
        } else {
          console.log(prefix, hasData ? data : "");
        }
      }
    }
  },
);
