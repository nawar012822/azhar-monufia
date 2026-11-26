# المستودع الرقمي - كلية اللغة العربية (Azhar repository)

Next.js 14 + Supabase. Same pages and features as before, upgraded.

## Run
    npm ci
    cp .env.example .env.local   # set GROQ_API_KEY for the assistant
    npm run dev                  # or: npm run build && npm start

## What changed vs the Nov 15 version
- Item pages are server-rendered with real titles, descriptions and Open Graph tags (Google can read them). Non-approved items still open for their owners/moderators via the client lookup, and are not indexed.
- Public lists (home, collections, search) only load approved items and only the columns they use.
- Search escapes filter characters, caps the result count and shows an error state.
- Restricted items now require sign-in to show the file buttons; metadata-only items show a notice.
- /api/chat: input validation, message and length caps, per-IP burst limit, timeout, no internal error text returned. For a hard limit across instances add Upstash/Vercel KV.
- AI assistant mounted once (it was mounted twice on the home page).
- sitemap.xml, robots.txt, 404 and error pages, metadataBase, .env.example.
- Supabase URL/key can come from env; defaults keep the current project.

## Not done / needs the owner
- Storage bucket "books" is public: restricted files are still reachable by direct URL. Real enforcement needs a private bucket + signed URLs (changes the live data setup).
- RLS policies were not visible to us. Run supabase/audit.sql and review before relying on the client-side role checks in /dashboard.
