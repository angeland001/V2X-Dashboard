# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Custom Skills

This project has two custom skills defined in `.agents/skills/`:

### shadcn (auto-triggered)

Manages shadcn/ui components and projects. **Not user-invocable** — triggers automatically when:
- Working with shadcn components or `components.json`
- Adding/updating/fixing component code
- Applying presets or adjusting styling

**Key commands:**
```bash
npx shadcn@latest info                    # Project context
npx shadcn@latest add <component>         # Add components
npx shadcn@latest search -q "<query>"     # Find components
npx shadcn@latest docs <component>        # Component docs
npx shadcn@latest preset resolve          # Current preset
npx shadcn@latest apply <preset-code>     # Apply preset
```

**Critical rules:** Use semantic colors (`bg-primary`, not raw hex), compose components (don't reinvent), use `cn()` for conditional classes, and use `gap-*` for spacing (not `space-x-*`/`space-y-*`). See `.agents/skills/shadcn/SKILL.md` for full rules.

### ui-ux-pro-max (invoke when needed)

UI/UX design intelligence: 50+ styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types.

**Use when:**
- Designing new pages or components
- Choosing colors, typography, layouts, or styles
- Reviewing UI for accessibility/usability
- Optimizing interface quality

**Typical workflow:**
```bash
# 1. Get complete design system (start here)
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <keywords>" --design-system -p "Project Name"

# 2. Deep-dive into specific domain (optional)
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <ux|style|color|typography|chart> -n 5

# 3. Get stack-specific guidelines
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react
```

See `.agents/skills/ui-ux-pro-max/SKILL.md` for detailed domains, rule priorities, and pre-delivery checklists.

---

## Development Commands

This is a monorepo. Run installs and starts from the root.

```bash
# Install all dependencies
npm run install:all

# Run both frontend and backend concurrently (recommended)
npm run dev

# Run individually
npm run server     # Express backend on :3001
npm run client     # React frontend on :3000

# Frontend only (from client/)
cd client && npm start
cd client && npm run build
cd client && npm test           # runs all tests (no test files exist yet)
cd client && npm test -- --testPathPattern=MyComponent   # run a single test file

# Backend only (from server/)
cd server && npm run dev        # nodemon (auto-restart)
cd server && npm start          # plain node

# Stream bridge (Python, separate process)
cd stream-bridge && pip install -r requirements.txt
CUIP_API_KEY=<key> python main.py
```

**Note:** The client uses `react-app-rewired` (not raw `react-scripts`) to add Node.js polyfills and the `@` → `src/` path alias. Never replace `react-app-rewired` with `react-scripts`.

---

## Architecture

### Monorepo Layout

```
/
├── client/          React SPA (port 3000)
├── server/          Express API (port 3001)
├── stream-bridge/   Python asyncio CUIP bridge
└── package.json     Root: concurrently scripts only
```

### Frontend (`client/src/`)

React 18 + React Router v6. All pages live under `/dashboard` (nested `<Outlet>`) except the map editor (`/geofencing/*`) and event maps (`/sdsm-events`, `/vss-events`).

**Layout shell:** `DashboardLayout` (`components/navigation/SidebarNav.js`) wraps all routes. Dashboard pages render inside `components/dashboard/dashboard.jsx` via `<Outlet>`.

**State:** No global state manager. Per-page local state + custom hooks. `SettingsContext` (`contexts/SettingsContext.jsx`) is the only React context and handles user preferences.

**Path alias:** `@` resolves to `client/src/` (configured in `config-overrides.js`).

**Data fetching pattern:**
1. `services/` — raw `fetch()` calls, read JWT from `localStorage.getItem('authToken')`
2. `hooks/` — wrap service calls with `useState`/`useEffect`; some use SWR
3. Components consume hooks; never call `fetch()` directly in components

**Two map systems (both present, different purposes):**
- **Mapbox GL** (`mapbox-gl`) — geofencing/map editor, SPaT map view, SDSM events
- **Google Maps** (`@vis.gl/react-google-maps`) — VSS events map; migration from Mapbox is in progress on branch `andres/GoogleMapsMigration`. Do not add new Mapbox code to files already migrated to Google Maps.

**SPaT data fields consumed from `spatData`:**
- `phaseStatusGroupGreens/Yellows/Reds` — arrays of phase numbers (1–8)
- `phaseStatusGroupWalks/PedClears/DontWalks` — pedestrian phases
- `overlapStatusGroupGreens/Yellows/Reds` — protected-turn overlaps
- `spatVehMinTimeToChange1`…`spatVehMinTimeToChange8` — countdown in tenths of seconds
- `intersection` — CUIP slug string (e.g. `MLK_Georgia`), used for ring-buffer lookup

`getPhaseInfo(n, spatData)` and `getOverallSignalState(spatData)` in `lib/spatUtils.js` are the canonical helpers for reading these fields.

### Backend (`server/`)

Express 4 on port 3001. No auth middleware on most routes — JWT is only enforced on `POST /api/auth/signup`, `POST /api/auth/login`, and `GET /api/auth/verify`. All other routes are currently unprotected at the Express level.

**Auth:** Stateless JWT signed with `JWT_SECRET` env var (24h expiry). Token payload: `{ userId, username, firstName, lastName }`. Frontend stores token as `authToken` in `localStorage`.

**Database module:** `server/database/postgis.js` exports `{ pool, query }` — use `query(text, params)` in all route handlers.

**Live data ingest:** `POST /api/stream-ingest` accepts `{ stream, data }` and stores up to 100 events per stream in an in-memory ring buffer. `GET /api/stream-ingest/:streamId/latest?intersection=<slug>` returns the most recent event. This buffer is lost on server restart.

**Background pollers** started in `index.js` on boot:
- `sdsmPoller` — polls CV2X REST API every 30s, writes to `sdsm_events` table
- `vssPoller` — polls VSS API, writes to `vss_events` table

**Profile pictures:** Stored in Supabase Storage (`avatars` bucket) via `@supabase/supabase-js`. All other data is in PostgreSQL.

### Database (PostgreSQL + PostGIS, `kepler_db`)

**Canonical intersection identity:** `intersections.intersection_id` is the J2735 SAE integer (user-supplied, unique, immutable). All child tables (`lanes`, `crosswalks`, `spat_zones`, `preemption_zones`, `controller_adapters`) reference this column — not the internal serial `id`.

**`cuip_slug`** on the `intersections` table (added in migration 010) links DB rows to live CUIP stream events (e.g. `MLK_Georgia`). The 12 active slugs are hardcoded in `SpatStreamsPage.jsx`.

**Migrations** are numbered SQL files in `server/database/`. Apply manually:
```bash
psql -U kepler_user -d kepler_db -h 10.199.1.221 -f server/database/<migration>.sql
```
The `update_updated_at_column()` trigger function is defined in `init.sql` and reused across tables.

**Key tables:**
| Table | Purpose |
|-------|---------|
| `intersections` | Master intersection registry with PostGIS point geometry |
| `lanes` / `crosswalks` | Spatial lane/crosswalk geometry per intersection |
| `spat_zones` | Signal-phase zones with entry/exit geometry |
| `preemption_zones` / `preemption_zone_configs` | Emergency vehicle preemption config |
| `controller_adapters` | NTCIP/SNMP controller connection details (IP, community, adapter type) |
| `sdsm_events` | Detected object events with PostGIS point locations |

### Stream Bridge (`stream-bridge/`)

Python asyncio service. Subscribes to CUIP WebSocket streams using the vendored `cuip` SDK, then POSTs each event to `NODE_INGEST_URL` (default: `http://localhost:3001/api/stream-ingest`). Currently only `spat-events` is enabled; other streams are commented out in `config.py`. Requires `CUIP_API_KEY` env var.

### Required Environment Variables

**`server/.env`:**
```
POSTGIS_HOST=<db host>
POSTGIS_PORT=5432
POSTGIS_DATABASE=kepler_db
POSTGIS_USER=<user>
POSTGIS_PASSWORD=<password>
JWT_SECRET=<secret>
SUPABASE_URL=<url>
SUPABASE_SERVICE_ROLE_KEY=<key>
```

**`stream-bridge/` (env vars, not file):**
```
CUIP_API_KEY=<key>
NODE_INGEST_URL=http://localhost:3001/api/stream-ingest  # optional override
```
