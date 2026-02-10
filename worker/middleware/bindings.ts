import { createMiddleware } from "hono/factory";
import type { Env, AppVariables } from "../types.js";
import { CloudflareKVStore } from "../lib/kv-cloudflare.js";
import { configFromEnv } from "../lib/config.js";

type BindingsEnv = { Bindings: Env; Variables: AppVariables };

export const bindingsMiddleware = createMiddleware<BindingsEnv>(
  async (c, next) => {
    c.set("sessions", new CloudflareKVStore(c.env.SESSIONS));
    c.set("data", new CloudflareKVStore(c.env.CMS_DATA));
    c.set("config", configFromEnv(c.env));
    return next();
  },
);
