# Project Structure (Frontend)

- `app/` — App Router routes and pages.
- `components/` — Reusable UI components.
- `hooks/` — Custom React hooks.
- `lib/` — Client utilities (API wrapper, auth helpers).
- `public/` — Static assets.
- `styles/` — Global CSS (Tailwind import).
- `tests/` — Jest tests.
- `var/local/` — Local-only runtime files (DB, logs, samples). **Not committed.**
- `docs/` — Project documentation.

## Environment
- `.env.local` sets `NEXT_PUBLIC_API_BASE` (browser-visible).

## API Calls
Use `lib/api.ts`:
```ts
import { api } from "@/lib/api";
const data = await api.get("/health");
```