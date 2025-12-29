# AGENTS.md - Development Workflow Guide

This document provides best practices and workflows for AI agents working on this project to avoid common pitfalls and ensure smooth development.

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

### Before Committing

1. ✅ Run linter (if available)
2. ✅ Test locally
3. ✅ Check for console errors
4. ✅ Include migration files if you created them

### Commit Messages

Use conventional commits:
```
feat: add sprint-board relationship
fix: resolve database sync issue
docs: update AGENTS.md with Prisma workflow
refactor: improve board filtering logic
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
│   ├── server/          # Backend API
│   └── web/             # Frontend React app
├── packages/
│   ├── api/             # tRPC routers
│   └── db/              # Prisma schema & client
└── ai-input/            # AI context files
```

## Quick Reference

### Prisma Commands
```bash
bunx prisma format          # Format schema
bunx prisma db push         # Sync schema to DB (dev)
bunx prisma migrate dev     # Create migration (prod)
bunx prisma studio          # Open database GUI
bunx prisma generate        # Generate client
```

### Development Commands
```bash
bun run dev                 # Start dev servers
bun add package-name        # Add dependency
bun install                 # Install dependencies
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
