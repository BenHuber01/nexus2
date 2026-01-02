# AGENTS.md - Development Workflow Guide

This document provides best practices and workflows for AI agents working on this project to avoid common pitfalls and ensure smooth development.

## 🎯 Project Overview

**Nexus2** is an enterprise-grade Agile Project Management System built with a modern TypeScript monorepo architecture.

### Core Domain
- **Multi-tenant SaaS**: Organizations → Portfolios → Projects → Work Items
- **Agile Workflows**: Sprint planning, Kanban/Scrum boards, velocity tracking
- **Resource Management**: Time logging, skill profiles, team allocation
- **AI-Enhanced**: Embeddings (pgvector), sentiment analysis, Google Gemini integration
- **Enterprise Features**: Workflow automation, notifications, activity logging

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun (fast JavaScript runtime) |
| **Monorepo** | Turborepo (build orchestration) |
| **Backend** | Elysia (fast web framework) + tRPC (type-safe APIs) |
| **Frontend** | React 19 + TanStack Router/Start |
| **Database** | **PostgreSQL** (NOT MongoDB!) + Prisma ORM + pgvector extension |
| **UI** | TailwindCSS 4 + shadcn/ui (Radix primitives) |
| **Auth** | Better-Auth (email/password) |
| **AI** | Vercel AI SDK + Google Gemini |

⚠️ **IMPORTANT**: Despite what the README says, this project uses **PostgreSQL**, not MongoDB! The `bts.jsonc` config file is outdated.

### Architecture Patterns

**Monorepo Structure:**
```
nexus2/
├── apps/
│   ├── server/          # Elysia backend (port 3000)
│   └── web/             # React frontend (port 3001)
├── packages/
│   ├── api/             # tRPC routers & business logic
│   ├── auth/            # Better-Auth configuration
│   └── db/              # Prisma schema & generated client
```

**Data Flow:**
```
React Component → useTRPC() → tRPC Client → 
HTTP (fetch) → Elysia Server → tRPC Router → 
Prisma Client → PostgreSQL
```

**Key Design Decisions:**
- **Single Table Inheritance** for WorkItems (Epic/Feature/Story/Bug/Task/SubTask)
- **Hierarchical relationships** via self-referencing (parent/children + epic/stories)
- **Custom workflow states** per project (not hardcoded statuses)
- **JSON fields** for extensibility (settings, metadata, customFields)
- **Workspace isolation** using Bun workspaces + Turborepo

## Prisma Database Workflow

### ⚠️ CRITICAL: Database Migration Best Practices

When making changes to the Prisma schema, **ALWAYS** follow this workflow:

#### 1. Schema Changes

Make your changes to `/packages/db/prisma/schema.prisma`

#### 2. Format Schema (Optional but Recommended)

```bash
cd packages/db
bunx prisma format
```

#### 3. Choose Migration Strategy

**For Development (Recommended):**
```bash
cd packages/db
bunx prisma db push
```
- ✅ Fast and simple
- ✅ Syncs schema directly to database
- ✅ No migration files needed for dev
- ⚠️ May lose data if schema changes are destructive

**For Production-Ready Migrations:**
```bash
cd packages/db
bunx prisma migrate dev --name descriptive_migration_name
```
- ✅ Creates migration files
- ✅ Version controlled
- ✅ Can be applied to production
- ⚠️ Slower process

#### 4. Generate Prisma Client

This usually happens automatically, but if needed:
```bash
cd packages/db
bunx prisma generate
```

#### 5. Verify Database State

Check that tables exist:
```bash
cd packages/db
bunx prisma studio
```

### 🚫 AVOID: Common Mistakes

#### ❌ DON'T: Use `prisma migrate reset` in Production
```bash
# NEVER do this in production!
bunx prisma migrate reset --force
```
This **DELETES ALL DATA**. Only use in development when you need a clean slate.

#### ❌ DON'T: Forget to Push/Migrate After Schema Changes
After changing `schema.prisma`, you MUST run either:
- `bunx prisma db push` (dev), OR
- `bunx prisma migrate dev` (production-ready)

Otherwise, the database will be out of sync with your schema.

#### ❌ DON'T: Modify Generated Files
Never edit files in `/packages/db/generated/` - they are auto-generated.

### ✅ Recommended Workflow for Schema Changes

```bash
# 1. Make changes to schema.prisma
# 2. Format schema
cd packages/db
bunx prisma format

# 3. Push to database (development)
bunx prisma db push

# 4. Verify in Prisma Studio (optional)
bunx prisma studio

# 5. Test your changes
cd ../..
bun run dev
```

## tRPC Router Development

### Adding New Procedures

1. **Create/Update Router File**
   - Location: `/packages/api/src/routers/`
   - Use `protectedProcedure` for authenticated routes
   - Use `publicProcedure` for public routes

2. **Export Router**
   - Add to `/packages/api/src/routers/index.ts`

3. **Use in Frontend**
   ```typescript
   const trpc = useTRPC();
   const { data } = useQuery(trpc.yourRouter.yourProcedure.queryOptions(input));
   ```

### Mutations with useTRPCClient

For mutations, use `useTRPCClient()` hook:

```typescript
const client = useTRPCClient();

const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.yourRouter.yourMutation.mutate(data);
    },
});
```

**❌ DON'T** try to use `trpc.client` - it doesn't exist!

### ⚡ CRITICAL: Optimistic Updates for Better UX

**MANDATORY RULE**: All mutations that modify data **MUST** implement optimistic updates to ensure immediate UI feedback.

#### Why Optimistic Updates?

- ✅ **Instant Feedback**: UI updates immediately, not after network roundtrip
- ✅ **Better UX**: Feels responsive and fast
- ✅ **Error Recovery**: Automatic rollback if mutation fails
- ✅ **Prevents Confusion**: Users see their changes right away

#### Pattern: Optimistic Update with React Query

```typescript
const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.yourRouter.yourMutation.mutate(data);
    },
    
    // 1. OPTIMISTIC UPDATE: Apply changes immediately
    onMutate: async (newData) => {
        const queryKey = ["your", "query", "key"];
        
        // Cancel outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey });
        
        // Snapshot the previous value (for rollback)
        const previousData = queryClient.getQueryData(queryKey);
        
        // Optimistically update to the new value
        queryClient.setQueryData(queryKey, (old: any) => {
            // Apply your optimistic update logic here
            return { ...old, ...newData };
        });
        
        console.log("[Component] Optimistic update:", newData);
        return { previousData }; // Return context for rollback
    },
    
    // 2. ERROR HANDLING: Rollback on failure
    onError: (err, _newData, context: any) => {
        const queryKey = ["your", "query", "key"];
        if (context?.previousData) {
            queryClient.setQueryData(queryKey, context.previousData);
        }
        console.error("[Component] Mutation error:", err);
        toast.error("Failed to update");
    },
    
    // 3. SUCCESS: Invalidate queries to refetch fresh data
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["your", "query", "key"] });
        toast.success("Updated successfully");
    },
});
```

#### Real-World Examples

**Example 1: Update Lane (board-settings-modal.tsx)**
```typescript
const updateLaneMutation = useMutation({
    mutationFn: async (data: any) => {
        return await client.board.updateLane.mutate(data);
    },
    onMutate: async (updatedLane) => {
        const queryKey = ["board", "getById", { id: boardId }];
        await queryClient.cancelQueries({ queryKey });
        const previousBoard = queryClient.getQueryData(queryKey);
        
        queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return {
                ...old,
                lanes: old.lanes.map((lane: any) =>
                    lane.id === updatedLane.id ? { ...lane, ...updatedLane } : lane
                ),
            };
        });
        
        return { previousBoard };
    },
    onError: (err, _updatedLane, context: any) => {
        const queryKey = ["board", "getById", { id: boardId }];
        if (context?.previousBoard) {
            queryClient.setQueryData(queryKey, context.previousBoard);
        }
        toast.error("Failed to update lane");
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["board"] });
        toast.success("Lane updated successfully");
    },
});
```

**Example 2: Move Task (task-board.tsx)**
```typescript
const updateStateMutation = useMutation({
    mutationFn: async ({ id, stateId }: { id: string; stateId: string }) => {
        return await client.workItem.updateState.mutate({ id, stateId });
    },
    onMutate: async (newMove) => {
        const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
        await queryClient.cancelQueries({ queryKey });
        const previousWorkItems = queryClient.getQueryData(queryKey);
        
        queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return old.map((item: any) =>
                item.id === newMove.id ? { ...item, stateId: newMove.stateId } : item
            );
        });
        
        return { previousWorkItems };
    },
    onError: (err, _newMove, context: any) => {
        const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
        if (context?.previousWorkItems) {
            queryClient.setQueryData(queryKey, context.previousWorkItems);
        }
        toast.error("Failed to move task");
    },
    onSettled: () => {
        queryClient.invalidateQueries({ 
            queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey 
        });
    },
});
```

#### Checklist for Every Mutation

- ✅ **onMutate**: Cancel queries, snapshot previous data, apply optimistic update
- ✅ **onError**: Rollback to previous data, show error toast
- ✅ **onSuccess**: Invalidate queries, show success toast
- ✅ **Console Logs**: Add debug logs for troubleshooting
- ✅ **Context**: Return previous data from onMutate for rollback
- ✅ **Query Keys**: ALWAYS use `trpc.xxx.queryOptions().queryKey` for consistency

#### ⚠️ CRITICAL: Use Correct Query Keys

**MANDATORY RULE**: When working with optimistic updates, you MUST use the exact same query key that your queries use!

**Why This Matters:**
- tRPC uses an internal query key format that's different from manual arrays
- If you use wrong keys, cache updates go to different locations
- Views won't see the optimistic updates → appears broken
- Data inconsistency between components

**❌ DON'T: Use Manual Query Keys**
```typescript
// ❌ WRONG: Manual query key doesn't match tRPC's internal format
const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.workItem.create.mutate(data);
    },
    onMutate: async (newData) => {
        // ❌ This key won't match the one used by queries!
        const queryKey = ["workItem", "getAll", { projectId }];
        
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData(queryKey);
        
        // Cache update goes to wrong location
        queryClient.setQueryData(queryKey, (old: any) => {
            return [...old, newData];
        });
        
        return { previousData };
    },
});

// Problem: Views query from different key!
const { data } = useQuery(
    trpc.workItem.getAll.queryOptions({ projectId }) // Different key format!
);
```

**✅ DO: Use tRPC Query Keys**
```typescript
// ✅ CORRECT: Use tRPC's queryOptions to get exact key
const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.workItem.create.mutate(data);
    },
    onMutate: async (newData) => {
        // ✅ This matches the key used by ALL queries!
        const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
        
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData(queryKey);
        
        // Cache update goes to correct location
        queryClient.setQueryData(queryKey, (old: any) => {
            return [...old, newData];
        });
        
        console.log("[Component] Query key:", queryKey); // Debug log
        return { previousData };
    },
    onError: (err, _data, context: any) => {
        // ✅ Same key for rollback
        const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
        if (context?.previousData) {
            queryClient.setQueryData(queryKey, context.previousData);
        }
        toast.error("Failed to create");
    },
});

// Views use the same key - everything syncs!
const { data } = useQuery(
    trpc.workItem.getAll.queryOptions({ projectId })
);
```

**Key Pattern for All Mutations:**
```typescript
// For ANY tRPC query, get the key this way:
const queryKey = trpc.routerName.procedureName.queryOptions(input).queryKey;

// Examples:
trpc.workItem.getAll.queryOptions({ projectId }).queryKey
trpc.project.getById.queryOptions({ id: projectId }).queryKey
trpc.sprint.getAll.queryOptions({ projectId }).queryKey
trpc.board.getById.queryOptions({ id: boardId }).queryKey
```

**Real-World Bug Example:**
```typescript
// ❌ This was the actual bug in TaskFormModal:
onMutate: async (newTaskData) => {
    const queryKey = ["workItem", "getAll", { projectId }]; // ❌ Wrong!
    queryClient.setQueryData(queryKey, (old: any) => [...old, newTask]);
    // Result: New tasks invisible in Board/List/Backlog until refresh
}

// ✅ Fixed version:
onMutate: async (newTaskData) => {
    const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey; // ✅
    queryClient.setQueryData(queryKey, (old: any) => [...old, newTask]);
    // Result: New tasks appear instantly in all views!
}
```

**Symptoms of Wrong Query Key:**
- ✅ Mutation succeeds (no errors)
- ✅ Data saved to database
- ❌ UI doesn't update until manual refresh
- ❌ Optimistic update "doesn't work"
- ❌ Other components don't see changes

**Debugging Tips:**
```typescript
// Add these logs to verify keys match:
console.log("[Mutation] Query key:", 
    trpc.workItem.getAll.queryOptions({ projectId }).queryKey
);

console.log("[Query] Query key:", 
    trpc.workItem.getAll.queryOptions({ projectId }).queryKey
);

// Keys should be IDENTICAL! If different = bug!
```

#### ❌ DON'T: Forget Optimistic Updates

```typescript
// ❌ BAD: No optimistic update - UI only updates after server response
const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.yourRouter.yourMutation.mutate(data);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["data"] });
        toast.success("Updated!");
    },
});
```

#### ✅ DO: Always Implement Optimistic Updates

```typescript
// ✅ GOOD: Optimistic update - UI updates immediately
const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.yourRouter.yourMutation.mutate(data);
    },
    onMutate: async (newData) => {
        // ... optimistic update logic
    },
    onError: (err, _data, context: any) => {
        // ... rollback logic
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["data"] });
        toast.success("Updated!");
    },
});
```

## UI Component Development

### Creating New Components

1. **UI Primitives**: `/apps/web/src/components/ui/`
   - Use Radix UI primitives
   - Follow existing patterns (button.tsx, dialog.tsx, etc.)

2. **Feature Components**: `/apps/web/src/components/`
   - Business logic components
   - Connect to tRPC

3. **Routes**: `/apps/web/src/routes/`
   - Use TanStack Router
   - File-based routing

### Adding Dependencies

```bash
# For web app
cd apps/web
bun add package-name

# For API
cd packages/api
bun add package-name

# For database
cd packages/db
bun add package-name
```

## Error Handling

### Database Connection Errors

**Error**: `The table 'public.tablename' does not exist`

**Solution**:
```bash
cd packages/db
bunx prisma db push
```

### tRPC Errors

**Error**: `Property 'mutate' does not exist on type 'DecorateMutationProcedure'`

**Solution**: Use `useTRPCClient()` instead of trying to call `.mutate()` on tRPC procedures directly.

```typescript
// ❌ Wrong
const trpc = useTRPC();
await trpc.board.create.mutate(data); // This doesn't work!

// ✅ Correct
const client = useTRPCClient();
await client.board.create.mutate(data);
```

### Import Errors

**Error**: Module not found

**Solution**: Check import paths use `@/` alias for app-relative imports:
```typescript
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/utils/trpc";
```

## Testing Workflow

### Manual Testing Checklist

After making changes:

1. ✅ Check server starts without errors
2. ✅ Check browser console for errors
3. ✅ Test the specific feature you changed
4. ✅ Test authentication flow if you touched auth
5. ✅ Check database in Prisma Studio if you changed schema

### Running the Application

```bash
# From project root
bun run dev

# This starts:
# - Server on http://localhost:3000
# - Web app on http://localhost:3001
```

## Git Workflow

### ⚠️ CRITICAL: Commit After Every Change

**MANDATORY RULE**: After **EVERY** change you make to this project, you **MUST** commit immediately!

**Why?**
- ✅ Ensures you can always return to a working state
- ✅ Creates a safety net for experimentation
- ✅ Provides clear history of what changed when
- ✅ Prevents loss of work if something breaks

**Workflow:**
```bash
# 1. Make your change (edit file, add feature, etc.)
vim packages/api/src/routers/workItem.ts

# 2. Test the change
bun run dev  # Verify it works

# 3. Stage the changes
git add .

# 4. Commit immediately with descriptive message
git commit -m "feat: add priority filter to workItem router"

# 5. Now safe to continue to next change
```

**❌ DON'T:**
- Make multiple unrelated changes before committing
- Wait until "everything is perfect" to commit
- Skip commits for "small" changes

**✅ DO:**
- Commit after each logical change (even small ones)
- Write clear commit messages describing what changed
- Test before committing to ensure the code works

### Before Committing

1. ✅ Run linter (if available)
2. ✅ Test locally - **VERIFY THE CODE WORKS**
3. ✅ Check for console errors
4. ✅ Include migration files if you created them
5. ✅ Ensure database schema is in sync (`bun run db:push` if needed)

### Commit Messages

Use conventional commits:
```
feat: add sprint-board relationship
fix: resolve database sync issue
docs: update AGENTS.md with Prisma workflow
refactor: improve board filtering logic
chore: update dependencies
style: format code with prettier
test: add unit tests for workItem router
```

### Commit Frequency Guidelines

**Commit after each of these:**
- ✅ Added/modified a database table in schema.prisma
- ✅ Created/updated a tRPC router
- ✅ Added/modified a React component
- ✅ Fixed a bug
- ✅ Updated configuration (env, tsconfig, etc.)
- ✅ Added/updated documentation
- ✅ Installed/removed dependencies

**Example workflow with multiple commits:**
```bash
# Step 1: Update schema
vim packages/db/prisma/schema.prisma
git add packages/db/prisma/schema.prisma
git commit -m "feat: add PriorityLabel model to schema"

# Step 2: Sync database
bun run db:push
git add packages/db/
git commit -m "chore: generate Prisma client for PriorityLabel"

# Step 3: Create router
vim packages/api/src/routers/priorityLabel.ts
git add packages/api/src/routers/priorityLabel.ts
git commit -m "feat: add priorityLabel tRPC router"

# Step 4: Register router
vim packages/api/src/routers/index.ts
git add packages/api/src/routers/index.ts
git commit -m "feat: register priorityLabel router in appRouter"

# Step 5: Create UI component
vim apps/web/src/components/priority-label-selector.tsx
git add apps/web/src/components/priority-label-selector.tsx
git commit -m "feat: add PriorityLabelSelector component"

# Result: 5 commits, each represents a working state!
```

### Recovering from Mistakes

Because you committed frequently, you can easily recover:

```bash
# See recent commits
git log --oneline -10

# Something broke? Go back to last working commit
git reset --hard HEAD~1  # Go back 1 commit
git reset --hard abc123   # Go back to specific commit

# Or create a new branch to experiment
git checkout -b experiment/new-feature
# Make risky changes...
# If it works: merge back
# If it fails: delete branch, no harm done
```

## Common Patterns

### Fetching Data with tRPC

```typescript
const trpc = useTRPC();
const { data, isLoading, error } = useQuery<any>(
    trpc.router.procedure.queryOptions(input) as any
);
```

### Mutations with React Query

```typescript
const client = useTRPCClient();
const queryClient = useQueryClient();

const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.router.procedure.mutate(data);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["router"] });
        toast.success("Success!");
    },
    onError: () => {
        toast.error("Failed!");
    },
});
```

### Form State Management

```typescript
const [value, setValue] = useState("");

// In JSX
<Input
    value={value}
    onChange={(e) => setValue(e.target.value)}
/>
```

## Project Structure

```
nexus2/
├── apps/
│   ├── server/          # Elysia backend (port 3000)
│   │   ├── src/
│   │   │   └── index.ts # Entry point: CORS, tRPC handler, Better-Auth, AI endpoint
│   │   ├── .env         # Server environment variables
│   │   └── tsdown.config.ts
│   └── web/             # React frontend (port 3001)
│       ├── src/
│       │   ├── components/    # UI components
│       │   │   ├── ui/        # shadcn/ui primitives
│       │   │   └── *.tsx      # Feature components (modals, forms, etc.)
│       │   ├── routes/        # TanStack Router file-based routes
│       │   ├── utils/         # tRPC client setup
│       │   ├── functions/     # Shared utilities (getUser, etc.)
│       │   └── lib/           # Auth client, utils
│       └── .env         # Frontend environment variables
├── packages/
│   ├── api/             # tRPC routers & business logic
│   │   └── src/
│   │       ├── routers/       # Domain routers (workItem, sprint, board, etc.)
│   │       ├── context.ts     # tRPC context (session, prisma)
│   │       └── index.ts       # tRPC initialization, procedures
│   ├── auth/            # Better-Auth configuration
│   │   └── src/index.ts       # Auth setup with Prisma adapter
│   └── db/              # Database layer
│       ├── prisma/
│       │   ├── schema.prisma  # **SOURCE OF TRUTH** for database schema
│       │   └── seed.ts        # Database seeding
│       ├── generated/         # Auto-generated Prisma Client (DON'T EDIT!)
│       └── src/
│           ├── client.ts      # Prisma client singleton
│           ├── enums.ts       # Exported enums
│           └── index.ts       # Type exports
└── ai-input/            # Context files for AI assistance
    ├── schema.prisma    # Reference schema
    └── seed.ts          # Reference seed data
```

### Package Dependencies

**Workspace References:**
- `apps/server` depends on: `@my-better-t-app/api`, `@my-better-t-app/auth`, `@my-better-t-app/db`
- `apps/web` depends on: `@my-better-t-app/api`, `@my-better-t-app/auth`, `@my-better-t-app/db`
- `packages/api` depends on: `@my-better-t-app/auth`, `@my-better-t-app/db`
- `packages/auth` depends on: `@my-better-t-app/db`

**Catalog Dependencies** (defined in root `package.json`):
- `elysia`, `@trpc/server`, `@trpc/client`, `better-auth`, `ai`, `@ai-sdk/google`, `zod`

## Environment Configuration

### Required Environment Variables

**apps/server/.env:**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/nexus2?schema=public"
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3001"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
```

**apps/web/.env:**
```bash
VITE_SERVER_URL="http://localhost:3000"
```

### Database Setup (PostgreSQL)

⚠️ **CRITICAL**: This project requires PostgreSQL with the **pgvector extension**!

**Option 1: Local PostgreSQL**
```bash
# Install PostgreSQL
brew install postgresql@16  # macOS
sudo apt install postgresql-16  # Ubuntu

# Install pgvector extension
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Create database
psql postgres
CREATE DATABASE nexus2;
\c nexus2
CREATE EXTENSION vector;
\q
```

**Option 2: Docker (Recommended)**
```bash
# Create docker-compose.yml in project root
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: nexus
      POSTGRES_PASSWORD: nexus123
      POSTGRES_DB: nexus2
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
volumes:
  postgres-data:
EOF

# Start database
docker-compose up -d

# Update DATABASE_URL in apps/server/.env
DATABASE_URL="postgresql://nexus:nexus123@localhost:5432/nexus2?schema=public"
```

**Option 3: Managed Services**
- Supabase (includes pgvector)
- Neon (supports pgvector)
- AWS RDS PostgreSQL (requires manual pgvector installation)

## Quick Reference

### Prisma Commands
```bash
# From packages/db or use root scripts
bunx prisma format          # Format schema
bunx prisma db push         # Sync schema to DB (dev)
bunx prisma migrate dev     # Create migration (prod)
bunx prisma studio          # Open database GUI
bunx prisma generate        # Generate client

# Root-level shortcuts
bun run db:push             # Turbo wrapper for db:push
bun run db:studio           # Turbo wrapper for db:studio
bun run db:generate         # Turbo wrapper for db:generate
bun run db:migrate          # Turbo wrapper for db:migrate
```

### Development Commands
```bash
bun install                 # Install all dependencies
bun run dev                 # Start all dev servers (server + web)
bun run dev:server          # Start only backend
bun run dev:web             # Start only frontend
bun run build               # Build all apps for production
bun run check-types         # TypeScript type checking

# Adding dependencies
cd apps/web && bun add package-name       # Web app
cd apps/server && bun add package-name    # Server
cd packages/api && bun add package-name   # API package
cd packages/db && bun add package-name    # DB package
```

## When Things Go Wrong

### Nuclear Option (Development Only!)

If everything is broken and you need a fresh start:

```bash
# 1. Reset database (DELETES ALL DATA!)
cd packages/db
bunx prisma migrate reset --force

# 2. Push schema
bunx prisma db push

# 3. Restart dev server
cd ../..
bun run dev
```

⚠️ **WARNING**: This deletes all data! Only use in development.

---

## Summary

**Golden Rules:**
1. ✅ Always run `bunx prisma db push` after schema changes
2. ✅ Use `useTRPCClient()` for mutations
3. ✅ Test locally before committing
4. ✅ Check console for errors
5. ✅ Use Prisma Studio to verify database state

**When in doubt:**
- Check this guide
- Look at existing code for patterns
- Test in Prisma Studio
- Restart dev server

Happy coding! 🚀

---

## Advanced Topics

### Database Schema Insights

**Entity Hierarchy:**
```
Organization (tenant root)
  ├── Portfolio (strategic grouping)
  │     └── Project (workspace)
  │           ├── Sprint (time-boxed iteration)
  │           ├── Board (visualization)
  │           ├── WorkItemState (custom workflow)
  │           └── WorkItem (work unit)
  │                 ├── WorkItemDetail (extended fields)
  │                 ├── TimeLog
  │                 ├── Comment
  │                 └── Attachment
  └── Team (resource pool)
        └── TeamMembership → User
```

**WorkItem Type Hierarchy:**
```
EPIC (strategic initiative)
  └── FEATURE (large deliverable)
        └── STORY (user-facing functionality)
              ├── TASK (technical work)
              └── SUB_TASK (atomic work unit)
BUG (defect) - can exist at any level
```

**Key Relationships:**
- `WorkItem.parentId` → hierarchical parent/child
- `WorkItem.epicId` → shortcut to epic (denormalized for performance)
- `WorkItem.sprintId` → current sprint assignment (nullable for backlog)
- `WorkItem.stateId` → current workflow state (project-specific)
- `Board.sprintId` → sprint-scoped board (nullable for backlog boards)

### tRPC Best Practices

**Context-Aware Procedures:**
```typescript
// packages/api/src/context.ts
export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({ headers: context.request.headers });
  return { session, prisma };
}

// Use protectedProcedure for auth-required routes
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
```

**Input Validation with Zod:**
```typescript
import { z } from "zod";
import { WorkItemType, Priority } from "@my-better-t-app/db";

export const workItemRouter = router({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.nativeEnum(WorkItemType),  // Use Prisma enums
      priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
      projectId: z.string().uuid(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.workItem.create({
        data: { ...input, creatorId: ctx.session.user.id },
      });
    }),
});
```

**Frontend Usage Patterns:**
```typescript
// READ operations (queries)
const trpc = useTRPC();
const { data, isLoading } = useQuery(
  trpc.workItem.getById.queryOptions({ id: "123" })
);

// WRITE operations (mutations)
const client = useTRPCClient();
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (data) => client.workItem.create.mutate(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["workItem"] });
    toast.success("Created!");
  },
});
```

### Authentication Flow

**Better-Auth Configuration:**
- Uses `prismaAdapter` with PostgreSQL
- Email/password authentication enabled
- Custom user fields: `firstName`, `lastName`
- Cookie-based sessions with `sameSite: "none"` for cross-origin

**Session Management:**
```typescript
// Server-side (tRPC context)
const session = await auth.api.getSession({ headers: request.headers });
// session.user.id, session.user.email, etc.

// Client-side (React)
import { authClient } from "@/lib/auth-client";
const session = await authClient.getSession();
```

**Protected Routes (TanStack Router):**
```typescript
export const Route = createFileRoute("/dashboard")(
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }
  },
});
```

### AI Features

**pgvector Embeddings:**
- `WorkItemEmbedding` table stores 1536-dim vectors
- Used for semantic search, similar work item discovery
- Generated from title + description + comments

**Google Gemini Integration:**
```typescript
// Server endpoint: POST /ai
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

const result = streamText({
  model: google("gemini-1.5-flash"),
  messages: convertToModelMessages(uiMessages),
});
return result.toTextStreamResponse();
```

**Sentiment Analysis:**
- `Comment.sentimentScore` (-1 to 1)
- `Comment.sentimentLabel` (positive/negative/neutral)
- Used in retrospectives, team health metrics

### Performance Considerations

**Database Indexes:**
- All foreign keys are indexed (`@@index`)
- Composite indexes on frequently queried combinations
- `WorkItem.type`, `WorkItem.stateId` for filtered board views

**Query Optimization:**
```typescript
// ❌ N+1 query problem
const items = await prisma.workItem.findMany();
for (const item of items) {
  const assignee = await prisma.user.findUnique({ where: { id: item.assigneeId } });
}

// ✅ Use include/select
const items = await prisma.workItem.findMany({
  include: { assignee: true, state: true },
});
```

**Prisma Transactions:**
```typescript
// Use $transaction for atomic operations
await ctx.prisma.$transaction(async (tx) => {
  const workItem = await tx.workItem.update(...);
  await tx.workItemDetail.upsert(...);
  return workItem;
});
```

### Deployment Checklist

**Pre-Deployment:**
1. ✅ Run `bun run check-types` - ensure no TypeScript errors
2. ✅ Run `bun run build` - verify production builds succeed
3. ✅ Create production migrations: `bunx prisma migrate deploy`
4. ✅ Set environment variables on hosting platform
5. ✅ Verify CORS_ORIGIN matches frontend URL
6. ✅ Use strong BETTER_AUTH_SECRET (min 32 chars, random)

**Environment-Specific Settings:**

**Development:**
- `bunx prisma db push` (fast iteration)
- Hot reload enabled
- Verbose error messages

**Production:**
- `bunx prisma migrate deploy` (safe, versioned)
- `bun run build` + `bun run start`
- Error logging service (Sentry, LogRocket)
- Database connection pooling (PgBouncer)
- CDN for static assets

**Recommended Hosting:**
- **Backend**: Railway, Fly.io, Render (Bun support)
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Database**: Supabase, Neon, Railway PostgreSQL

### Troubleshooting Guide

**"Module not found" errors:**
```bash
# Clear Bun cache and reinstall
rm -rf node_modules
rm bun.lock
bun install
```

**TypeScript errors in generated files:**
```bash
cd packages/db
bunx prisma generate
```

**CORS errors:**
- Verify `CORS_ORIGIN` in `apps/server/.env` matches frontend URL
- Check Better-Auth `trustedOrigins` includes frontend
- Ensure cookies have `sameSite: "none"` and `secure: true` for cross-origin

**Database connection issues:**
```bash
# Test connection
psql $DATABASE_URL

# Verify pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname='vector';"

# Recreate database (DEV ONLY!)
psql postgres -c "DROP DATABASE nexus2;"
psql postgres -c "CREATE DATABASE nexus2;"
psql nexus2 -c "CREATE EXTENSION vector;"
bunx prisma db push
```

**Hot reload not working:**
```bash
# Kill all processes
pkill -f "bun run"

# Restart dev server
bun run dev
```

### Code Quality Standards

**File Organization:**
- One router per domain entity
- Group related mutations/queries in same router
- Keep routers under 200 lines (split if larger)

**Naming Conventions:**
- Components: PascalCase (`CreateTaskModal.tsx`)
- Files: kebab-case for routes (`projects.$projectId.tsx`)
- Database fields: camelCase (`createdAt`, `userId`)
- Environment variables: SCREAMING_SNAKE_CASE

**Type Safety:**
- Always import Prisma-generated types
- Use `z.nativeEnum()` for Prisma enums
- Avoid `any` - use proper generics or `unknown`

**Error Handling:**
```typescript
// Backend (tRPC)
throw new TRPCError({
  code: "BAD_REQUEST",  // NOT_FOUND, UNAUTHORIZED, INTERNAL_SERVER_ERROR
  message: "User-facing error message",
  cause: originalError,  // For logging
});

// Frontend (React)
try {
  await client.workItem.create.mutate(data);
  toast.success("Success!");
} catch (error) {
  console.error(error);
  toast.error("Something went wrong. Please try again.");
}
```

### Useful Resources

**Documentation:**
- [Bun Docs](https://bun.sh/docs)
- [Elysia Guide](https://elysiajs.com/)
- [tRPC Docs](https://trpc.io/)
- [Prisma Docs](https://www.prisma.io/docs)
- [TanStack Router](https://tanstack.com/router)
- [Better-Auth](https://better-auth.com/)

**Community:**
- Bun Discord
- tRPC Discord
- Prisma Slack

---

**Last Updated**: 2025-12-30  
**Maintained By**: AI Agents working on Nexus2  
**Status**: Production-ready architecture guide
