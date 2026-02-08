/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import { SiteNav } from "./layout.js";

export const LandingPage: FC = () => {
  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section class="hero">
        {/* Large enso background */}
        <svg class="hero-enso" viewBox="0 0 100 100" fill="none">
          <circle
            cx="50" cy="50" r="38"
            stroke="currentColor" stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="220 40"
            transform="rotate(-90 50 50)"
          />
        </svg>

        <div class="hero-inner">
          <div class="hero-badge anim-1">
            <span class="hero-badge-dot" />
            Open source &middot; Self-hosted
          </div>
          <h1 class="anim-2">
            Simple content.<br />
            <em>Clear mind.</em>
          </h1>
          <p class="hero-sub anim-3">
            A Git-backed CMS that brings calm to content management.
            Your markdown stays in GitHub. Your API stays clean.
          </p>
          <div class="hero-actions anim-4">
            <a href="/docs/getting-started" class="btn-primary">
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a href="https://github.com/samducker/samduke-cms" class="btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Source
            </a>
          </div>

          {/* Terminal showcase */}
          <div class="hero-terminal anim-5">
            <div class="term-bar">
              <div class="term-dots">
                <span class="term-dot" />
                <span class="term-dot" />
                <span class="term-dot" />
              </div>
              <span class="term-title">fetch-posts.js</span>
              <div style="width:54px" />
            </div>
            <div class="term-body">
              <span class="c">// Fetch all blog posts from your CMS</span>{'\n'}
              <span class="k">const</span> response = <span class="k">await</span> <span class="n">fetch</span>({'\n'}
              {'  '}<span class="s">"https://gitzen.dev/api/repos/you%2Fblog/content/posts"</span>,{'\n'}
              {'  '}{'{'} headers: {'{'} Authorization: <span class="s">`Bearer $&#123;CMS_TOKEN&#125;`</span> {'}'} {'}'}{'\n'}
              );{'\n'}
              {'\n'}
              <span class="k">const</span> posts = <span class="k">await</span> response.<span class="n">json</span>();{'\n'}
              <span class="c">// [{'{'}slug: "hello-world", frontmatter: {'{'} title: "Hello World", date: "2025-01-15" {'}'}{'}'}]</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section class="section section-center">
        <div class="section-inner">
          <div class="section-label">Built for developers</div>
          <div class="section-title">Everything you need, nothing you don't.</div>
          <div class="section-desc">
            No database. No vendor lock-in. Your content stays in Git where it belongs.
          </div>

          <div class="feat-grid">
            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                  <path d="M6 21V9a9 9 0 0 0 9 9" />
                </svg>
              </div>
              <h3>Git-backed storage</h3>
              <p>Content lives as markdown in your repos. Full version history, branching, and PRs built in.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3>Scoped API tokens</h3>
              <p>Fine-grained permissions per token. Scope to specific repos. Perfect for CI/CD.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3>Any framework</h3>
              <p>Astro, Next.js, Hugo, Jekyll, Eleventy. Fetch content via REST at build time.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h3>Visual editor</h3>
              <p>WYSIWYG markdown editing with toolbar, live preview, and frontmatter fields.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Encrypted at rest</h3>
              <p>GitHub tokens encrypted with AES-256-GCM. API tokens signed with HMAC-SHA256.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <h3>Self-hosted</h3>
              <p>Deploy to Cloudflare Workers for free. Open source, MIT licensed. You own everything.</p>
            </div>
          </div>
        </div>
      </section>

      {/* API showcase */}
      <section class="section section-center">
        <div class="section-inner">
          <div class="section-label">Simple API</div>
          <div class="section-title">One request to fetch your content.</div>
          <div class="section-desc">
            Read, create, and update content with a clean REST API. Authentication via scoped tokens.
          </div>

          <div class="code-showcase">
            <div class="code-panel">
              <div class="code-panel-bar"><span>Request</span></div>
              <pre><span class="c"># List all blog posts</span>{'\n'}<span class="k">GET</span> /api/repos/you%2Fblog/content/posts{'\n'}Authorization: Bearer <span class="s">cms_your_token</span>{'\n'}{'\n'}<span class="c"># Get a single post</span>{'\n'}<span class="k">GET</span> /api/repos/you%2Fblog/content/posts/hello-world{'\n'}{'\n'}<span class="c"># Create or update</span>{'\n'}<span class="k">PUT</span> /api/repos/you%2Fblog/content/posts/hello-world{'\n'}{'{'}{'\n'}  <span class="s">"frontmatter"</span>: {'{'} <span class="s">"title"</span>: <span class="s">"Hello"</span>, <span class="s">"date"</span>: <span class="s">"2025-01-15"</span> {'}'},\n  <span class="s">"body"</span>: <span class="s">"# Hello World\n\nWelcome."</span>{'\n'}{'}'}</pre>
            </div>
            <div class="result-panel">
              <div class="result-panel-bar"><span>Response</span></div>
              <pre>{'['}{'\n'}  {'{'}{'\n'}    <span class="s">"slug"</span>: <span class="s">"hello-world"</span>,{'\n'}    <span class="s">"path"</span>: <span class="s">"content/blog/hello-world.md"</span>,{'\n'}    <span class="s">"sha"</span>: <span class="s">"a1b2c3d..."</span>,{'\n'}    <span class="s">"frontmatter"</span>: {'{'}{'\n'}      <span class="s">"title"</span>: <span class="s">"Hello World"</span>,{'\n'}      <span class="s">"date"</span>: <span class="s">"2025-01-15"</span>,{'\n'}      <span class="s">"tags"</span>: [<span class="s">"intro"</span>]{'\n'}    {'}'}{'\n'}  {'}'}{'\n'}{']'}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section class="section section-center" style="border-bottom:none">
        <div class="section-inner">
          <div class="section-label">Integrations</div>
          <div class="section-title">Works with your stack.</div>
          <div class="section-desc">
            Step-by-step guides for the most popular static site generators.
          </div>

          <div class="integrations-row">
            <a href="/docs/integrations/astro" class="integ">Astro <span class="integ-arrow">&rarr;</span></a>
            <a href="/docs/integrations/nextjs" class="integ">Next.js <span class="integ-arrow">&rarr;</span></a>
            <a href="/docs/integrations/jekyll" class="integ">Jekyll <span class="integ-arrow">&rarr;</span></a>
            <a href="/docs/integrations/hugo" class="integ">Hugo <span class="integ-arrow">&rarr;</span></a>
            <a href="/docs/integrations/eleventy" class="integ">Eleventy <span class="integ-arrow">&rarr;</span></a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="site-footer">
        <div class="footer-links">
          <a href="/docs/getting-started">Documentation</a>
          <a href="https://github.com/samducker/samduke-cms">GitHub</a>
        </div>
        <span>Built with </span>
        <a href="https://hono.dev">Hono</a>
        <span> + </span>
        <a href="https://workers.cloudflare.com">Cloudflare Workers</a>
      </footer>
    </>
  );
};
