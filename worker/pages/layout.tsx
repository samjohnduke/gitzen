/** @jsxImportSource hono/jsx */
import type { FC, PropsWithChildren } from "hono/jsx";
import { raw } from "hono/html";
import { siteStyles } from "./styles.js";

interface PageLayoutProps {
  title: string;
  description?: string;
  nonce?: string;
}

export const PageLayout: FC<PropsWithChildren<PageLayoutProps>> = ({
  title,
  description,
  nonce,
  children,
}) => {
  // Static string literal — no user input, safe for inline script
  const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;
  return (
    <>
      {raw('<!DOCTYPE html>')}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          {description && <meta name="description" content={description} />}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
          <style>{raw(siteStyles)}</style>
          <script nonce={nonce}>{raw(themeInit)}</script>
        </head>
        <body>{children}</body>
      </html>
    </>
  );
};

export const SiteNav: FC<{ nonce?: string }> = ({ nonce }) => {
  const themeToggleScript = `document.querySelector('.theme-toggle').addEventListener('click',function(){var d=document.documentElement,c=d.getAttribute('data-theme'),n=c==='dark'?'light':c==='light'?'dark':window.matchMedia('(prefers-color-scheme:dark)').matches?'light':'dark';d.setAttribute('data-theme',n);try{localStorage.setItem('theme',n)}catch(e){}})`;
  return (
    <nav class="site-nav">
      <div class="site-nav-inner">
        <a href="/" class="site-nav-logo">
          {/* Enso brushstroke circle */}
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
            <circle
              cx="50" cy="50" r="38"
              stroke="currentColor" stroke-width="7"
              stroke-linecap="round"
              stroke-dasharray="220 40"
              transform="rotate(-90 50 50)"
            />
          </svg>
          gitzen
        </a>
        <ul class="nav-links">
          <li><a href="/docs/getting-started">Docs</a></li>
          <li><a href="https://github.com/samducker/samduke-cms">GitHub</a></li>
          <li>
            <button
              class="theme-toggle"
              aria-label="Toggle theme"
            >
              {/* Sun (shown in dark mode) */}
              <svg class="theme-icon-light" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              {/* Moon (shown in light mode) */}
              <svg class="theme-icon-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
          </li>
          <li><a href="/app" class="nav-cta">Open App</a></li>
        </ul>
      </div>
      <script nonce={nonce}>{raw(themeToggleScript)}</script>
    </nav>
  );
};
