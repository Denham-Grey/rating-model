# D+G Terminal

Launchpad for Denham and Grey's six proprietary systems. React 19 + Vite + TypeScript.

## Commands

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`     | Local dev server with hot reload              |
| `npm run build`   | Type-check and build static files to `dist/`  |
| `npm run preview` | Serve the production build locally            |

## Configuring the systems

Edit `src/config.ts`. For each system set `url` (full `https://…` address, or `""` to keep the card inactive) and `status` (`"live"`, `"maintenance"` or `"offline"`). `OPEN_IN_NEW_TAB` controls whether launches open a new tab. Rebuild after changes.

Card copy, colours and icons live in `src/content.tsx`; styles in `src/styles.css`.

## Deploying

`npm run build` produces a fully static `dist/` folder with relative asset paths, so it can be hosted on any static host (Netlify, Vercel, S3/CloudFront, Azure Static Web Apps, nginx) at the domain root or in a sub-folder. The site is marked `noindex, nofollow` and ships a `robots.txt` that disallows crawling.
