# Nexus2 - Quick Start Guide

**Get up and running in 5 minutes!** 🚀

## Prerequisites

- [Bun](https://bun.sh/) 1.2+ installed
- PostgreSQL 16+ (or Docker)
- Node.js 18+ (for compatibility)

---

## 🎯 Installation (5 Steps)

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd nexus2
bun install
```

### 2. Start PostgreSQL

**Option A: Docker (Easiest)**
```bash
# Copy the docker-compose.yml from ai-input/ or create one
docker-compose up -d
```

**Option B: Local PostgreSQL**
```bash
psql postgres -c "CREATE DATABASE nexus2;"
psql nexus2 -c "CREATE EXTENSION vector;"
```

### 3. Configure Environment

```bash
# Server environment
cp apps/server/.env.example apps/server/.env

# Edit apps/server/.env:
DATABASE_URL="postgresql://nexus:nexus123@localhost:5432/nexus2?schema=public"
BETTER_AUTH_SECRET="your-random-secret-min-32-chars-abcdef1234567890"
BETTER_AUTH_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3001"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-key-optional"

# Web environment
cp apps/web/.env.example apps/web/.env

# Edit apps/web/.env:
VITE_SERVER_URL="http://localhost:3000"
```

### 4. Initialize Database

```bash
bun run db:push
```

### 5. Start Development Servers

```bash
bun run dev
```

**✅ Open your browser:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- Database UI: `bun run db:studio` (http://localhost:5555)

---

## 📚 Essential Commands

### Development

```bash
bun run dev              # Start all servers (frontend + backend)
bun run dev:web          # Start only frontend (port 3001)
bun run dev:server       # Start only backend (port 3000)
bun run build            # Build for production
bun run check-types      # TypeScript type checking
```

### Database

```bash
bun run db:push          # Sync schema to database (dev)
bun run db:migrate       # Create migration (production)
bun run db:studio        # Open Prisma Studio GUI
bun run db:generate      # Regenerate Prisma client
```

### Package Management

```bash
bun install              # Install all dependencies
bun add <package>        # Add dependency to root
cd apps/web && bun add <pkg>     # Add to web app
cd apps/server && bun add <pkg>  # Add to server
cd packages/api && bun add <pkg> # Add to API package
```

---

## 🏗️ Project Structure (Key Folders)

```
nexus2/
├── apps/
│   ├── server/src/index.ts          # Backend entry point
│   └── web/src/
│       ├── routes/                  # Pages (dashboard.tsx, login.tsx, etc.)
│       ├── components/              # React components
│       └── utils/trpc.ts            # tRPC client setup
├── packages/
│   ├── api/src/routers/             # tRPC API endpoints
│   ├── auth/src/index.ts            # Auth configuration
│   └── db/prisma/schema.prisma      # Database schema (SOURCE OF TRUTH!)
```

---

## 🎨 Making Changes

### Add a New Database Table

```bash
# 1. Edit schema
vim packages/db/prisma/schema.prisma

# Add:
model MyNewTable {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}

# 2. Sync to database
bun run db:push

# 3. Verify in Prisma Studio
bun run db:studio
```

### Add a New API Endpoint

```bash
# 1. Create router file
vim packages/api/src/routers/myNewRouter.ts

# Content:
import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const myNewRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.myNewTable.findMany();
  }),
  
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.myNewTable.create({ data: input });
    }),
});

# 2. Register router
vim packages/api/src/routers/index.ts

# Add:
import { myNewRouter } from "./myNewRouter";

export const appRouter = router({
  // ... existing routers
  myNew: myNewRouter,
});
```

### Use API in Frontend

```typescript
// In any React component
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function MyComponent() {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  
  // Query (read)
  const { data, isLoading } = useQuery(
    trpc.myNew.getAll.queryOptions()
  );
  
  // Mutation (write)
  const createMutation = useMutation({
    mutationFn: (data) => client.myNew.create.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNew"] });
    },
  });
  
  return (
    <button onClick={() => createMutation.mutate({ name: "Test" })}>
      Create
    </button>
  );
}
```

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Error: "Can't reach database server"
# Solution: Check PostgreSQL is running
docker ps  # Should show postgres container
# OR
psql postgres -c "SELECT version();"
```

### Table Doesn't Exist

```bash
# Error: "The table 'public.WorkItem' does not exist"
# Solution: Push schema to database
bun run db:push
```

### tRPC Type Errors

```bash
# Error: Type errors in tRPC client
# Solution: Regenerate Prisma client
cd packages/db
bunx prisma generate
```

### Port Already in Use

```bash
# Error: "EADDRINUSE: address already in use :::3000"
# Solution: Kill existing process
lsof -ti:3000 | xargs kill -9  # macOS/Linux
# OR change port in apps/server/src/index.ts
```

### Clear Everything and Start Fresh

```bash
# Nuclear option (deletes all data!)
rm -rf node_modules bun.lock
cd packages/db
bunx prisma migrate reset --force  # DELETES DATABASE!
cd ../..
bun install
bun run db:push
bun run dev
```

---

## 📖 Learn More

- **[AGENTS.md](./AGENTS.md)** - Detailed development workflow guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture documentation
- **[README.md](./README.md)** - Project overview

### External Docs

- [Bun Documentation](https://bun.sh/docs)
- [tRPC Docs](https://trpc.io/)
- [Prisma Docs](https://www.prisma.io/docs)
- [TanStack Router](https://tanstack.com/router)
- [Better-Auth](https://better-auth.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 🎯 Next Steps

1. **Explore the code**:
   - Check `packages/api/src/routers/` for API examples
   - Look at `apps/web/src/routes/dashboard.tsx` for frontend patterns

2. **Read the guides**:
   - [AGENTS.md](./AGENTS.md) for common patterns
   - [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

3. **Build a feature**:
   - Follow the "Making Changes" section above
   - Test with Prisma Studio and browser DevTools

4. **Ask for help**:
   - Check existing code for patterns
   - Search the documentation
   - Review GitHub issues

---

**Happy Coding!** 🚀

_Last Updated: 2025-12-30_
