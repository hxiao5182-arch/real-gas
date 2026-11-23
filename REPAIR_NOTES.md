# Repair notes — Real Gas Escape Room

- Removed four accidentally uploaded root-level files (`page.tsx`, `route.ts`, `records.ts`, `globals.css`). They were not used by the Next.js app.
- Merged teacher Level 2 per-record delete button into `app/page.tsx` and matching styles into `app/globals.css`.
- Added authenticated `DELETE /api/level2?id=...` to `app/api/level2/route.ts` and a single-record delete helper in `lib/records.ts`.
- Did **not** include bulk-clear operations; Level 1 data remains unaffected.
- No database schema changes; the existing Railway volume and SQLite data must be preserved.
- `.gitignore` excludes secrets, data and generated files.

## Deployment

Upload all contents of this folder at the repository root, preserving the `app/`, `lib/`, `db/`, and `public/` directories. Replace existing versions of modified files and remove the four stray root-level files. Never remove the Railway volume or alter `DATA_DIR`.

After deploying, log in as teacher, open Level 2, delete a **test** response using the trash icon, confirm the prompt, and verify the response disappears while Level 1 records remain.

Note: Level 2 autosave from an open student tab can recreate a deleted answer if that student edits it again.
