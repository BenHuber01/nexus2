# my-better-t-app

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Elysia, TRPC, and more.

## 📚 Documentation Index

Choose the right guide for your needs:

- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes! 🚀
- **[AGENTS.md](./AGENTS.md)** - Development workflow guide for AI agents and developers
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into system architecture and design decisions
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Comprehensive project analysis and overview
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Detailed implementation roadmap and gap analysis
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to test and verify each feature implementation

### Quick Links

- **New to the project?** → Start with [QUICK_START.md](./QUICK_START.md)
- **Need to make changes?** → Read [AGENTS.md](./AGENTS.md)
- **Want to understand the system?** → Check [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Looking for an overview?** → See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- **Following implementation plan?** → Use [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- **Testing new features?** → Follow [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Elysia** - Type-safe, high-performance framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database engine with pgvector extension
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses **PostgreSQL** with the **pgvector extension** for AI features.

### Option 1: Docker (Recommended)

```bash
# Create docker-compose.yml
docker-compose up -d

# The docker-compose.yml should include:
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
```

### Option 2: Local PostgreSQL

1. Install PostgreSQL 16+ with pgvector extension
2. Create database:
   ```bash
   psql postgres
   CREATE DATABASE nexus2;
   \c nexus2
   CREATE EXTENSION vector;
   \q
   ```

### Option 3: Managed Service

- **Supabase** (includes pgvector)
- **Neon** (serverless PostgreSQL)
- **Railway** (simple deployment)

### Configure Environment

1. Update `apps/server/.env` with your database connection:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/nexus2?schema=public"
   ```

2. Push the Prisma schema to your database:
   ```bash
   bun run db:push
   ```


Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).







## Project Structure

```
my-better-t-app/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── server/      # Backend API (Elysia, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI
