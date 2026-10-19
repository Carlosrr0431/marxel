<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install with `npm ci`. Start the app with `npm run dev` (Next.js 16 already binds `0.0.0.0:3000`). Open `http://localhost:3000` or `http://127.0.0.1:3000`.
- The public site and `GET /api/sc-auto` (San Cristóbal catalog and postal codes) work without `.env.local`. Choosing a year in the home quote form loads brands from that API.
- `npm run build` fails with `supabaseUrl is required` until `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set. CRM reads, lead writes, WhatsApp, mailing, and insurer B2B calls need the real values in `.env.example`, plus `CRM_PASSWORD`.
- `npx tsc --noEmit` passes. `npm run lint` currently exits with existing React and ESLint errors in the CRM; do not treat that as an environment failure.
