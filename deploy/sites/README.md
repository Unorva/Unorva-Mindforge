# Sites frontend preview

Published frontend: https://unorva-mindforge-preview.savorytoad.chatgpt.site

The Site is private to its owner. The Java backend is not deployed.

The deployment checkout is `deploy/sites/mindforge-web`. Its `.openai/hosting.json`
stores the Sites project ID and the SPA fallback configuration. The checkout and
deployment archives are ignored by the main repository because Sites manages a
separate source repository for the static export.

Build the current frontend from `apps/web/mindforge-web` with `npm run lint` and
`npm run build`. Replace the deployment checkout's generated `dist` with that
fresh export, then use the Sites hosting workflow to publish a version of the
same project ID. Keep source credentials in memory and send them through stdin.

This preview excludes `backend/mindforge-server`. Without a deployed backend,
login, daily reviews, and project persistence are unavailable. The existing
component previews can be opened without the application's login:

- `/preview/ai-avatar`
- `/preview/markdown-editor`
- `/preview/segmented-bar-chart`
