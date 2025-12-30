# Nexus2 - Architecture Documentation

**Enterprise Agile Project Management System**

## Executive Summary

Nexus2 is a modern, type-safe SaaS platform for agile project management, built with a monorepo architecture optimized for developer productivity and runtime performance.

### Key Capabilities
- Multi-tenant organization management
- Flexible agile workflows (Scrum/Kanban)
- Advanced work item tracking with hierarchical relationships
- Real-time collaboration and notifications
- AI-powered features (semantic search, sentiment analysis)
- Comprehensive time tracking and resource management

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   React 19 + TanStack Router/Start (Port 3001)      │  │
│  │   - File-based routing                               │  │
│  │   - TailwindCSS 4 + shadcn/ui                       │  │
│  │   - React Query for state management                │  │
│  └────────────┬─────────────────────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────┘
                │ tRPC Client (type-safe HTTP calls)
                │
┌───────────────▼─────────────────────────────────────────────┐
│                       SERVER TIER                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Elysia Web Server (Port 3000)                      │  │
│  │   ├─ /trpc/*     → tRPC Handler                     │  │
│  │   ├─ /api/auth/* → Better-Auth                      │  │
│  │   └─ /ai         → Google Gemini Streaming          │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                              │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │   tRPC Routers (API Layer)                          │  │
│  │   - organization, project, workItem, sprint, etc.   │  │
│  │   - Input validation (Zod schemas)                  │  │
│  │   - Session-based authorization                     │  │
│  └────────────┬─────────────────────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────┘
                │ Prisma Client ORM
                │
┌───────────────▼─────────────────────────────────────────────┐
│                      DATABASE TIER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   PostgreSQL 16 + pgvector Extension                │  │
│  │   - 30+ tables (Organizations → WorkItems)          │  │
│  │   - Vector embeddings for AI features               │  │
│  │   - ACID transactions, foreign keys, indexes        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Bun 1.2.20 | Fast JavaScript runtime (3x faster than Node.js) |
| **Package Manager** | Bun | Workspace management, dependency resolution |
| **Monorepo Tool** | Turborepo 2.5 | Build orchestration, caching, parallel execution |
| **Backend Framework** | Elysia 1.3 | High-performance web framework (Bun-native) |
| **API Layer** | tRPC 11.5 | End-to-end type safety, no code generation |
| **Frontend Framework** | React 19.1 | UI rendering, component model |
| **Routing** | TanStack Router 1.132 | File-based, type-safe routing with SSR |
| **State Management** | TanStack Query 5.85 | Server state, caching, optimistic updates |
| **Database** | PostgreSQL 16 | Relational data, ACID transactions |
| **ORM** | Prisma 6.19 | Type-safe database queries, migrations |
| **Vector DB** | pgvector | Semantic search, embeddings storage |
| **Auth** | Better-Auth 1.4 | Session management, email/password |
| **UI Framework** | TailwindCSS 4.1 | Utility-first CSS |
| **UI Components** | shadcn/ui + Radix UI | Accessible, customizable primitives |
| **AI SDK** | Vercel AI SDK 5.0 | Streaming, model abstraction |
| **LLM** | Google Gemini 1.5 Flash | Code assistance, text generation |
| **Form Management** | TanStack Form 1.23 | Type-safe form handling |
| **DnD** | @dnd-kit 6.3 | Drag-and-drop for Kanban boards |

---

## Domain Model

### Core Entities

```
Organization (Tenant)
  │
  ├─> Portfolio (Strategic Grouping)
  │     └─> Project (Workspace)
  │           ├─> Sprint (Time-boxed iteration)
  │           ├─> Board (Kanban/Scrum visualization)
  │           ├─> Milestone (Deadline)
  │           ├─> WorkItemState (Custom workflow)
  │           └─> WorkItem (Atomic work unit)
  │                 ├─> WorkItemDetail (Extended fields)
  │                 ├─> Comment (Discussion)
  │                 ├─> Attachment (Files)
  │                 ├─> TimeLog (Effort tracking)
  │                 ├─> Tag (Labels)
  │                 └─> Dependency (Relationships)
  │
  └─> Team (Resource Pool)
        └─> TeamMembership
              └─> User
                    ├─> UserSkillProfile
                    └─> Notification
```

### Work Item Hierarchy

```
┌─────────────────────────────────────────────────┐
│ WorkItemType Enum:                              │
│  - EPIC       (Large strategic initiative)      │
│  - FEATURE    (Deliverable capability)          │
│  - STORY      (User-facing functionality)       │
│  - BUG        (Defect)                          │
│  - TASK       (Technical work)                  │
│  - SUB_TASK   (Atomic work unit)                │
└─────────────────────────────────────────────────┘

Relationships:
  Epic
    └─> Feature (via parentId or epicId)
          └─> Story (via parentId)
                ├─> Task (via parentId)
                │     └─> SubTask (via parentId)
                └─> Bug (via parentId)
```

**Design Note**: Uses **Single Table Inheritance** pattern - all work item types share the same `WorkItem` table with a `type` discriminator.

### Workflow States

Unlike traditional systems with hardcoded statuses (To Do, In Progress, Done), Nexus2 uses **custom workflow states per project**:

```sql
WorkItemState
  - name: "Ready for Dev" | "Code Review" | "QA Testing" | ...
  - category: TODO | IN_PROGRESS | DONE | ARCHIVED
  - position: 0, 1, 2, ... (display order)
  - wipLimit: 5 (Work-in-Progress constraint)
  - color: "#3B82F6"
  - isInitial: true (default state for new items)
  - isFinal: true (marks completion)
```

This allows teams to customize their workflow while maintaining consistent categories for reporting.

---

## Data Flow Patterns

### Query Flow (Read Operations)

```typescript
// 1. Component initiates query
const trpc = useTRPC();
const { data, isLoading } = useQuery(
  trpc.workItem.getById.queryOptions({ id: "123" })
);

// 2. tRPC client serializes request
fetch("http://localhost:3000/trpc/workItem.getById?input={id:'123'}")

// 3. Elysia server routes to tRPC handler
app.all("/trpc/*", async (context) => {
  return fetchRequestHandler({
    router: appRouter,
    req: context.request,
    createContext: () => createContext({ context }),
  });
});

// 4. tRPC context creation (auth + DB)
const session = await auth.api.getSession({ headers });
return { session, prisma };

// 5. Router procedure execution
workItemRouter.getById
  .input(z.object({ id: z.string() }))
  .query(({ ctx, input }) => {
    return ctx.prisma.workItem.findUnique({
      where: { id: input.id },
      include: { assignee: true, state: true },
    });
  });

// 6. Prisma generates SQL
SELECT * FROM "WorkItem" WHERE id = '123';
SELECT * FROM "User" WHERE id = (assigneeId);
SELECT * FROM "WorkItemState" WHERE id = (stateId);

// 7. Response flows back through layers
PostgreSQL → Prisma → tRPC → Elysia → HTTP → React Query → Component
```

### Mutation Flow (Write Operations)

```typescript
// 1. Component triggers mutation
const client = useTRPCClient();
const mutation = useMutation({
  mutationFn: (data) => client.workItem.create.mutate(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workItem"] }),
});

// 2. tRPC POST request
fetch("http://localhost:3000/trpc/workItem.create", {
  method: "POST",
  body: JSON.stringify({ title: "New task", ... }),
});

// 3. Router validates and executes
workItemRouter.create
  .input(z.object({ ... }))  // Zod validation
  .mutation(({ ctx, input }) => {
    return ctx.prisma.workItem.create({
      data: { ...input, creatorId: ctx.session.user.id },
    });
  });

// 4. Database write
INSERT INTO "WorkItem" (id, title, creatorId, ...) VALUES (...);

// 5. React Query invalidates cache
queryClient.invalidateQueries() → triggers refetch → UI updates
```

---

## Security Model

### Authentication

**Session-Based Authentication via Better-Auth:**
- Email/password credentials
- Session tokens stored in HTTP-only cookies
- `sameSite: "none"` + `secure: true` for cross-origin (dev: localhost:3001 → localhost:3000)
- 30-day session expiry (configurable)

**Flow:**
1. User submits credentials to `/api/auth/sign-in`
2. Better-Auth validates against `User` table (bcrypt password hash)
3. Session created in `Session` table, cookie set in response
4. Subsequent requests include session cookie
5. tRPC context extracts session via `auth.api.getSession()`

### Authorization

**Procedure-Level Protection:**
```typescript
// Public (no auth required)
publicProcedure.query(() => { ... });

// Protected (requires session)
protectedProcedure.query(({ ctx }) => {
  // ctx.session is guaranteed to exist
  const userId = ctx.session.user.id;
  ...
});
```

**Row-Level Security (Application-Level):**
- Filter queries by `organizationId`, `projectId`, `userId`
- Example: User can only see work items in their organizations

```typescript
workItemRouter.getAll.query(({ ctx, input }) => {
  // Get user's orgs
  const orgs = await ctx.prisma.organizationMembership.findMany({
    where: { userId: ctx.session.user.id },
  });
  
  // Filter by accessible projects
  return ctx.prisma.workItem.findMany({
    where: {
      project: { organizationId: { in: orgs.map(o => o.organizationId) } }
    },
  });
});
```

**Future Enhancements:**
- Role-Based Access Control (RBAC) via `Role` table
- Permission checks using `Role.permissions` JSON field
- Team-scoped access via `TeamMembership`

---

## Performance Optimizations

### Database

1. **Indexes**: All foreign keys indexed, composite indexes on filtered queries
2. **Connection Pooling**: Prisma connection pool (default 10 connections)
3. **Denormalization**: `WorkItem.epicId` (shortcut to avoid recursive queries)
4. **Partial Indexes**: `WHERE deletedAt IS NULL` for soft-deleted records

### Frontend

1. **Code Splitting**: Route-based lazy loading via TanStack Router
2. **Query Deduplication**: React Query merges simultaneous identical requests
3. **Optimistic Updates**: UI updates before server confirms
4. **Infinite Scroll**: Cursor-based pagination for large lists

### Backend

1. **Bun Runtime**: 3x faster startup, lower memory than Node.js
2. **tRPC Batching**: Multiple queries in single HTTP request
3. **Prisma Caching**: Query result caching (middleware)

---

## AI Features

### Vector Embeddings (pgvector)

**Purpose**: Semantic search, duplicate detection, related work item suggestions

**Implementation**:
```sql
-- WorkItemEmbedding table
CREATE TABLE "WorkItemEmbedding" (
  "workItemId" TEXT PRIMARY KEY,
  "embedding" vector(1536),  -- OpenAI/Google embedding dimension
  "version" INT DEFAULT 1,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);

-- Similarity search
SELECT wi.*, 1 - (wie.embedding <=> $1::vector) AS similarity
FROM "WorkItem" wi
JOIN "WorkItemEmbedding" wie ON wi.id = wie.workItemId
ORDER BY wie.embedding <=> $1::vector
LIMIT 10;
```

**Workflow**:
1. Work item created/updated
2. Background job generates embedding from `title + description`
3. Store in `WorkItemEmbedding` table
4. Query similar items using cosine similarity

### Sentiment Analysis

**Purpose**: Team health monitoring, retrospective insights

**Fields**:
- `Comment.sentimentScore`: -1 (negative) to 1 (positive)
- `Comment.sentimentLabel`: "positive" | "neutral" | "negative"
- `Retrospective.sentimentSummary`: Aggregated team mood

**Usage**:
- Detect team morale trends
- Flag negative patterns in sprint retrospectives
- Alert managers to concerning sentiment drops

### Google Gemini Integration

**Endpoint**: `POST /ai`

**Capabilities**:
- Code review suggestions
- Work item description generation
- Acceptance criteria templates
- Meeting notes summarization

**Implementation**:
```typescript
const result = streamText({
  model: google("gemini-1.5-flash"),
  messages: convertToModelMessages(uiMessages),
});
return result.toTextStreamResponse();  // Streaming response
```

---

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd nexus2

# 2. Install dependencies
bun install

# 3. Start PostgreSQL (Docker recommended)
docker-compose up -d postgres

# 4. Configure environment
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
# Edit .env files with database URL, API keys

# 5. Initialize database
bun run db:push

# 6. Start dev servers
bun run dev
# Server: http://localhost:3000
# Web: http://localhost:3001
```

### Adding a New Feature

**Example: Add "Priority Labels" to Work Items**

```bash
# 1. Update database schema
vim packages/db/prisma/schema.prisma
# Add: model PriorityLabel { ... }
# Add: WorkItem { priorityLabelId String? ... }

# 2. Sync database
cd packages/db
bunx prisma db push
bunx prisma generate

# 3. Create tRPC router
vim packages/api/src/routers/priorityLabel.ts
# export const priorityLabelRouter = router({ ... });

# 4. Register router
vim packages/api/src/routers/index.ts
# import { priorityLabelRouter } from "./priorityLabel";
# export const appRouter = router({ ..., priorityLabel: priorityLabelRouter });

# 5. Create UI component
vim apps/web/src/components/priority-label-selector.tsx

# 6. Use in work item form
vim apps/web/src/components/create-task-modal.tsx

# 7. Test
bun run dev
# Open http://localhost:3001, create task, select priority label
```

---

## Deployment

### Production Build

```bash
# Build all apps
bun run build

# Output:
# apps/server/dist/index.js
# apps/web/dist/**
```

### Environment Variables (Production)

**Server:**
```
DATABASE_URL=postgresql://user:pass@prod-db:5432/nexus2?connection_limit=20
BETTER_AUTH_SECRET=<64-char-random-string>
BETTER_AUTH_URL=https://api.yourapp.com
CORS_ORIGIN=https://app.yourapp.com
GOOGLE_GENERATIVE_AI_API_KEY=<key>
NODE_ENV=production
```

**Web:**
```
VITE_SERVER_URL=https://api.yourapp.com
```

### Hosting Options

**Backend (Bun + Elysia):**
- **Railway** (recommended, native Bun support)
- **Fly.io** (Dockerfile with Bun image)
- **Render** (Bun support in beta)

**Frontend (React SPA):**
- **Vercel** (recommended, zero-config)
- **Netlify** (works with TanStack Start)
- **Cloudflare Pages**

**Database:**
- **Supabase** (managed PostgreSQL + pgvector)
- **Neon** (serverless PostgreSQL)
- **Railway PostgreSQL** (simple, integrated)

### Migration Strategy

```bash
# 1. Generate migration files
cd packages/db
bunx prisma migrate dev --name add_priority_labels

# 2. Commit migrations to Git
git add prisma/migrations/
git commit -m "feat: add priority labels"

# 3. Deploy to production
# (CI/CD pipeline runs:)
bunx prisma migrate deploy  # Apply pending migrations
bun run build
```

---

## Monitoring & Observability

### Recommended Tools

- **Error Tracking**: Sentry (backend + frontend)
- **APM**: New Relic, Datadog (tRPC tracing)
- **Database Monitoring**: Prisma Pulse, pganalyze
- **Logging**: Better Stack (structured logs)
- **Uptime**: UptimeRobot, Better Uptime

### Key Metrics

- **Backend**:
  - tRPC procedure latency (p50, p95, p99)
  - Database query duration
  - Session cache hit rate
  - Error rate by procedure

- **Frontend**:
  - Core Web Vitals (LCP, FID, CLS)
  - Time to Interactive (TTI)
  - React Query cache efficiency
  - Largest route bundle size

---

## Testing Strategy

### Current State
- No automated tests currently implemented
- Manual testing via Prisma Studio, browser DevTools

### Recommended Approach

**Unit Tests (Vitest):**
- Utility functions (`lib/utils.ts`)
- Zod schemas validation
- Prisma query builders

**Integration Tests (Vitest + MSW):**
- tRPC routers (mock Prisma)
- React components with tRPC

**E2E Tests (Playwright):**
- Critical user flows (sign up, create project, move work items)
- Board drag-and-drop

---

## Known Limitations

1. **No Role-Based Access Control**: Authorization is basic (session-based only)
2. **No Real-Time Updates**: Requires manual refresh or polling (consider WebSockets/SSE)
3. **No Audit Trail**: `ActivityLog` table exists but not fully implemented
4. **No Multi-Language Support**: UI is English-only
5. **Limited Reporting**: No built-in dashboards, charts, or analytics
6. **No Mobile App**: Web-only (responsive design, but no native mobile)

---

## Future Roadmap

### Short-Term (Next 3 Months)
- [ ] Implement RBAC with permissions
- [ ] Add real-time notifications (WebSocket/SSE)
- [ ] Build analytics dashboard (burndown charts, velocity)
- [ ] GitHub/GitLab integration (link commits to work items)
- [ ] Email notifications (via Resend/SendGrid)

### Mid-Term (6 Months)
- [ ] Mobile apps (React Native + Expo)
- [ ] Advanced AI features (auto-assignment, time estimation)
- [ ] Custom fields/workflows (low-code builder)
- [ ] API webhooks for integrations
- [ ] Multi-language support (i18n)

### Long-Term (1 Year)
- [ ] On-premise deployment option
- [ ] Advanced portfolio management (roadmaps, OKRs)
- [ ] Resource capacity planning
- [ ] Time tracking reports (billable hours, timesheets)
- [ ] SSO (SAML, OAuth providers)

---

## Contributing

### Code Style
- TypeScript strict mode enabled
- Prettier for formatting (auto-format on save)
- ESLint for linting (extend from `@my-better-t-app/config`)

### Pull Request Process
1. Create feature branch from `main`
2. Make changes, test locally
3. Update AGENTS.md if adding new patterns
4. Submit PR with description
5. Address review feedback
6. Merge after approval

### Database Changes
- Always create migrations for production
- Never commit `generated/` files
- Test migrations on dev database first

---

**Maintained By**: Nexus2 Development Team  
**Last Updated**: 2025-12-30  
**Version**: 1.0.0
