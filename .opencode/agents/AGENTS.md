# Ravaa Notes — AI Agent Guide (Web Cangkang)

## Overview
Ravaa Notes web adalah **cangkang** kayak Drive — semua auth & user di `ravaa-service` (2711), Notes cuma simpan `Note/Notebook/Todo/Share` dengan `ownerId = Ravaa UUID` (tanpa `User` table). Port **2714** (sequential: 2711 Service → 2712 Account → 2713 Drive → 2714 Notes).

- **User language:** Indonesian — jawab Indonesia kecuali user pakai English
- **Git policy:** Jangan push tanpa `push ke git` eksplisit

## Tech
- Next 16 + Tailwind 4 (`@import "tailwindcss"` + `@plugin "@tailwindcss/typography"` untuk `prose` preview) + Prisma 7 SQLite (`dev.db`)
- Auth: cangkang via `GET http://localhost:2711/api/v1/me` introspect `ravaa_token` (HttpOnly `15m`, cache 30s) — tiap app login sendiri ala Google (`/login` UI Notes, `POST /api/auth/ravaa/login` proxy ke service, set `ravaa_token` + `localStorage` untuk cross-port Drive upload)
- Markdown: `react-markdown` + `remark-gfm`, toolbar Bold/Italic/Strikethrough/H1/H2/H3/List/Task/Quote/Link/HR/Code/Image, preview `prose` + copy code + checkbox interactive

## Structure
```
ravaa-notes/
├── .opencode/agents/AGENTS.md
├── prisma/schema.prisma (Note, Notebook, Todo, TodoList, Share)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── notes/page.tsx (Joplin: tree notebooks, list, editor, preview)
│   │   └── api/
│   │       ├── notes, notebooks, todos, todo-lists
│   │       ├── share, shared/[token]
│   │       └── auth/ravaa/login (proxy) + logout
│   ├── lib/
│   │   ├── prisma.ts (PrismaLibSql)
│   │   ├── auth.ts (getUserFromRavaa, getTokenFromHeader)
│   │   ├── share.ts (generateShareToken 32B base64url, bcrypt)
│   │   └── utils.ts (cn)
│   └── middleware.ts (cek ravaa_token → redirect /login?from=)
└── package.json (dev: next dev -p 2714)
```

## Data Model (prisma/schema.prisma — cangkang)
- **Notebook:** id, name, color, userId (Ravaa UUID), parentId? (nested), position, children relation `NotebookTree`
- **Note:** id, title, content, notebookId?, userId, isPinned, isTrashed, tags, notebook relation
- **Todo/TodoList:** userId, listId, priority, dueDate
- **Share:** shareableType `note|notebook|todo`, shareableId, sharedById (Ravaa UUID), shareToken @unique 43-char, visibility `PRIVATE|FAMILY|LINK`, permission `view|edit`, passwordHash, maxViews, viewCount, allowDownload, revokedAt, expiresAt

## Share 3-level (untuk toko)
- `PRIVATE` owner, `FAMILY` butuh login, `LINK` `/s/{token}` tanpa akun (256-bit + password bcrypt + expiry 7d + maxViews) — logic di Notes, bukan Account

## API
- `GET /api/notes?q=&notebookId=&pinned=&tag=&trash=` | `POST /api/notes` | `PATCH/DELETE /api/notes/[id]` + `POST /restore` + `DELETE /permanent`
- `GET/POST /api/notebooks` (parentId untuk nested)
- `GET/POST /api/todos`, `GET/POST /api/todo-lists`
- `GET/POST /api/share`, `GET /api/shared/:token?password=` (increment viewCount)

## Auth
- `POST /api/auth/ravaa/login` → forward `POST http://localhost:2711/api/v1/auth/login` → set `ravaa_token` (HttpOnly 15m) + return `accessToken` untuk `localStorage` (cross-port Drive upload)
- `getTokenFromHeader` cek `Authorization: Bearer` atau `Cookie: ravaa_token`
- `GET /api/notes` → `Authorization: Bearer` atau `credentials: include` (cookie)

## UI Notes (Joplin mirip Drive lama)
- **Sidebar:** tree Notebook nested, All Notes, Pinned only (★), Trash (merah), New Notebook (dengan parentId)
- **Tengah:** list Joplin title-only + search + tag badge + Pin/Unpin + Delete (soft), kalau Trash → Restore / Hapus permanen
- **Kanan:** editor `title` + `tags` + `Save`/`Delete`/`Share LINK`/`Preview` toggle + toolbar 12 tombol (Bold/Italic/Strike/H1/H2/H3/List/Task/Quote/Link/HR/Code/Image + Undo/Redo) + `textarea` / `ReactMarkdown` preview (prose, task checkbox interactive, img, code copy)

## Perintah
```bash
npm install
npx prisma db push
npx prisma generate
npx tsc --noEmit # harus 0
npm run dev # 2714
npm run build
```

## Verifikasi
- `http://localhost:2714/login` → login `admin@ravaa.my.id / Secret123` → redirect `/notes`
- Buat note `# Judul` + `- [ ] task` → Preview → heading besar, task klik jadi checked
- Share LINK → `/s/{token}` tanpa login (password jika ada)
