/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import type { Env } from "../types.js";
import { PageLayout } from "../pages/layout.js";
import { LandingPage } from "../pages/landing.js";
import { DocsPage } from "../pages/docs-page.js";
import { docsNav, getFlatSlugs } from "../../docs/manifest.js";
import type { DocModule } from "../../docs/manifest.js";

// Import all docs at build time — Vite transforms .md → { html, meta, toc }
import gettingStarted from "../../docs/content/getting-started.md";
import configuration from "../../docs/content/configuration.md";
import workflow from "../../docs/content/workflow.md";
import authentication from "../../docs/content/authentication.md";
import apiReference from "../../docs/content/api-reference.md";
import selfHosting from "../../docs/content/self-hosting.md";

// OpenAPI spec — imported as raw text
import openapiSpec from "../../openapi.yaml?raw";

const docMap: Record<string, DocModule> = {
  "getting-started": gettingStarted,
  configuration: configuration,
  workflow: workflow,
  authentication: authentication,
  "api-reference": apiReference,
  "self-hosting": selfHosting,
};

type SiteApp = { Bindings: Env };
const site = new Hono<SiteApp>();

// Landing page
site.get("/", (c) => {
  const page = (
    <PageLayout
      title="gitzen — Edit your static site from anywhere"
      description="A web-based markdown editor for static sites. Edits commit directly to your GitHub repo. Works with any static site generator."
    >
      <LandingPage />
    </PageLayout>
  );
  return c.html(page);
});

// Serve OpenAPI spec
site.get("/api/openapi.yaml", (c) => {
  return c.text(openapiSpec, 200, {
    "Content-Type": "text/yaml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
});

// Standalone interactive API reference (Scalar — renders its own full page)
site.get("/reference", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Reference — gitzen</title>
  <meta name="description" content="Interactive REST API documentation for gitzen" />
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1/dist/browser/standalone.min.js"></script>
  <script>
    Scalar.createApiReference(document.body, {
      url: '/api/openapi.yaml',
      theme: 'default',
      hideModels: false,
      hideDownloadButton: false,
    })
  </script>
</body>
</html>`;
  return c.html(html);
});

// Docs index → redirect to getting-started
site.get("/docs", (c) => c.redirect("/docs/getting-started"));

// Docs pages
site.get("/docs/:slug{.+}", (c) => {
  const slug = c.req.param("slug");
  const doc = docMap[slug];

  if (!doc) {
    return c.notFound();
  }

  const flatSlugs = getFlatSlugs();
  const idx = flatSlugs.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? flatSlugs[idx - 1] : null;
  const next = idx < flatSlugs.length - 1 ? flatSlugs[idx + 1] : null;

  const page = (
    <PageLayout
      title={`${doc.meta.title} — gitzen`}
      description={doc.meta.description}
    >
      <DocsPage
        html={doc.html}
        title={doc.meta.title}
        toc={doc.toc}
        nav={docsNav}
        currentSlug={slug}
        prev={prev}
        next={next}
      />
    </PageLayout>
  );
  return c.html(page);
});

export default site;
