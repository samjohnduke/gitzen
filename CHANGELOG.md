# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

## 2026-02-26

### Added
- Rich markdown editor with TipTap (WYSIWYG, bubble menu, markdown shortcuts)
- Content management for multiple collections with YAML frontmatter
- PR-based content workflow (draft branches, auto-PR creation, structured diffs)
- Preview deployments via Cloudflare Pages integration
- Reviews UI with merge, rebase, conflict detection, and diff viewing
- Command palette (Cmd+K) for global search
- Browser session auth via GitHub OAuth
- API tokens with fine-grained permissions and repo scoping
- Device code auth flow for CLI tools and native apps
- Token management UI (create, list, revoke)
- Multi-repo support (connect and switch between GitHub repositories)
- REST API with 20+ endpoints for programmatic access
- Autosave drafts to localStorage
- Light/dark theme toggle
- Sentry error tracking for frontend and worker with source maps and release health
- Axiom request logging with structured log context
- Content Security Policy with per-request nonces
- AES-256-GCM encryption for GitHub tokens at rest
- HMAC-SHA256 signed API tokens with constant-time comparison
- HKDF key derivation for cryptographic operations
- Self-hosting support on Cloudflare Workers (free tier)
- SSG integration guides for Astro, Hugo, Next.js, Jekyll, and Eleventy
- Documentation site with getting started, configuration, workflow, auth, and API reference
- GitHub Actions CI/CD (typecheck, test, Sentry release, deploy)
- README and contributing guide
