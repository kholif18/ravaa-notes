---
name: frontend-design
description: Design and style UI components for Ravaa Account following the Ravaa ecosystem design system. Use when building new pages, modifying layouts, updating styles, creating components, or when the user asks to improve/fix the UI. Matches Ravaa Drive's dark-first theme, glass morphism, sidebar layout, and Lucide icon patterns.
---

# Frontend Design Skill — Ravaa Account

This skill guides UI design for **Ravaa Account** following the **Ravaa ecosystem design system** (matching Ravaa Drive).

---

## Design System

### Theme (Dark-First)

```css
/* src/index.css — CSS Variables */
:root, .dark {
  --background: #0f172a;      /* slate-900 */
  --foreground: #f8fafc;      /* slate-50 */
  --card-bg: #1e293b;         /* slate-800 */
  --card-border: #334155;     /* slate-700 */
  --muted: #64748b;           /* slate-500 */
  --accent: #3b82f6;          /* blue-500 */
}

.light {
  --background: #f8fafc;      /* slate-50 */
  --foreground: #0f172a;      /* slate-900 */
  --card-bg: #ffffff;
  --card-border: #e2e8f0;     /* slate-200 */
  --muted: #94a3b8;           /* slate-400 */
  --accent: #2563eb;          /* blue-600 */
}
```

### Color Palette

| Role | Dark | Light | Usage |
|------|------|-------|-------|
| Primary | `blue-500` (#3b82f6) | `blue-600` (#2563eb) | Buttons, links, focus rings |
| Primary hover | `blue-600` | `blue-500` | Hover states |
| Primary bg | `blue-500/20` | `blue-500/10` | Active nav items |
| Danger | `red-500` | `red-600` | Delete buttons, errors |
| Danger bg | `red-500/20` | `red-500/10` | Error alerts |
| Success | `green-500` | `green-600` | Active status, success |
| Warning | `yellow-500` | `yellow-600` | Warning status, admin badge |
| Purple | `purple-500` | `purple-600` | Admin section accent |
| Purple bg | `purple-500/20` | `purple-500/10` | Active admin nav |
| Surface | `slate-800` | `white` | Cards, inputs |
| Surface hover | `slate-700` | `slate-50` | Hover states |
| Border | `slate-700/30` | `slate-200/50` | Dividers, card borders |
| Text primary | `slate-50` | `slate-900` | Headings |
| Text secondary | `slate-400` | `slate-500` | Body text |
| Text muted | `slate-500` | `slate-400` | Labels, captions |

### Typography

- **Font**: Inter (or system fallback: `ui-sans-serif, system-ui, sans-serif`)
- **Heading**: `font-bold` or `font-semibold`
- **Body**: `text-sm` (14px) or `text-base` (16px)
- **Caption**: `text-xs` (12px)
- **Section headers**: `text-[10px] font-semibold uppercase tracking-wider text-slate-500`

### Spacing

- Page padding: `px-6 py-8`
- Card padding: `px-6 py-4`
- Section gap: `space-y-6`
- Item gap: `gap-4` or `gap-6`
- Inline gap: `gap-2` or `gap-3`

### Border Radius

- Buttons: `rounded-lg`
- Cards: `rounded-xl`
- Inputs: `rounded-xl`
- Modals: `rounded-2xl sm:rounded-3xl`
- Badges: `rounded-full`
- Glass cards: `rounded-2xl sm:rounded-3xl`

---

## Component Patterns

### Glass Card (Login/Register)

```tsx
<Card className="rounded-2xl sm:rounded-3xl border p-6 sm:p-8 shadow-xl backdrop-blur-xl 
  dark:border-slate-700/50 dark:bg-slate-900/70 
  border-slate-200/60 bg-white/80">
  <CardContent className="p-0">
    {/* Content */}
  </CardContent>
</Card>
```

### Input with Icon

```tsx
<div className="relative">
  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 
    dark:text-slate-500 text-slate-400" />
  <input
    className="w-full rounded-xl border pl-11 pr-4 py-3 text-sm transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 
      dark:bg-slate-900/60 dark:border-slate-700/60 dark:text-slate-200 dark:placeholder:text-slate-500 
      bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
  />
</div>
```

### Gradient Button

```tsx
<Button className="rounded-xl py-3 text-sm font-semibold 
  bg-gradient-to-r from-blue-600 to-indigo-600 
  shadow-lg shadow-blue-600/25 
  hover:from-blue-500 hover:to-indigo-500 
  active:scale-[0.98] transition-all duration-200">
  Sign in
</Button>
```

### Sidebar Nav Item

```tsx
<Link
  className={cn(
    "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors mb-0.5",
    "px-3 py-2",
    isActive
      ? "bg-blue-500/20 text-blue-400"
      : "dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
  )}
>
  <Icon className="w-4 h-4 shrink-0" />
  <span>{label}</span>
</Link>
```

### Admin Nav Item

```tsx
// Same as above but with purple accent
isActive
  ? "bg-purple-500/20 text-purple-400"
  : "dark:text-slate-400 dark:hover:text-slate-200 ..."
```

### Decorative Orbs (Background)

```tsx
<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
  <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full blur-3xl 
    dark:bg-blue-600/25 bg-blue-400/30" />
  <div className="absolute -bottom-48 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl 
    dark:bg-purple-600/20 bg-purple-400/25" />
  <div className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full blur-3xl 
    dark:bg-cyan-500/15 bg-cyan-300/20" />
</div>
```

### Alert (Error/Success)

```tsx
// Error
<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">
  {error}
</div>

// Success
<div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-500">
  {success}
</div>
```

---

## Layout Patterns

### Public Layout (Login/Register)
```
┌─────────────────────────────────────────┐
│ Theme toggle (top-right)                │
│                                         │
│ ┌──────────┬──────────────────────────┐ │
│ │ Branding │ Glass card               │ │
│ │ (desktop)│ - Logo                   │ │
│ │          │ - Welcome text           │ │
│ │ Features │ - Form with icons        │ │
│ │ list     │ - Gradient button        │ │
│ │          │ - Footer link            │ │
│ └──────────┴──────────────────────────┘ │
│                                         │
│ Decorative orbs (blurred, behind card)  │
└─────────────────────────────────────────┘
```

### Authenticated Layout (Sidebar)
```
┌────────┬────────────────────────────────┐
│ Sidebar│ Main content                   │
│        │                                │
│ Logo   │ max-w-4xl mx-auto px-6 py-8   │
│ ─────  │                                │
│ Account│                                │
│ · Dash │                                │
│ · Prof │                                │
│ · Sec  │                                │
│ · Sess │                                │
│ · App  │                                │
│ ─────  │                                │
│ Admin  │                                │
│ · Over │                                │
│ · App  │                                │
│ · Perm │                                │
│ ─────  │                                │
│ Theme  │                                │
│ User   │                                │
│ Logout │                                │
│ Collap │                                │
└────────┴────────────────────────────────┘
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|--------------|-----|
| No padding on cards | Always use `p-6 sm:p-8` on glass cards |
| Plain white/dark bg | Add decorative orbs or use glass morphism |
| Solid buttons | Use gradient buttons for primary actions |
| Missing hover states | Every interactive element needs hover |
| Missing focus rings | Use `focus:ring-2 focus:ring-blue-500/60` |
| Wrong dark mode colors | Use `dark:` prefix, test both themes |
| Inconsistent spacing | Follow spacing scale (4, 6, 8, 12, 16) |
| Missing icons | Use Lucide React for all UI icons |

---

## Icon Usage

| Context | Icon | Size |
|---------|------|------|
| Nav items | Lucide icons | `w-4 h-4` |
| Input icons | Lucide icons | `h-4 w-4` |
| Card icons | Lucide icons | `w-5 h-5` |
| Decorative | Custom SVG or gradient bg | varies |

Common icons:
- Navigation: `LayoutDashboard`, `User`, `Shield`, `Clock`, `Puzzle`, `Settings`
- Auth: `Mail`, `Lock`, `LogOut`
- Actions: `Plus`, `Trash2`, `Copy`, `Check`
- Theme: `Sun`, `Moon`
- Chevron: `ChevronLeft`, `ChevronRight`

---

## Responsive Breakpoints

- Mobile: default (single column)
- Tablet: `sm:` (640px) — adjust padding
- Desktop: `lg:` (1024px) — two-column layout for auth, sidebar visible
- Sidebar collapse: toggle button, persisted to localStorage

---

## Verification

After any UI change:
1. Run `npm run build` — must pass
2. Test dark mode toggle
3. Test responsive: 375px, 768px, 1280px
4. Check all interactive elements have hover + focus states
5. Verify glass morphism renders (backdrop-blur)
