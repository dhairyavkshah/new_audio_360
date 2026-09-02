---
name: Expo preview routing
description: Why this project uses a static Expo web export for its Replit preview workflow.
---

Use the production-style Expo web export and a static server for the main Replit preview workflow. Keep Expo development mode available separately for live bundling.

**Why:** The main preview should expose a stable browser-ready build while preserving Expo development mode for native-client workflows.

**How to apply:** Preserve the static export workflow when adjusting Replit run configuration. Use Expo development mode separately when live bundling is specifically needed.