# RINL Vizag Steel Plant — Centralized Delay Analysis System

## System Design Document

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Design](#4-database-design)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Layer](#6-api-layer)
7. [Component Tree](#7-component-tree)
8. [Route Map](#8-route-map)
9. [State Management](#9-state-management)
10. [Styling & Theming](#10-styling--theming)
11. [Build & Deployment](#11-build--deployment)
12. [Security Considerations](#12-security-considerations)
13. [Environment Configuration](#13-environment-configuration)
14. [Development Workflow](#14-development-workflow)

---

## 1. Project Overview

### Purpose
A centralized web application for monitoring, analyzing, and reporting equipment delays across the Rashtriya Ispat Nigam Limited (RINL) Visakhapatnam Steel Plant. The system replaces manual logbooks with a digital platform that provides real-time visibility into production bottlenecks across 9 plant shops.

### Key Capabilities
- **Delay Logging**: Form-based entry of equipment delays with cascading shop/equipment/sub-equipment selection and auto-calculated duration
- **Dashboard**: Real-time operational overview with stat cards and charts (bar chart by shop, pie chart by agency)
- **Reports**: Filterable, sortable, exportable delay records with tabular and graphical views
- **User Management**: Role-based administration with employee account creation and permission assignment
- **Self-Registration**: Plant workers can register themselves (auto-assigned lowest-privilege role)
- **Public Landing Page**: Animated hero section with live statistics counters, process flow visualization, and plant information

### Actors
| Actor | Role | Permissions |
|---|---|---|
| System Admin (`sys_admin`) | Full system control | Create/manage users, assign roles, view all data, CRUD delays |
| Dept Admin (`dept_admin`) | Department-level admin | View all data, manage department users, CRUD delays |
| Dept User (`dept_user`) | Standard worker | Log delays, view data (default on self-registration) |
| PPM Admin (`ppm_admin`) | Production Planning admin | View all data, update delays |
| PPM User (`ppm_user`) | Production Planning user | View data, log delays |

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI library |
| TypeScript | 5.8.3 | Type-safe development |
| TanStack React Router | 1.168.25 | File-based client + SSR routing |
| TanStack React Start | 1.167.50 | Meta-framework (SSR, server functions, middleware) |
| TanStack React Query | 5.83.0 | Server-state management & caching |
| Tailwind CSS | 4.2.1 | Utility-first CSS framework (v4) |
| shadcn/ui (Radix Primitives) | - | 46 accessible UI components |
| Recharts | 2.15.4 | Bar and pie chart visualizations |
| Lucide React | 0.575.0 | Icon library |
| Zod | 3.24.2 | Schema validation |
| React Hook Form | 7.71.2 | Form state management |
| Sonner | 2.0.7 | Toast notifications |
| date-fns | 4.1.0 | Date formatting |

### Backend / Database
| Technology | Version | Purpose |
|---|---|---|
| Supabase PostgreSQL | - | Primary database |
| Supabase Auth | - | Authentication (email/password) |
| Supabase JS Client | 2.108.1 | Database + Auth client SDK |
| Nitro | 3.0.260603-beta | SSR engine (TanStack Start) |

### Build Tooling
| Technology | Version | Purpose |
|---|---|---|
| Vite | 8.0.16 | Build tool & dev server |
| Lightning CSS | - | CSS transformer |
| ESLint | 9.32.0 | Linting |
| Prettier | 3.7.3 | Formatting |
| TypeScript ESLint | 8.56.1 | Type-aware lint rules |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  React   │  │ TanStack │  │ TanStack │  │ Supabase   │  │
│  │  19      │  │ Router   │  │ Query    │  │ Auth       │  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  │ (localStor)│  │
│       │            │             │         └──────┬─────┘  │
│       └────────────┴─────────────┴────────────────┘        │
│                          │                                  │
│         ┌────────────────┼──────────────────┐               │
│         ▼                ▼                  ▼               │
│   API Routes       Server Fns         Supabase REST        │
│   /api/*           /_server/fn/*      (direct SQL)         │
│         │                │                  │               │
└─────────┼────────────────┼──────────────────┼───────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vite Dev Server (SSR)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │ TanStack │  │  Nitro   │  │  Route Handlers          │  │
│  │ Start    │  │  SSR     │  │  - /api/* → server.ts    │  │
│  │ Plugin   │  │  Engine  │  │  - Sitemap → xml         │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌────────────┐ ┌────────────┐ ┌────────────────┐
    │ Supabase   │ │ Supabase   │ │  Supabase      │
    │ Auth       │ │ PostgreSQL │ │  Storage       │
    │ (GoTrue)   │ │ (RLS)      │ │  (future)      │
    └────────────┘ └────────────┘ └────────────────┘
```

### Request Flow

**Client-side data (via RLS)**:
```
Browser → supabase.from("delays_data").select() → Supabase REST API → PostgreSQL (RLS enforced)
```

**API routes (server-side)**:
```
Browser → fetch("/api/register") → Vite SSR → Route Handler → supabaseAdmin (service role) → PostgreSQL
```

**Server functions (client→server RPC)**:
```
Browser → useServerFn → POST /_server/fn/* → Nitro SSR → Auth Middleware → Handler → supabaseAdmin → DB
```

---

## 4. Database Design

### Entity-Relationship Diagram (Textual)

```
auth.users (managed by Supabase)
  │
  ├──< profiles (1:1, ON DELETE CASCADE)
  │     └── emp_no (unique, login identifier)
  │
  └──< user_roles (1:N, ON DELETE CASCADE)
        └── role (app_role enum)

eqpt_master    (reference data, readable by all)
delays_data    (core operational data, RLS-protected)
```

### Tables

#### `profiles`
Links Supabase auth users to employee data.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK → `auth.users(id)` CASCADE | User UUID |
| `emp_no` | `text` | NOT NULL, indexed | Employee number (login ID) |
| `emp_name` | `text` | NOT NULL | Full name |
| `dept` | `text` | nullable | Department/shop code |
| `designation` | `text` | nullable | Job title |
| `active` | `boolean` | DEFAULT true | Account enabled/disabled |
| `created_at` | `timestamptz` | DEFAULT now() | |

**RLS**: SELECT/UPDATE self or admin; INSERT/DELETE admin only.

#### `user_roles`
Separate roles table (not on profiles) to prevent privilege escalation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `uuid` | NOT NULL → `auth.users(id)` CASCADE, indexed | |
| `role` | `app_role` | NOT NULL | Role enum |

**Unique**: `(user_id, role)`
**RLS**: SELECT self or admin; ALL admin only.

#### `eqpt_master`
Equipment reference data (36 rows seeded).

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | PK |
| `shop_code` | `integer` | Numeric shop identifier, indexed |
| `shop_desc` | `text` | Shop description |
| `eqpt_code` | `text` | Equipment name (e.g. "Sinter Machine 1") |
| `sub_eqpt_code` | `text` | Sub-equipment code |

**RLS**: SELECT for all (public reference data).

#### `delays_data`
Core operational table — every delay event.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | PK |
| `shop_code` | `integer` | Shop ID |
| `shop_desc` | `text` | Shop description |
| `eqpt_name` | `text` | Equipment name |
| `sub_eqpt_name` | `text` | Sub-equipment |
| `delay_desc` | `text` | Delay description |
| `agency` | `text` | Responsible agency |
| `delay_from` | `timestamptz` | Start time |
| `delay_upto` | `timestamptz` | End time |
| `delay_duration` | `numeric` | Hours |
| `user_entered` | `text` | Who logged it (emp_no) |
| `created_at` | `timestamptz` | DEFAULT now() |

**Indexes**: 6 indexes for time-series, shop, agency, and composite queries.
**RLS**: SELECT authenticated; INSERT any auth user; UPDATE/DELETE admin only.

### Security-Definer Functions

```sql
is_admin(user_id uuid) → boolean
  -- Returns true if user has 'sys_admin' or 'dept_admin' role
  -- Used by RLS policies to gate admin operations

has_role(user_id uuid, role app_role) → boolean
  -- Checks specific role membership
```

---

## 5. Authentication & Authorization

### Flow

```
┌──────────┐         ┌──────────────┐         ┌────────────────┐
│  User    │         │   Browser    │         │   Supabase      │
│ enters   │  POST   │  resolves    │  POST   │   Auth + DB     │
│ EMP1001  │ ───────→│  email via   │ ───────→│                 │
│ admin123 │         │  empNoToEmail│         │ signInWithPass  │
└──────────┘         └──────────────┘         └────────────────┘
                           │                          │
                           │                    Return session
                           │◄─────────────────────────│
                           │                          │
                           ▼                          │
                    Load profile & role                │
                    from Supabase (RLS)                │
                           │                          │
                           ▼                          │
                    AuthProvider context               │
                    { profile, role,                   │
                      isAdmin, signOut }               │
```

### Key Components

| File | Role |
|---|---|
| `src/integrations/supabase/client.ts` | Browser-side Supabase client (anon key, localStorage session) |
| `src/integrations/supabase/client.server.ts` | Server-side admin client (service role key, bypasses RLS) - `.server.ts` suffix prevents client bundling |
| `src/integrations/supabase/auth-middleware.ts` | TanStack Start middleware that validates Bearer token server-side via `getClaims(token)` |
| `src/integrations/supabase/auth-attacher.ts` | Client-side middleware that attaches Bearer token to server function RPC requests |
| `src/components/auth-provider.tsx` | React context providing auth state to the entire app tree |
| `src/routes/_authenticated/route.tsx` | Layout with `beforeLoad` guard that redirects to `/auth` if unauthenticated |

### Role-Based Access Control (RBAC)

- Roles are stored in a separate `user_roles` table (never on `profiles`)
- Admin check done via `is_admin()` security-definer function (bypasses RLS)
- `ADMIN_ROLES = ["sys_admin", "dept_admin"]`
- Self-registration always assigns `dept_user` (lowest privilege)
- Admin user creation (`/api/admin/create-user`) can assign any role

### Email Convention

- Auth emails follow convention: `{emp_no}@vizagsteel.internal`
- Example: `EMP1001` → `emp1001@vizagsteel.internal`
- Users can optionally provide a real email during registration for alternative sign-in

---

## 6. API Layer

### API Routes (`src/routes/api/`)

These use TanStack Router's `server.handlers` pattern — they work as regular file-system routes with full SSR support.

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/health` | GET | None | Health check (status, uptime, env config) |
| `/api/landing-stats` | GET | None | Equipment count, shops, delays, avg hours |
| `/api/register` | POST | None | Self-registration (creates auth user + profile + dept_user role) |
| `/api/public/seed` | POST | Bearer `SEED_SECRET` | Seed 5 demo accounts (idempotent) |
| `/api/admin/create-user` | POST | Bearer Supabase token | Admin creates user (validates admin role via RPC) |

### Server Functions (`src/lib/*.functions.ts`)

| Function | Method | Middleware | Description |
|---|---|---|---|
| `createEmployee` | POST | `requireSupabaseAuth` | Admin creates user (legacy, replaced by API route) |
| `registerEmployee` | POST | None | Self-registration (legacy, replaced by API route) |
| `resolveLoginEmail` | POST | None | Resolve emp_no to auth email (legacy, replaced by client-side logic) |
| `getLandingStats` | GET | None | Public stats (legacy, replaced by API route) |
| `getGreeting` | POST | None | Example server function |

---

## 7. Component Tree

```
<App> (__root.tsx)
├── <ThemeProvider>
│   ├── <QueryClientProvider>
│   │   ├── <AuthProvider>
│   │   │   ├── <Toaster>
│   │   │   │
│   │   │   ├── Landing Page (/)
│   │   │   │   ├── <Header> (nav, hero, CTA)
│   │   │   │   ├── <StatCounter> × 4
│   │   │   │   ├── <FadeInSection> + Process Cards × 6
│   │   │   │   ├── Shop Cards × 9
│   │   │   │   ├── Feature Cards × 6
│   │   │   │   ├── Agency Cards × 5
│   │   │   │   ├── CTA Section
│   │   │   │   └── Footer
│   │   │   │
│   │   │   ├── Auth Page (/auth)
│   │   │   │   ├── <Tabs> (Sign In / Register)
│   │   │   │   ├── Login Form
│   │   │   │   ├── Registration Form
│   │   │   │   └── Demo Account Quick-Fill Buttons
│   │   │   │
│   │   │   └── Authenticated Layout (/_authenticated)
│   │   │       ├── <Sidebar>
│   │   │       │   ├── Navigation Links
│   │   │       │   ├── Theme Toggle
│   │   │       │   └── Logout Button
│   │   │       ├── Top Bar (user info, role badge)
│   │   │       │
│   │   │       ├── Dashboard (/dashboard)
│   │   │       │   ├── <StatCard> × 4
│   │   │       │   ├── <BarChart> (shop-wise hours)
│   │   │       │   └── <PieChart> (agency-wise share)
│   │   │       │
│   │   │       ├── Delay Entry (/delay-entry)
│   │   │       │   ├── Cascading Selects (shop → eqpt → sub-eqpt)
│   │   │       │   ├── DateTime Pickers
│   │   │       │   └── Description + Agency Select
│   │   │       │
│   │   │       ├── Reports (/reports)
│   │   │       │   ├── Filter Controls (shop, date range)
│   │   │       │   ├── Data Table (sortable)
│   │   │       │   ├── Horizontal Bar Chart
│   │   │       │   └── CSV Export Button
│   │   │       │
│   │   │       └── User Management (/users) [admin only]
│   │   │           ├── Users Table
│   │   │           ├── Role Selector Dropdown
│   │   │           ├── Active/Inactive Toggle
│   │   │           └── Add User Dialog
```

---

## 8. Route Map

### Public Routes
| Path | File | Description |
|---|---|---|
| `/` | `index.tsx` | Landing page with hero, stats, process flow |
| `/auth` | `auth.tsx` | Sign-in / Register |
| `/sitemap.xml` | `sitemap[.]xml.ts` | Dynamic XML sitemap |

### API Routes
| Path | File | Description |
|---|---|---|
| `/api/health` | `api/health.ts` | Server health check |
| `/api/landing-stats` | `api/landing-stats.ts` | Public dashboard statistics |
| `/api/register` | `api/register.ts` | User self-registration |
| `/api/public/seed` | `api/public/seed.ts` | Seed demo accounts |
| `/api/admin/create-user` | `api/admin/create-user.ts` | Admin user creation |

### Authenticated Routes (under `/_authenticated` layout)
| Path | File | Description |
|---|---|---|
| `/dashboard` | `_authenticated/dashboard.tsx` | Operations dashboard |
| `/delay-entry` | `_authenticated/delay-entry.tsx` | Log new delay |
| `/reports` | `_authenticated/reports.tsx` | Delay reports & export |
| `/users` | `_authenticated/users.tsx` | User management |

---

## 9. State Management

### Server State (TanStack Query)
- **Query Key Convention**: `["resource", ...filters]`
  - `["delays", "dashboard"]` — Dashboard data
  - `["delays", "reports", shop, from, to]` — Report data
  - `["admin-users"]` — User management list
  - `["landing-stats"]` — Landing page stats
- **Automatic Caching**: Default stale time (0), refetch on window focus
- **Invalidation**: After mutations (add user, set role, log delay)

### Auth State (React Context)
- **AuthProvider** context provides:
  - `profile` — current user's profile record
  - `role` — current user's role
  - `isAdmin` — derived boolean
  - `loading` — auth initialization state
  - `signOut()` — clears queries + session + navigates to `/auth`

### Theme State (React Context)
- **ThemeProvider** context:
  - `theme` — `"dark"` | `"light"`
  - `toggleTheme()` — switches theme, persists to `localStorage`

### Form State
- React Hook Form for complex forms (reports filtering)
- Plain `useState` for simpler forms (auth, add user dialog)

---

## 10. Styling & Theming

### Approach
- **Tailwind CSS v4** with CSS-based configuration (no `tailwind.config.js`)
- **CSS `@theme inline` directive** for custom design tokens
- **`@custom-variant dark`** for dark mode support

### Design System
| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--color-background` | `oklch(0.97 0 0)` | `oklch(0.13 0.01 260)` | Page background |
| `--color-card` | `oklch(0.99 0 0)` | `oklch(0.17 0.01 260)` | Card surface |
| `--color-primary` | `oklch(0.55 0.19 45)` | `oklch(0.70 0.19 45)` | Primary/metal accent |
| `--color-foreground` | `oklch(0.15 0.02 260)` | `oklch(0.92 0.01 260)` | Text color |
| `--font-display` | Space Grotesk | Space Grotesk | Heading font |
| `--font-sans` | Inter | Inter | Body font |

### Theme Toggle
- `.dark` class on `<html>` element (default)
- Removed/added to switch to light theme
- Persisted in `localStorage("theme")`
- Toggle button in sidebar footer and landing page nav

### Animations
13 custom keyframes defined in `styles.css`:
- **UI**: `fade-up`, `pulse-glow`, `float`, `shimmer`, `scale-in`
- **Industrial atmosphere**: `lava-flow`, `lava-drift`, `heat-shimmer`, `ember-rise`, `sparkle`, `pulse-ring`, `metallic-sheen`
- **Process stages**: per-stage animations used previously (simplified)

### Glass-morphism
```css
.glass {
  background: var(--color-card)/0.6;
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
}
```

---

## 11. Build & Deployment

### Development
```bash
npm run dev       # Starts Vite dev server on http://localhost:8080
npm run lint      # ESLint check
npm run format    # Prettier format
```

### Production Build
```bash
npm run build     # Builds client + SSR bundles
                  # Output: dist/client/ + dist/server/
npm run preview   # Preview production build locally
```

### Deployment (from docs/DEPLOYMENT.md)
- **Node.js server** (Render, Railway, etc.):
  - Set `NITRO_PRESET=node-server`
  - Start: `node dist/server/index.mjs`
- **Serverless** (Vercel, Netlify):
  - Default Nitro preset (auto-detected)
  - Deploy the `dist/` directory
- **Environment**: All env vars from `.env` must be set in the deployment platform

---

## 12. Security Considerations

### Database Level
| Measure | Implementation |
|---|---|
| Row-Level Security (RLS) | Enabled on all 4 tables |
| Admin checks via SECURITY DEFINER | `is_admin()` function runs with definer privileges |
| Service role key never in client | `.server.ts` suffix prevents client bundling |
| Role separation | Roles in separate table to prevent privilege escalation |

### API Level
| Measure | Implementation |
|---|---|
| Bearer token validation | `/api/admin/create-user` validates Supabase token + checks `is_admin` via RPC |
| Secret-protected endpoint | `/api/public/seed` requires `SEED_SECRET` |
| Input validation | Zod schemas on all API routes |
| CORS | Served from same origin (no separate API server) |

### Client Level
| Measure | Implementation |
|---|---|
| Auth guard on routes | `beforeLoad` in authenticated layout checks `getUser()` |
| Role-based UI hiding | Users page conditionally renders based on `isAdmin` |
| Session auto-refresh | Supabase client handles token refresh |

### Infrastructure Security
| Measure | Implementation |
|---|---|
| Security headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy |
| Private env vars | `SUPABASE_SERVICE_ROLE_KEY` never exposed to client |
| HTTPS | Handled by deployment platform |

---

## 13. Environment Configuration

### Required Variables

| Variable | Client-Safe | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes (`VITE_` prefix) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Yes | Project reference ID |
| `SUPABASE_URL` | No | Same as above, for server-side |
| `SUPABASE_PUBLISHABLE_KEY` | No | Same anon key for server |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** | Service role key (bypasses RLS) |
| `SEED_SECRET` | **SECRET** | Protects `/api/public/seed` |
| `SITE_URL` | Yes | Public site URL |

### Current Development Values
```
Supabase Project:  zpnkgbhbxeaupfvwcsej
Supabase URL:      https://zpnkgbhbxeaupfvwcsej.supabase.co
Site URL:          http://localhost:8080
Demo Accounts:     EMP1001/admin123 (sys_admin)
                   EMP2001/ppm123 (ppm_admin)
                   EMP1002/user123 (dept_user)
```

---

## 14. Development Workflow

### Project Conventions
- **File naming**: kebab-case for plain files, camelCase for components
- **Path aliases**: `@/` maps to `src/`
- **Imports**: Named exports preferred; default exports for route components
- **Styling**: Tailwind utility classes; no CSS modules or styled-components
- **No comments in code** — documentation lives in `docs/`

### Key Patterns

**Adding a new page**:
1. Create file in `src/routes/` following the file-system routing convention
2. Register with `createFileRoute()`
3. If authenticated, place under `_authenticated/`
4. If it needs a data loader, use `useQuery` with TanStack Query

**Adding an API endpoint**:
1. Create file in `src/routes/api/`
2. Use `createFileRoute()` with `server.handlers` containing `GET`/`POST`
3. Return `Response.json()`
4. For admin-protected endpoints, validate Bearer token and check `is_admin` RPC

**Database migration**:
1. Use Supabase SQL Editor or local migration files
2. Always use `IF NOT EXISTS` / `CREATE OR REPLACE` for idempotency
3. Add RLS policies for every new table
4. Grant appropriate permissions (`authenticated` / `service_role`)

### Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| `/_server/fn/` 404 (dev) | Vite 8 / TanStack Start compat | Use API routes instead of server functions |
| Auth middleware fails | No `Authorization` header sent | Pass Supabase token explicitly in request |
| Registration fails | `auth.admin.createUser()` needs service role | Verify `SUPABASE_SERVICE_ROLE_KEY` is set |
| Login fails | User not created in `auth.users` | Call seed API or use Supabase dashboard |
| RLS blocks query | Policy not matching user context | Check `is_admin()` function grants |

### Demo Accounts (for development)

| Emp No | Password | Role | Description |
|---|---|---|---|
| EMP1001 | admin123 | sys_admin | Full system access |
| EMP2001 | ppm123 | ppm_admin | PPM admin access |
| EMP1002 | user123 | dept_user | Standard user |
| EMP3001 | elec123 | dept_admin | Department admin |
| EMP4001 | ppm456 | ppm_user | PPM standard user |

---

*Document version 1.0 · Generated 2026-06-15*
