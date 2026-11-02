# NestFlow — Visual NestJS Builder (PWA)

Touch-friendly, ComfyUI-style visual IDE for NestJS. Build a backend as a node graph, generate a **real** NestJS + Prisma project, preview the code, export it as ZIP, and test the running API with the built-in API client.

**Live (GitHub Pages):** https://kianodd.github.io/nestflow/

## What works

- Dark ComfyUI-inspired layout: top toolbar, node library (left / bottom-sheet on mobile), canvas, inspector (right / sheet on mobile), bottom drawer for Code / API Client / Logs. Mobile bottom navigation; no hover-only actions; 40–52px touch targets; large connection handles + **tap-to-connect** mode.
- Canvas (@xyflow/react): pan, pinch-zoom, drag, multi-select, delete, snap-to-grid, minimap, fit-view, undo/redo (Ctrl+Z / Shift+Z), auto-layout, autosave.
- **80+ typed nodes** in 9 categories (Application, HTTP & Routing, DI, DTO & Validation, Prisma, Auth, Architecture, Integrations, Testing), each with config fields, validation rules, code-generation meaning and an educational inspector (what / why / example / common mistake — based on real NestJS APIs).
- **Typed connection validation** — e.g. DTO → Bootstrap and Controller → Prisma Model (skipping the Service layer) are rejected with an explanation.
- **Code generation engine** (`src/generator/` — parser → semantic model → file generator, independently tested, deterministic): modules, controllers with real route decorators, services (Prisma CRUD when a model is linked, in-memory fallback otherwise), DTOs with class-validator decorators, `UpdateDto extends PartialType(...)`, Prisma schema + global PrismaModule/Service, `main.ts` (CORS, ValidationPipe, global prefix), `package.json`, tsconfig, nest-cli, `.env.example`, e2e test scaffold and README.
- **Code preview**: file tree, copy, per-file download, full-project **ZIP export** (JSZip).
- **API client**: real `fetch()` execution (timeout/abort, status/time/size/headers, pretty JSON, clear/copy), GET–OPTIONS, headers + JSON body, Bearer via `Authorization: Bearer {{token}}`, collections (create/save/rename/duplicate/delete, export/import JSON), environments with `{{var}}` substitution in URL/headers/body.
- **Projects**: create / open / duplicate / delete / export / import, autosaved to **IndexedDB** (Dexie) with localStorage fallback.
- **PWA**: manifest, service worker (vite-plugin-pwa), offline app shell, installable on Android + desktop, theme color, icons.

The starter graph is a complete **Users API** (Module → Controller + Service → Prisma → User model, Create/Update DTOs, POST/GET/GET :id/PATCH/DELETE routes) that generates:

```
POST /users · GET /users · GET /users/:id · PATCH /users/:id · DELETE /users/:id
```

## Setup / commands

```bash
npm install
npm run dev       # local dev
npm test          # vitest: node library, connection validation, graph parsing, code generation, determinism, env substitution
npm run build     # tsc + production build into dist/
npm run preview
```

## Generate & run a NestJS project

1. Build your graph (or use the starter), open the **Code** tab, check the files.
2. **Export ZIP**, unzip it.
3. `cp .env.example .env` → set `DATABASE_URL` (Postgres) if you use Prisma.
4. `npm install` → `npx prisma generate` (+ `npx prisma migrate dev --name init` with a DB) → `npm run start:dev`.
5. Back in NestFlow → **API** tab → environment `baseUrl = http://localhost:3000` → Send.

## PWA installation

Open the live URL in Android Chrome → ⋮ → *Install app / Add to Home screen*. On desktop Chrome/Edge use the install icon in the address bar. The app works offline after the first load (app shell cached; your projects live in IndexedDB on the device).

## Deployment (GitHub Actions → GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`: `npm ci` → `npm test` → `npm run build` → deploy `dist/` to GitHub Pages. One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

## Architecture

```
src/
  types.ts                  shared types + helpers
  nodes/definitions.ts      node library (defs, docs, fields) + connection validation
  store/useStore.ts         Zustand store: graph, history (undo/redo), projects, autosave
  db.ts                     Dexie/IndexedDB persistence
  generator/generate.ts     graph parser → semantic model → NestJS file generator (+ tests)
  utils/apiExecutor.ts      real fetch execution + {{var}} substitution
  components/               NestNode, Library, Inspector, CodePreview, ApiClient
  App.tsx                   layout, canvas, tap-to-connect, projects, mobile shell
```

## Known limitations (stated honestly)

- A static PWA **cannot run a NestJS/Node server in the browser** and cannot write to your filesystem — there is no fake "Run" button. The companion-service design (local bridge that receives a project, installs deps, runs `nest start --watch` and streams logs over WebSocket) is the documented next step; until then the flow is ZIP → run locally → test with the API client.
- Browser CORS/mixed-content rules apply to the API client: the target API must send CORS headers (generated projects do — `app.enableCors()`), and an HTTPS-hosted NestFlow may be blocked by the browser from calling `http://localhost`. Running NestFlow locally (or tunnelling your API to HTTPS) avoids that.
- Monaco is intentionally not bundled (size on mobile connections); the preview is a fast read-only highlighted-source view with copy/download. Manual editing of generated code is not merged back into the graph — edit after export.
- Postman/Insomnia import: NestFlow collection JSON is supported; arbitrary Postman/Insomnia shapes are detected and reported, not silently mangled.
- TypeORM, GraphQL codegen depth, WebSocket gateways and BullMQ generate registrations/stubs at node level today; Prisma is the fully generated data path.

## Not yet implemented

Local companion service (one-click run + log streaming), Monaco editor, TypeORM generator, per-node resizing, collaborative editing.
