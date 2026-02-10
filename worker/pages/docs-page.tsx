/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import { raw } from "hono/html";
import { SiteNav } from "./layout.js";
import type { TocEntry, NavItem } from "../../docs/manifest.js";

interface DocsPageProps {
  html: string;
  title: string;
  toc: TocEntry[];
  nav: NavItem[];
  currentSlug: string;
  prev?: { title: string; slug: string } | null;
  next?: { title: string; slug: string } | null;
  nonce?: string;
}

export const DocsPage: FC<DocsPageProps> = ({
  html,
  title,
  toc,
  nav,
  currentSlug,
  prev,
  next,
  nonce,
}) => {
  return (
    <>
      <SiteNav nonce={nonce} />
      <div class="docs-layout">
        {/* Sidebar */}
        <aside class="docs-sidebar" id="docs-sidebar">
          {nav.map((item) =>
            item.children ? (
              <div class="docs-sidebar-group">
                <div class="docs-sidebar-group-title">{item.title}</div>
                {item.children.map((child) => (
                  <a
                    href={`/docs/${child.slug}`}
                    class={child.slug === currentSlug ? "active" : ""}
                  >
                    {child.title}
                  </a>
                ))}
              </div>
            ) : (
              <div class="docs-sidebar-group">
                <a
                  href={`/docs/${item.slug}`}
                  class={item.slug === currentSlug ? "active" : ""}
                >
                  {item.title}
                </a>
              </div>
            )
          )}
        </aside>

        {/* Content */}
        <main class="docs-content">
          <article class="prose">
            <h1>{title}</h1>
            {/* Build-time rendered markdown from our own doc files — safe static HTML */}
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </article>

          {/* Prev/Next */}
          {(prev || next) && (
            <nav class="docs-nav-links">
              {prev ? (
                <a href={`/docs/${prev.slug}`} class="docs-nav-link prev">
                  <div class="docs-nav-link-label">&larr; Previous</div>
                  <div class="docs-nav-link-title">{prev.title}</div>
                </a>
              ) : (
                <div />
              )}
              {next ? (
                <a href={`/docs/${next.slug}`} class="docs-nav-link next">
                  <div class="docs-nav-link-label">Next &rarr;</div>
                  <div class="docs-nav-link-title">{next.title}</div>
                </a>
              ) : (
                <div />
              )}
            </nav>
          )}
        </main>

        {/* Table of Contents */}
        {toc.length > 0 && (
          <aside class="docs-toc">
            <div class="docs-toc-title">On this page</div>
            {toc.map((entry) => (
              <a
                href={`#${entry.id}`}
                class={entry.depth === 3 ? "depth-3" : ""}
              >
                {entry.text}
              </a>
            ))}
          </aside>
        )}
      </div>

      {/* Mobile sidebar toggle */}
      <button
        class="docs-mobile-toggle"
        aria-label="Toggle navigation"
      >
        &#9776;
      </button>
      <div
        class="docs-overlay"
        id="docs-overlay"
      />
      <script nonce={nonce}>{raw(`document.querySelector('.docs-mobile-toggle').addEventListener('click',function(){document.getElementById('docs-sidebar').classList.toggle('open');document.getElementById('docs-overlay').classList.toggle('open')});document.getElementById('docs-overlay').addEventListener('click',function(){document.getElementById('docs-sidebar').classList.remove('open');this.classList.remove('open')})`)}</script>
    </>
  );
};
