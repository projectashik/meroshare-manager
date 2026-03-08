# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

- **Build:** `pnpm run build` (runs `tsc`, outputs to `dist/`)
- **Run:** `pnpm start` or `node dist/index.js`
- **Run without build:** `npx tsx src/index.ts`
- **Install deps:** `pnpm install`

There are no tests or linting configured.

## Architecture

This is a TypeScript CLI tool (`meroshare`) for managing Nepal's Meroshare stock/IPO system. It has **zero runtime npm dependencies** — it uses system `curl` for HTTP and Node.js built-ins only.

**Module structure (all in `src/`):**

- **index.ts** — CLI entry point and all command handlers (init, configure, accounts, portfolio, apply, migrate, help). Parses `process.argv[2]` for command routing. Default command is `portfolio`.
- **client.ts** — `MeroshareClient` class wrapping the Meroshare REST API (`https://webbackend.cdsc.com.np/api`). Uses `child_process.execFile('curl', ...)` for all HTTP. Manages auth tokens from login responses.
- **display.ts** — Terminal UI with ANSI color codes, table formatting, and status indicators. All visual output goes through this module.
- **types.ts** — TypeScript interfaces for API payloads/responses and config structure.
- **keychain.ts** — macOS Keychain integration via the `security` CLI command. Falls back to `~/.config/meroshare/config.json` on other platforms.

**Key design decisions:**
- ESM module system (`"type": "module"`, Node16 module resolution)
- TypeScript strict mode, target ES2022
- Multi-account support: all commands iterate over configured accounts
- Credentials stored in macOS Keychain (primary) or config.json (fallback)
- Interactive prompts via `node:readline` with silent password input
