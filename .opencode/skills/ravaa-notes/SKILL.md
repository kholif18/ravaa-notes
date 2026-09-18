---
name: ravaa-notes
description: Guide for developing Ravaa Notes web, a Next.js 16 + Prisma (SQLite) Joplin-style notes app. Use when writing or modifying any app code — components, API routes, Prisma queries, pages, hooks, styles. Covers component patterns, API conventions, data model, editor, share, and verification steps. Triggers on "ravaa notes", "notes page", "note editor", "notebook", "todo", "share note", "prisma", "api route".
---

# Ravaa Notes Development Skill

## Before you start
- Read `.opencode/agents/AGENTS.md` — authoritative guide (HOME cangkang, ShareLink 3-level, data model)
- Always finish with `npx tsc --noEmit` — must pass
- User speaks Indonesian; Git push only when explicitly asked

## Project Structure
```
ravaa-notes/
├── prisma/schema.prisma (Note, Notebook, Todo, TodoList, Share)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── notes/page.tsx (Joplin: tree, list, editor, preview)
│   │   └── api/
│   │       ├── notes, notebooks, todos, todo-lists
│   │       ├── share, shared/[token]
│   │       └── auth/ravaa/login
│   ├── lib/
│   │   ├── prisma.ts (PrismaLibSql)
│   │   ├── auth.ts (getUserFromRavaa, getTokenFromHeader)
│   │   └── share.ts (generateShareToken 32B, bcrypt)
│   └── components/
│       ├── auth/login-form.tsx (per-app login ala Google)
│       └── notes/share-dialog.tsx
└── package.json (dev: next dev -p 2714)
```

## Data Model (cangkang, Ravaa UUID)
- **Notebook:** id, name, color, userId, parentId? (nested), position, children
- **Note:** id, title, content, notebookId?, userId, isPinned, isTrashed, tags, notebook
- **Todo/TodoList:** userId, listId, priority, dueDate
- **Share:** shareableType `note|notebook|todo`, shareableId, shareToken 43-char, visibility `PRIVATE|FAMILY|LINK`, passwordHash, maxViews, viewCount

## API Pattern
```ts
// Auth via ravaa-service introspection
const token = getTokenFromHeader(req as unknown as Request);
const user = await getUserFromRavaa(token);
if (!user) return NextResponse.json({success:false}, {status:401});

// Prisma
const notes = await prisma.note.findMany({ where: { userId: user.id, isTrashed: false }, orderBy: [{isPinned:"desc"}] });
```

## Editor Pattern (Joplin)
- Toolbar: Bold (`**`), Italic (`*`), H1 (`# `), H2 (`## `), H3, List (`- `), Task (`- [ ] `), Quote (`> `), Link (`[text](url)`), HR, Code (```), Image (`![alt](url)` via Drive upload)
- Preview: `ReactMarkdown` + `remarkGfm` + `@tailwindcss/typography` (`prose`), task checkbox interactive (`toggleTaskInPreview`), img/link/code styling, copy button

## Share Pattern (HOME 3-level)
- `POST /api/share` body `{shareableType:"note", shareableId, visibility:"LINK", password, expiresAt, maxViews}` → `{shareToken, url: /s/{token}}`
- `GET /s/{token}?password=` → validate `passwordHash` + `expiresAt` + `maxViews` + `revokedAt`

## Verification
```bash
npx tsc --noEmit
npm run build
curl -H "Authorization: Bearer $TOKEN" http://localhost:2714/api/notes
```

