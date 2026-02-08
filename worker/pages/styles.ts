export const siteStyles = `
:root {
  --g-font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --g-mono: "JetBrains Mono", ui-monospace, "SF Mono", monospace;
  --g-max-w: 920px;
  --g-docs-max-w: 1200px;

  /* Rice paper & sumi ink */
  --g-bg: #faf9f6;
  --g-bg-raised: #ffffff;
  --g-bg-subtle: #f5f3ef;
  --g-bg-code: #f5f3ef;
  --g-bg-code-inline: #efeee9;
  --g-text: #1a1a1a;
  --g-text-2: #5c5c5c;
  --g-text-3: #a3a3a3;
  --g-border: #e5e2db;
  --g-border-strong: #d4d0c8;

  /* Indigo (ai-iro) */
  --g-accent: #4338ca;
  --g-accent-hover: #3730a3;
  --g-accent-bg: #eef2ff;
  --g-accent-text: #3730a3;
  --g-accent-soft: #c7d2fe;

  /* Vermillion (shu-iro) — used sparingly */
  --g-red: #b91c1c;
  --g-red-bg: #fef2f2;

  --g-green: #15803d;
  --g-green-bg: #f0fdf4;

  --g-code-text: #1a1a1a;
  --g-card-shadow: 0 1px 3px rgba(26,26,26,0.03), 0 0 0 1px rgba(26,26,26,0.04);
  --g-nav-h: 56px;

  /* Terminal (always dark) */
  --g-term-bg: #1a1a2e;
  --g-term-bar: #232340;
  --g-term-border: #2d2d4a;
  --g-term-text: #d4d4d8;
  --g-term-comment: #6b6b8d;
  --g-term-string: #86efac;
  --g-term-keyword: #a5b4fc;
  --g-term-fn: #c4b5fd;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --g-bg: #0f0f14;
    --g-bg-raised: #1a1a22;
    --g-bg-subtle: #16161e;
    --g-bg-code: #16161e;
    --g-bg-code-inline: #24243a;
    --g-text: #e4e4e7;
    --g-text-2: #a1a1aa;
    --g-text-3: #63636e;
    --g-border: #27273a;
    --g-border-strong: #3a3a52;
    --g-accent: #818cf8;
    --g-accent-hover: #a5b4fc;
    --g-accent-bg: #1e1b4b;
    --g-accent-text: #c7d2fe;
    --g-accent-soft: #3730a3;
    --g-green: #4ade80;
    --g-green-bg: #052e16;
    --g-code-text: #d4d4d8;
    --g-card-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04);
    --g-term-bg: #0f0f14;
    --g-term-bar: #1a1a22;
    --g-term-border: #27273a;
  }
}
[data-theme="dark"] {
  --g-bg: #0f0f14;
  --g-bg-raised: #1a1a22;
  --g-bg-subtle: #16161e;
  --g-bg-code: #16161e;
  --g-bg-code-inline: #24243a;
  --g-text: #e4e4e7;
  --g-text-2: #a1a1aa;
  --g-text-3: #63636e;
  --g-border: #27273a;
  --g-border-strong: #3a3a52;
  --g-accent: #818cf8;
  --g-accent-hover: #a5b4fc;
  --g-accent-bg: #1e1b4b;
  --g-accent-text: #c7d2fe;
  --g-accent-soft: #3730a3;
  --g-green: #4ade80;
  --g-green-bg: #052e16;
  --g-code-text: #d4d4d8;
  --g-card-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04);
  --g-term-bg: #0f0f14;
  --g-term-bar: #1a1a22;
  --g-term-border: #27273a;
}

/* ====== Reset ====== */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{
  font-family:var(--g-font);
  background:var(--g-bg);
  color:var(--g-text);
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
}
a{color:var(--g-accent);text-decoration:none}
a:hover{text-decoration:underline}

/* ====== Animations ====== */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes brushDraw{from{stroke-dashoffset:800}to{stroke-dashoffset:0}}
.anim-1{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) both}
.anim-2{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .1s both}
.anim-3{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both}
.anim-4{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .3s both}
.anim-5{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .4s both}

/* ====== Nav ====== */
.site-nav{
  position:sticky;top:0;z-index:100;
  height:var(--g-nav-h);
  border-bottom:1px solid var(--g-border);
  background:var(--g-bg);
}
@supports(backdrop-filter:blur(1px)){
  .site-nav{background:color-mix(in srgb, var(--g-bg) 85%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
}
.site-nav-inner{
  max-width:var(--g-docs-max-w);margin:0 auto;padding:0 24px;
  height:100%;display:flex;align-items:center;justify-content:space-between;
}
.site-nav-logo{
  font-weight:600;font-size:15px;letter-spacing:-0.02em;
  color:var(--g-text);text-decoration:none;
  display:flex;align-items:center;gap:10px;
}
.site-nav-logo:hover{text-decoration:none}
.site-nav-logo svg{width:24px;height:24px}
.nav-links{display:flex;align-items:center;gap:4px;list-style:none}
.nav-links a{
  font-size:13.5px;color:var(--g-text-2);text-decoration:none;
  padding:6px 12px;border-radius:6px;font-weight:450;
  transition:color .15s,background .15s;
}
.nav-links a:hover{color:var(--g-text);background:var(--g-bg-subtle);text-decoration:none}
/* Theme toggle */
.theme-toggle{
  display:flex;align-items:center;justify-content:center;
  width:32px;height:32px;border-radius:8px;
  border:none;background:transparent;cursor:pointer;
  color:var(--g-text-2);transition:color .15s,background .15s;
}
.theme-toggle:hover{color:var(--g-text);background:var(--g-bg-subtle)}
.theme-icon-dark{display:block}
.theme-icon-light{display:none}
@media(prefers-color-scheme:dark){
  html:not([data-theme="light"]) .theme-icon-dark{display:none}
  html:not([data-theme="light"]) .theme-icon-light{display:block}
}
[data-theme="dark"] .theme-icon-dark{display:none}
[data-theme="dark"] .theme-icon-light{display:block}
[data-theme="light"] .theme-icon-dark{display:block}
[data-theme="light"] .theme-icon-light{display:none}

.nav-cta{
  background:var(--g-accent) !important;color:#fff !important;
  font-size:13px !important;font-weight:500 !important;
  padding:7px 16px !important;border-radius:8px;
  transition:background .15s !important;
}
.nav-cta:hover{background:var(--g-accent-hover) !important;text-decoration:none !important}

/* ====== Hero ====== */
.hero{
  padding:100px 24px 88px;
  position:relative;overflow:hidden;
  text-align:center;
}
.hero-inner{max-width:640px;margin:0 auto;position:relative;z-index:1}

/* Enso background */
.hero-enso{
  position:absolute;top:50%;left:50%;
  transform:translate(-50%,-50%);
  width:420px;height:420px;
  opacity:0.04;pointer-events:none;
}
.hero-enso circle{
  fill:none;stroke:var(--g-text);stroke-width:8;
  stroke-linecap:round;
  stroke-dasharray:800;
  animation:brushDraw 2s cubic-bezier(.22,1,.36,1) both;
}

.hero-badge{
  display:inline-flex;align-items:center;gap:6px;
  font-size:12.5px;font-weight:500;
  color:var(--g-accent);
  background:var(--g-accent-bg);
  border:1px solid var(--g-accent-soft);
  padding:5px 14px 5px 10px;border-radius:100px;
  margin-bottom:28px;
}
.hero-badge-dot{
  width:6px;height:6px;border-radius:50%;
  background:var(--g-green);
  animation:pulse 2.5s ease-in-out infinite;
}
.hero h1{
  font-size:clamp(34px,5vw,52px);
  font-weight:700;line-height:1.1;
  letter-spacing:-0.04em;
  margin-bottom:20px;
}
.hero-sub{
  font-size:clamp(15px,1.8vw,17px);
  color:var(--g-text-2);
  line-height:1.65;
  max-width:460px;
  margin:0 auto 40px;
}
.hero-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn-primary{
  display:inline-flex;align-items:center;gap:8px;
  padding:11px 22px;font-size:14px;font-weight:500;
  background:var(--g-accent);color:#fff !important;
  border-radius:10px;transition:background .15s;
  font-family:var(--g-font);
}
.btn-primary:hover{background:var(--g-accent-hover);text-decoration:none !important}
.btn-ghost{
  display:inline-flex;align-items:center;gap:6px;
  padding:11px 18px;font-size:14px;font-weight:450;
  color:var(--g-text-2) !important;border:1px solid var(--g-border);
  border-radius:10px;transition:border-color .15s,color .15s;
  font-family:var(--g-font);
}
.btn-ghost:hover{color:var(--g-text) !important;border-color:var(--g-border-strong);text-decoration:none !important}

/* Terminal */
.hero-terminal{
  margin-top:56px;text-align:left;
  border:1px solid var(--g-term-border);
  border-radius:12px;overflow:hidden;
  box-shadow:0 12px 40px rgba(15,15,20,0.12),0 0 0 1px rgba(15,15,20,0.04);
}
@media(prefers-color-scheme:dark){
  :root:not([data-theme="light"]) .hero-terminal{box-shadow:0 12px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.05)}
}
[data-theme="dark"] .hero-terminal{box-shadow:0 12px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.05)}
.term-bar{
  display:flex;align-items:center;gap:8px;
  padding:11px 16px;background:var(--g-term-bar);
  border-bottom:1px solid var(--g-term-border);
}
.term-dots{display:flex;gap:6px}
.term-dot{width:10px;height:10px;border-radius:50%;background:var(--g-term-border)}
.term-title{flex:1;text-align:center;font-family:var(--g-mono);font-size:11px;color:var(--g-term-comment)}
.term-body{
  background:var(--g-term-bg);padding:22px 22px 26px;
  font-family:var(--g-mono);font-size:13px;
  line-height:1.8;color:var(--g-term-text);overflow-x:auto;
}
.term-body .c{color:var(--g-term-comment)}
.term-body .s{color:var(--g-term-string)}
.term-body .k{color:var(--g-term-keyword)}
.term-body .n{color:var(--g-term-fn)}

/* ====== Divider ====== */
.divider{
  width:40px;height:1px;
  background:var(--g-border-strong);
  margin:0 auto;
}

/* ====== Sections ====== */
.section{padding:88px 24px}
.section-inner{max-width:var(--g-max-w);margin:0 auto}
.section-center{text-align:center}
.section-label{
  font-family:var(--g-mono);font-size:11.5px;font-weight:500;
  color:var(--g-accent);letter-spacing:0.06em;
  margin-bottom:12px;text-transform:uppercase;
}
.section-title{
  font-size:clamp(22px,3vw,30px);
  font-weight:700;letter-spacing:-0.03em;
  line-height:1.2;margin-bottom:14px;
}
.section-desc{
  font-size:15px;color:var(--g-text-2);
  line-height:1.65;max-width:480px;
  margin-bottom:52px;
}
.section-center .section-desc{margin-left:auto;margin-right:auto}

/* ====== Features ====== */
.feat-grid{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:24px;
}
@media(max-width:768px){.feat-grid{grid-template-columns:1fr;gap:16px}}
.feat{
  padding:32px 28px;
  background:var(--g-bg-raised);
  border:1px solid var(--g-border);
  border-radius:12px;
  box-shadow:var(--g-card-shadow);
  transition:border-color .2s,box-shadow .2s;
}
.feat:hover{border-color:var(--g-border-strong)}
.feat-icon{
  width:40px;height:40px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  color:var(--g-accent);
  background:var(--g-accent-bg);
  margin-bottom:20px;
}
.feat h3{font-size:15px;font-weight:600;margin-bottom:8px;letter-spacing:-0.01em}
.feat p{font-size:13.5px;color:var(--g-text-2);line-height:1.6}

/* ====== Code showcase ====== */
.code-showcase{
  display:grid;grid-template-columns:1fr 1fr;gap:0;
  border:1px solid var(--g-term-border);
  border-radius:12px;overflow:hidden;
  box-shadow:0 8px 32px rgba(15,15,20,0.1);
}
@media(max-width:768px){.code-showcase{grid-template-columns:1fr}}
.code-panel{background:var(--g-term-bg)}
.code-panel-bar{
  display:flex;align-items:center;padding:10px 16px;
  border-bottom:1px solid var(--g-term-border);background:var(--g-term-bar);
}
.code-panel-bar span{font-family:var(--g-mono);font-size:11px;color:var(--g-term-comment)}
.code-panel pre{
  padding:20px;margin:0;font-family:var(--g-mono);font-size:12.5px;
  line-height:1.7;color:var(--g-term-text);overflow-x:auto;
}
.code-panel pre .k{color:var(--g-term-keyword)}
.code-panel pre .s{color:var(--g-term-string)}
.code-panel pre .c{color:var(--g-term-comment)}
.code-panel pre .n{color:var(--g-term-fn)}
.result-panel{background:var(--g-term-bg);border-left:1px solid var(--g-term-border)}
@media(max-width:768px){.result-panel{border-left:none;border-top:1px solid var(--g-term-border)}}
.result-panel-bar{
  display:flex;align-items:center;padding:10px 16px;
  border-bottom:1px solid var(--g-term-border);background:var(--g-term-bar);
}
.result-panel-bar span{font-family:var(--g-mono);font-size:11px;color:var(--g-term-comment)}
.result-panel pre{
  padding:20px;margin:0;flex:1;font-family:var(--g-mono);font-size:12.5px;
  line-height:1.7;color:var(--g-term-text);overflow-x:auto;
}
.result-panel pre .k{color:var(--g-term-keyword)}
.result-panel pre .s{color:var(--g-term-string)}
.result-panel pre .n{color:var(--g-term-fn)}

/* ====== Integrations ====== */
.integrations-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.integ{
  display:inline-flex;align-items:center;gap:8px;
  padding:11px 20px;
  border:1px solid var(--g-border);border-radius:10px;
  background:var(--g-bg-raised);
  font-size:13.5px;font-weight:500;
  color:var(--g-text) !important;text-decoration:none !important;
  transition:border-color .2s,box-shadow .2s;
}
.integ:hover{border-color:var(--g-accent);box-shadow:0 0 0 1px var(--g-accent)}
.integ-arrow{font-size:11px;color:var(--g-text-3);transition:color .15s,transform .15s}
.integ:hover .integ-arrow{color:var(--g-accent);transform:translateX(2px)}

/* ====== Footer ====== */
.site-footer{
  padding:40px 24px;text-align:center;
  font-size:12px;color:var(--g-text-3);
  border-top:1px solid var(--g-border);
}
.site-footer a{color:var(--g-text-3);text-decoration:underline;text-underline-offset:2px}
.site-footer a:hover{color:var(--g-text-2)}
.footer-links{display:flex;gap:16px;justify-content:center;margin-bottom:12px}
.footer-links a{text-decoration:none;font-weight:450}
.footer-links a:hover{color:var(--g-text);text-decoration:none}

/* ==================== DOCS ==================== */
.docs-layout{
  max-width:var(--g-docs-max-w);margin:0 auto;display:grid;
  grid-template-columns:220px minmax(0,1fr) 180px;
  gap:0;min-height:calc(100vh - var(--g-nav-h) - 1px);
}
@media(max-width:1024px){.docs-layout{grid-template-columns:minmax(0,1fr)}}

.docs-sidebar{
  position:sticky;top:calc(var(--g-nav-h) + 1px);
  height:calc(100vh - var(--g-nav-h) - 1px);
  overflow-y:auto;padding:24px 12px 24px 24px;
  border-right:1px solid var(--g-border);
}
.docs-sidebar::-webkit-scrollbar{width:3px}
.docs-sidebar::-webkit-scrollbar-thumb{background:var(--g-border);border-radius:3px}
@media(max-width:1024px){
  .docs-sidebar{display:none}
  .docs-sidebar.open{
    display:block;position:fixed;
    top:calc(var(--g-nav-h) + 1px);left:0;
    width:280px;height:calc(100vh - var(--g-nav-h) - 1px);
    background:var(--g-bg);z-index:50;
    box-shadow:4px 0 24px rgba(0,0,0,0.06);
    animation:fadeIn .15s ease;
  }
}
.docs-sidebar-group{margin-bottom:2px}
.docs-sidebar-group+.docs-sidebar-group:has(.docs-sidebar-group-title){margin-top:16px}
.docs-sidebar-group-title{
  font-size:10px;font-weight:600;
  text-transform:uppercase;letter-spacing:0.08em;
  color:var(--g-text-3);padding:4px 10px;margin-bottom:2px;
}
.docs-sidebar a{
  display:block;padding:5px 10px;
  font-size:13px;color:var(--g-text-2);
  text-decoration:none;border-radius:6px;
  transition:color .1s,background .1s;
}
.docs-sidebar a:hover{color:var(--g-text);background:var(--g-bg-subtle);text-decoration:none}
.docs-sidebar a.active{
  color:var(--g-accent-text);
  background:var(--g-accent-bg);
  font-weight:500;
}

.docs-content{padding:40px 52px;min-width:0}
@media(max-width:768px){.docs-content{padding:24px 20px}}

/* Prose */
.prose{max-width:720px}
.prose h1{font-size:28px;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;line-height:1.15}
.prose>p:first-of-type{
  font-size:15.5px;color:var(--g-text-2);margin-bottom:36px;
  line-height:1.7;padding-bottom:24px;border-bottom:1px solid var(--g-border);
}
.prose h2{
  font-size:20px;font-weight:600;margin-top:48px;margin-bottom:16px;
  letter-spacing:-0.02em;padding-bottom:8px;border-bottom:1px solid var(--g-border);
}
.prose h3{font-size:16px;font-weight:600;margin-top:32px;margin-bottom:12px}
.prose p{margin-bottom:16px;line-height:1.75;font-size:14.5px}
.prose ul,.prose ol{margin-bottom:16px;padding-left:20px}
.prose li{margin-bottom:6px;line-height:1.75;font-size:14.5px}
.prose code{
  font-family:var(--g-mono);font-size:0.8em;
  background:var(--g-bg-code-inline);padding:2px 6px;border-radius:4px;
}
.prose pre{
  margin-bottom:20px;border-radius:10px;
  border:1px solid var(--g-border);
  overflow-x:auto;background:var(--g-bg-code);
}
.prose pre code{
  display:block;padding:18px 20px;
  background:transparent;border:none;
  font-size:13px;line-height:1.7;color:var(--g-code-text);
}
.prose table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13.5px}
.prose th{
  text-align:left;font-weight:600;padding:10px 12px;
  border-bottom:2px solid var(--g-border-strong);
  font-size:12px;text-transform:uppercase;letter-spacing:0.04em;
  color:var(--g-text-2);
}
.prose td{padding:10px 12px;border-bottom:1px solid var(--g-border)}
.prose td code{font-size:12px}
.prose blockquote{
  border-left:2px solid var(--g-accent);
  padding:12px 16px;margin-bottom:16px;
  background:var(--g-accent-bg);border-radius:0 8px 8px 0;
}
.prose blockquote p{margin-bottom:0}
.prose a{color:var(--g-accent);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.prose a:hover{color:var(--g-accent-hover)}

/* Shiki dual-theme (CSS custom properties approach) */
.shiki{background:transparent !important}
.shiki code{background:transparent !important}
@media(prefers-color-scheme:dark){
  html:not([data-theme="light"]) .shiki,
  html:not([data-theme="light"]) .shiki span{color:var(--shiki-dark) !important;background-color:var(--shiki-dark-bg) !important}
}
[data-theme="dark"] .shiki,
[data-theme="dark"] .shiki span{color:var(--shiki-dark) !important;background-color:var(--shiki-dark-bg) !important}
.shiki span{background-color:transparent !important}
@media(prefers-color-scheme:dark){
  html:not([data-theme="light"]) .shiki span{background-color:transparent !important}
}
[data-theme="dark"] .shiki span{background-color:transparent !important}

/* ToC */
.docs-toc{
  position:sticky;top:calc(var(--g-nav-h) + 1px);
  height:calc(100vh - var(--g-nav-h) - 1px);
  overflow-y:auto;padding:24px 16px;
  border-left:1px solid var(--g-border);
}
@media(max-width:1024px){.docs-toc{display:none}}
.docs-toc-title{
  font-size:10.5px;font-weight:600;
  text-transform:uppercase;letter-spacing:0.08em;
  color:var(--g-text-3);margin-bottom:12px;
}
.docs-toc a{
  display:block;font-size:12px;color:var(--g-text-3);
  text-decoration:none;padding:3px 0;transition:color .1s;
}
.docs-toc a:hover{color:var(--g-text);text-decoration:none}
.docs-toc a.depth-3{padding-left:12px}

/* Prev/Next */
.docs-nav-links{
  display:grid;grid-template-columns:1fr 1fr;gap:12px;
  margin-top:56px;padding-top:24px;border-top:1px solid var(--g-border);
}
.docs-nav-link{
  display:block;padding:16px;
  border:1px solid var(--g-border);border-radius:10px;
  text-decoration:none !important;transition:border-color .2s;
}
.docs-nav-link:hover{border-color:var(--g-accent)}
.docs-nav-link-label{font-size:11px;color:var(--g-text-3);margin-bottom:4px}
.docs-nav-link-title{font-size:14px;font-weight:500;color:var(--g-accent)}
.docs-nav-link.next{text-align:right}

/* Mobile toggle */
.docs-mobile-toggle{
  display:none;position:fixed;bottom:20px;right:20px;
  z-index:51;width:44px;height:44px;border-radius:12px;
  background:var(--g-accent);color:#fff;
  border:none;font-size:18px;cursor:pointer;
  box-shadow:0 4px 12px rgba(67,56,202,0.3);
  align-items:center;justify-content:center;
}
@media(max-width:1024px){.docs-mobile-toggle{display:flex}}
.docs-overlay{
  display:none;position:fixed;inset:0;
  top:calc(var(--g-nav-h) + 1px);
  background:rgba(0,0,0,0.2);z-index:49;
}
.docs-overlay.open{display:block}
`;
