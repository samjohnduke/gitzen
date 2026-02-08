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
import authentication from "../../docs/content/authentication.md";
import apiReference from "../../docs/content/api-reference.md";
import astro from "../../docs/content/integrations/astro.md";
import nextjs from "../../docs/content/integrations/nextjs.md";
import jekyll from "../../docs/content/integrations/jekyll.md";
import hugo from "../../docs/content/integrations/hugo.md";
import eleventy from "../../docs/content/integrations/eleventy.md";

const docMap: Record<string, DocModule> = {
  "getting-started": gettingStarted,
  configuration: configuration,
  authentication: authentication,
  "api-reference": apiReference,
  "integrations/astro": astro,
  "integrations/nextjs": nextjs,
  "integrations/jekyll": jekyll,
  "integrations/hugo": hugo,
  "integrations/eleventy": eleventy,
};

type SiteApp = { Bindings: Env };
const site = new Hono<SiteApp>();

// Landing page
site.get("/", (c) => {
  const page = (
    <PageLayout
      title="gitzen — Git-backed CMS for markdown content"
      description="A calm, API-first content management system that stores everything as markdown in your GitHub repos. Works with any static site generator."
    >
      <LandingPage />
    </PageLayout>
  );
  return c.html(page);
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
