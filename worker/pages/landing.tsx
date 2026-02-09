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
            Edit your site.<br />
            <em>From anywhere.</em>
          </h1>
          <p class="hero-sub anim-3">
            A web-based editor for your static site's markdown content.
            Sign in with GitHub, edit your posts, and changes commit
            directly to your repo. Your site builds as it always has.
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

          {/* Editor showcase — show the editing flow, not an API call */}
          <div class="hero-terminal anim-5">
            <div class="term-bar">
              <div class="term-dots">
                <span class="term-dot" />
                <span class="term-dot" />
                <span class="term-dot" />
              </div>
              <span class="term-title">how it works</span>
              <div style="width:54px" />
            </div>
            <div class="term-body">
              <span class="c">{'# Your content already lives in your repo'}</span>{'\n'}
              src/content/blog/hello-world.md{'\n'}
              src/content/blog/building-with-astro.md{'\n'}
              {'\n'}
              <span class="c">{'# gitzen gives you a visual editor for those files'}</span>{'\n'}
              <span class="c">{'# edits commit directly to your GitHub repo'}</span>{'\n'}
              <span class="c">{'# your SSG reads them from disk — no API needed'}</span>{'\n'}
              {'\n'}
              <span class="k">open</span> gitzen <span class="s">&rarr;</span> sign in <span class="s">&rarr;</span> edit <span class="s">&rarr;</span> save <span class="s">&rarr;</span> <span class="n">deployed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section class="section section-center">
        <div class="section-inner">
          <div class="section-label">How it works</div>
          <div class="section-title">Your files, your repo. Just a better editor.</div>
          <div class="section-desc">
            gitzen edits the markdown files that already live in your GitHub repo.
            Your static site generator reads them from disk as it always has.
            Delete gitzen and your site still works.
          </div>

          <div class="feat-grid">
            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h3>Visual editor</h3>
              <p>Rich markdown editing with toolbar, frontmatter fields, and live preview. No code editor needed.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                  <path d="M6 21V9a9 9 0 0 0 9 9" />
                </svg>
              </div>
              <h3>Commits to your repo</h3>
              <p>Every save is a real git commit. Full version history, branching, and pull requests — all through GitHub.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>Draft &amp; review workflow</h3>
              <p>Save as draft to a branch, preview on Cloudflare Pages, review diffs, then merge when ready.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3>No vendor lock-in</h3>
              <p>Works with any static site generator. Astro, Next.js, Hugo, Jekyll — anything that reads markdown from a directory.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Encrypted &amp; self-hosted</h3>
              <p>Deploy to your own Cloudflare Workers. GitHub tokens encrypted at rest. You own everything.</p>
            </div>

            <div class="feat">
              <div class="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3>Optional REST API</h3>
              <p>Scoped API tokens for building pipelines and automations. Your site doesn't need it — but it's there if you do.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works showcase — visual flow instead of API code */}
      <section class="section section-center">
        <div class="section-inner">
          <div class="section-label">Setup</div>
          <div class="section-title">Three steps to start editing.</div>
          <div class="section-desc">
            Add a config file to your repo, deploy gitzen to Cloudflare Workers, and start editing.
          </div>

          <div class="code-showcase">
            <div class="code-panel">
              <div class="code-panel-bar"><span>cms.config.json</span></div>
              <pre>{'{'}{'\n'}  <span class="s">"name"</span>: <span class="s">"My Blog"</span>,{'\n'}  <span class="s">"collections"</span>: {'{'}{'\n'}    <span class="s">"blog"</span>: {'{'}{'\n'}      <span class="s">"label"</span>: <span class="s">"Blog Posts"</span>,{'\n'}      <span class="s">"directory"</span>: <span class="s">"src/content/blog"</span>,{'\n'}      <span class="s">"fields"</span>: [{'\n'}        {'{'} <span class="s">"name"</span>: <span class="s">"title"</span>, <span class="s">"type"</span>: <span class="s">"string"</span> {'}'},{'  \n'}        {'{'} <span class="s">"name"</span>: <span class="s">"date"</span>, <span class="s">"type"</span>: <span class="s">"date"</span> {'}'},{'  \n'}        {'{'} <span class="s">"name"</span>: <span class="s">"tags"</span>, <span class="s">"type"</span>: <span class="s">"string[]"</span> {'}'}{'\n'}      ]{'\n'}    {'}'}{'\n'}  {'}'}{'\n'}{'}'}</pre>
            </div>
            <div class="result-panel">
              <div class="result-panel-bar"><span>What you get</span></div>
              <pre><span class="c">{'Visual editor with:'}</span>{'\n'}{'\n'}<span class="n">{'  \u2713'}</span> Rich markdown toolbar{'\n'}<span class="n">{'  \u2713'}</span> Typed frontmatter fields{'\n'}<span class="n">{'  \u2713'}</span> Direct publish or draft PR{'\n'}<span class="n">{'  \u2713'}</span> Side-by-side diff review{'\n'}<span class="n">{'  \u2713'}</span> Cloudflare Pages previews{'\n'}<span class="n">{'  \u2713'}</span> Multi-repo support{'\n'}{'\n'}<span class="c">{'Your SSG reads files from disk.'}</span>{'\n'}<span class="c">{'No API integration required.'}</span></pre>
            </div>
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
