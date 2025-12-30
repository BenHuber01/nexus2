# Nexus2 - Gap Analysis & Implementation Plan

**Generated:** 2025-12-30  
**Purpose:** Identify missing backend routes and frontend components based on database schema

---

## 🎯 Current Status

### ✅ Phase 1: Critical Backend Routers - COMPLETE
**All 5 high-priority backend routers implemented and tested**
- Dependency Router
- WorkItemState Router  
- Team CRUD Mutations
- TeamMembership Router
- OrganizationMembership Router

### ✅ Phase 2: Core Frontend Components - COMPLETE
**All 4 major components + 2 routes implemented and integrated**
- Team Management Component
- Team Member Selector
- Dependency Manager (integrated into EditTaskModal)
- Workflow State Editor
- Organization Settings Route
- Dedicated Teams Route

### 🔴 Phase 3: Enhanced Features - READY TO START
**Next priority: Medium-priority features**
- Notification System
- Portfolio Views
- Retrospective UI
- Work Item List View

**See sections below for detailed implementation status and next steps.**

---

## 📊 Executive Summary

### Coverage Status

| Layer | Implemented | Missing | Coverage |
|-------|-------------|---------|----------|
| **Database Models** | 30 tables | 0 | 100% |
| **Backend Routers** | 14 routers | 7 missing | 67% |
| **Frontend Components** | 19 components | ~15 missing | 56% |

### Priority Assessment

- 🔴 **High Priority** - Core features needed for MVP
- 🟡 **Medium Priority** - Important for complete user experience
- 🟢 **Low Priority** - Nice-to-have, advanced features

---

## 📋 Database Schema Analysis

### Existing Tables (30 Total)

#### Authentication & Users (4 tables)
- ✅ User
- ✅ Session
- ✅ Account
- ✅ Verification

#### Organization & Structure (6 tables)
- ✅ Organization
- ✅ Team
- ✅ Role
- ✅ OrganizationMembership
- ✅ TeamMembership
- ✅ UserSkillProfile

#### Portfolio & Projects (5 tables)
- ✅ Portfolio
- ✅ Project
- ✅ Sprint
- ✅ Milestone
- ✅ Retrospective

#### Work Items (5 tables)
- ✅ WorkItem
- ✅ WorkItemDetail
- ✅ WorkItemState
- ✅ WorkItemSnapshot
- ✅ WorkItemEmbedding

#### Boards & Visualization (3 tables)
- ✅ Board
- ✅ BoardLane
- ✅ Tag

#### Dependencies & Relations (2 tables)
- ✅ Dependency
- ✅ TagOnWorkItem

#### Collaboration (3 tables)
- ✅ Comment
- ✅ Attachment
- ✅ TimeLog

#### System & Automation (2 tables)
- ✅ WorkflowRule
- ✅ Notification
- ✅ ActivityLog

---

## 🔌 Backend Router Analysis

### Implemented Routers (14/21)

| Router | Coverage | Operations | Status |
|--------|----------|------------|--------|
| **organization** | 🟢 Good | getAll, getById, create | Basic CRUD |
| **project** | 🟢 Good | getAll, getById, create | + auto-creates states & board |
| **workItem** | 🟢 Excellent | getAll, getById, create, update, updateState, getEpics, moveToSprint, moveToBacklog | Full featured |
| **sprint** | 🟢 Good | getAll, create, update, delete, getWorkItems | Complete |
| **board** | 🟢 Excellent | getForProject, getById, create, update, delete, createLane, updateLane, deleteLane, reorderLanes, getStatesForProject | Full featured |
| **portfolio** | 🟢 Good | getAll, getById, create, update, delete | Complete |
| **team** | 🟡 Basic | getAll, getById | Read-only! |
| **milestone** | 🟢 Good | getAll, create, update, delete | Complete |
| **retrospective** | 🟢 Good | getBySprintId, upsert, delete | Complete |
| **timeLog** | 🟡 Basic | getByWorkItem, create, delete | Missing update |
| **comment** | 🟢 Good | getByWorkItem, create, update, delete | Complete |
| **attachment** | 🟡 Basic | getByWorkItem, create, delete | Missing update |
| **tag** | 🟡 Basic | getAll, create, delete | Missing update, addToWorkItem |

### Missing Routers (7)

| Router | Priority | Reason | Tables Affected |
|--------|----------|--------|-----------------|
| **dependency** | 🔴 High | Track work item relationships | Dependency |
| **workItemState** | 🔴 High | Manage custom workflow states | WorkItemState |
| **teamMembership** | 🟡 Medium | Add/remove team members | TeamMembership |
| **organizationMembership** | 🟡 Medium | Invite users to org | OrganizationMembership |
| **role** | 🟢 Low | RBAC permissions | Role |
| **workflowRule** | 🟢 Low | Automation rules | WorkflowRule |
| **notification** | 🟡 Medium | User notifications | Notification |

---

## 🎨 Frontend Component Analysis

### Implemented Components (19)

#### Core Features
- ✅ **dashboard.tsx** - Organization & project overview
- ✅ **projects.$projectId.tsx** - Project detail page with tabs
- ✅ **task-board.tsx** - Kanban board with drag-and-drop
- ✅ **backlog-view.tsx** - Backlog management
- ✅ **sprint-management.tsx** - Sprint CRUD

#### Modals & Forms
- ✅ **create-organization-modal.tsx**
- ✅ **create-project-modal.tsx**
- ✅ **create-portfolio-modal.tsx**
- ✅ **create-task-modal.tsx**
- ✅ **edit-task-modal.tsx**
- ✅ **create-milestone-modal.tsx**
- ✅ **log-time-modal.tsx**
- ✅ **board-settings-modal.tsx**

#### Utility Components
- ✅ **comment-section.tsx**
- ✅ **attachment-list.tsx**
- ✅ **board-selector.tsx**
- ✅ **user-menu.tsx**
- ✅ **header.tsx**

#### Auth
- ✅ **sign-in-form.tsx**
- ✅ **sign-up-form.tsx**

### Missing Components (~15)

| Component | Priority | Purpose | Router Dependency |
|-----------|----------|---------|-------------------|
| **portfolio-view.tsx** | 🟡 Medium | Portfolio management page | portfolio |
| **portfolio-list.tsx** | 🟡 Medium | List portfolios in org | portfolio |
| **team-management.tsx** | 🔴 High | Team CRUD & member management | team, teamMembership |
| **team-member-selector.tsx** | 🔴 High | Add/remove team members | teamMembership |
| **milestone-list.tsx** | 🟡 Medium | Show project milestones | milestone |
| **milestone-timeline.tsx** | 🟢 Low | Gantt-style milestone view | milestone |
| **retrospective-board.tsx** | 🟡 Medium | Sprint retrospective UI | retrospective |
| **dependency-manager.tsx** | 🔴 High | Manage work item dependencies | dependency |
| **workflow-state-editor.tsx** | 🔴 High | Custom workflow designer | workItemState |
| **notification-center.tsx** | 🟡 Medium | Notification bell/panel | notification |
| **user-profile.tsx** | 🟡 Medium | User settings & preferences | - |
| **analytics-dashboard.tsx** | 🟢 Low | Charts, burndown, velocity | - |
| **work-item-list-view.tsx** | 🟡 Medium | Table view of work items | workItem |
| **organization-settings.tsx** | 🟡 Medium | Org settings & members | organization, organizationMembership |
| **project-settings.tsx** | 🟡 Medium | Project settings page | project |

---

## 🎯 Gap Analysis Summary

### Critical Missing Features (Must Implement)

#### 1. Team Management (🔴 High Priority)
**Current State:**
- ✅ Backend: Can read teams
- ❌ Backend: Cannot create/update/delete teams
- ❌ Backend: Cannot add/remove members
- ❌ Frontend: No team management UI

**Missing:**
- `teamRouter.create()` mutation
- `teamRouter.update()` mutation
- `teamRouter.delete()` mutation
- `teamMembershipRouter` (entire router)
- `team-management.tsx` component
- `team-member-selector.tsx` component

#### 2. Work Item Dependencies (🔴 High Priority)
**Current State:**
- ✅ Database: Dependency table exists
- ❌ Backend: No dependency router
- ❌ Frontend: No dependency visualization

**Missing:**
- `dependencyRouter` (entire router)
- `dependency-manager.tsx` component
- Dependency visualization on work items
- Blocking/blocked indicators

#### 3. Custom Workflow States (🔴 High Priority)
**Current State:**
- ✅ Database: WorkItemState table exists
- ✅ Backend: States created on project creation
- ✅ Backend: `board.getStatesForProject()` exists
- ❌ Backend: Cannot CRUD states independently
- ❌ Frontend: No state management UI

**Missing:**
- `workItemStateRouter` (entire router)
- `workflow-state-editor.tsx` component
- State transitions UI
- WIP limit enforcement

#### 4. Organization Member Management (🟡 Medium Priority)
**Current State:**
- ✅ Backend: Members auto-added on org creation
- ❌ Backend: Cannot invite new members
- ❌ Backend: Cannot change roles
- ❌ Frontend: No member management UI

**Missing:**
- `organizationMembershipRouter` (entire router)
- `organization-settings.tsx` component
- Invite user flow
- Role management

#### 5. Notifications (🟡 Medium Priority)
**Current State:**
- ✅ Database: Notification table exists
- ❌ Backend: No notification router
- ❌ Frontend: No notification UI

**Missing:**
- `notificationRouter` (entire router)
- `notification-center.tsx` component
- Real-time updates (WebSocket/SSE)
- Email notifications

---

## 📅 Implementation Roadmap

### Phase 1: Critical Backend Routers (Week 1-2)

**Goal:** Implement missing high-priority routers

#### Step 1.1: Dependency Router
```typescript
// packages/api/src/routers/dependency.ts
export const dependencyRouter = router({
  getByWorkItem,
  create,
  update,
  delete,
  getBlocingItems,
  getBlockedByItems,
});
```

#### Step 1.2: WorkItemState Router
```typescript
// packages/api/src/routers/workItemState.ts
export const workItemStateRouter = router({
  getByProject,
  create,
  update,
  delete,
  reorder,
});
```

#### Step 1.3: Team CRUD Mutations
```typescript
// packages/api/src/routers/team.ts (extend existing)
+ create,
+ update,
+ delete,
```

#### Step 1.4: TeamMembership Router
```typescript
// packages/api/src/routers/teamMembership.ts
export const teamMembershipRouter = router({
  getByTeam,
  addMember,
  removeMember,
  updateRole,
});
```

#### Step 1.5: OrganizationMembership Router
```typescript
// packages/api/src/routers/organizationMembership.ts
export const organizationMembershipRouter = router({
  getByOrganization,
  inviteMember,
  removeMember,
  updateRole,
});
```

**Estimated Time:** 8-12 hours  
**Deliverable:** 5 new/updated routers

---

### Phase 2: Core Frontend Components (Week 3-4)

**Goal:** Implement high-priority UI features

#### Step 2.1: Team Management
```typescript
// apps/web/src/components/team-management.tsx
- List teams
- Create/edit/delete team
- View team members
```

```typescript
// apps/web/src/components/team-member-selector.tsx
- Add members to team
- Remove members
- Assign roles
```

#### Step 2.2: Dependency Manager
```typescript
// apps/web/src/components/dependency-manager.tsx
- Add dependency (blocks/depends-on/relates-to)
- Remove dependency
- Visualize blocking chain
```

#### Step 2.3: Workflow State Editor
```typescript
// apps/web/src/components/workflow-state-editor.tsx
- Create custom states
- Edit state properties (name, color, WIP limit)
- Reorder states
- Delete states
```

#### Step 2.4: Organization Settings
```typescript
// apps/web/src/routes/organizations.$orgId.settings.tsx
- Org details
- Member list
- Invite users
- Manage roles
```

**Estimated Time:** 16-20 hours  
**Deliverable:** 4 new components + 1 new route

---

### Phase 3: Enhanced Features (Week 5-6)

**Goal:** Implement medium-priority features

#### Step 3.1: Notification System

**Backend:**
```typescript
// packages/api/src/routers/notification.ts
export const notificationRouter = router({
  getAll,
  getUnread,
  markAsRead,
  markAllAsRead,
  delete,
});
```

**Frontend:**
```typescript
// apps/web/src/components/notification-center.tsx
- Notification bell icon
- Dropdown with recent notifications
- Mark as read
- Navigate to related item
```

#### Step 3.2: Portfolio Views

```typescript
// apps/web/src/routes/portfolios.$portfolioId.tsx
- Portfolio detail page
- Project list
- Strategic goals
- Timeline view
```

```typescript
// apps/web/src/components/portfolio-list.tsx
- List portfolios in org
- Create portfolio
- Edit/delete portfolio
```

#### Step 3.3: Retrospective UI

```typescript
// apps/web/src/components/retrospective-board.tsx
- What went well
- What could be improved
- Action items
- Sentiment summary
```

#### Step 3.4: Work Item List View

```typescript
// apps/web/src/components/work-item-list-view.tsx
- Table view of work items
- Sortable columns
- Filters (assignee, status, type)
- Inline editing
```

**Estimated Time:** 16-20 hours  
**Deliverable:** 1 router + 5 components

---

### Phase 4: Advanced Features (Week 7-8)

**Goal:** Polish and advanced capabilities

#### Step 4.1: Analytics Dashboard
```typescript
// apps/web/src/components/analytics-dashboard.tsx
- Burndown chart
- Velocity graph
- Sprint health metrics
- Team capacity
```

#### Step 4.2: Workflow Automation
```typescript
// packages/api/src/routers/workflowRule.ts
export const workflowRuleRouter = router({
  getByProject,
  create,
  update,
  delete,
  toggle,
});
```

```typescript
// apps/web/src/components/workflow-rule-editor.tsx
- Trigger selection
- Condition builder
- Action configuration
```

#### Step 4.3: User Profile
```typescript
// apps/web/src/routes/profile.tsx
- User info
- Avatar upload
- Skill profile
- Notification preferences
```

#### Step 4.4: Milestone Timeline
```typescript
// apps/web/src/components/milestone-timeline.tsx
- Gantt-style view
- Drag to change dates
- Milestone dependencies
- Progress indicators
```

**Estimated Time:** 16-24 hours  
**Deliverable:** 2 routers + 4 components

---

## 📊 Detailed Implementation Steps

### Template: Adding a New Router

**Step-by-Step Process:**

#### 1. Create Router File
```bash
# Create file
touch packages/api/src/routers/dependency.ts

# Open for editing
vim packages/api/src/routers/dependency.ts
```

#### 2. Implement Router
```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const dependencyRouter = router({
  getByWorkItem: protectedProcedure
    .input(z.object({ workItemId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.dependency.findMany({
        where: {
          OR: [
            { sourceItemId: input.workItemId },
            { targetItemId: input.workItemId },
          ],
        },
        include: {
          sourceItem: { select: { id: true, title: true, type: true } },
          targetItem: { select: { id: true, title: true, type: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      sourceItemId: z.string(),
      targetItemId: z.string(),
      dependencyType: z.string().default("blocks"),
      description: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.dependency.create({
        data: input,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.dependency.delete({
        where: { id: input.id },
      });
    }),
});
```

#### 3. Register Router
```bash
vim packages/api/src/routers/index.ts
```

```typescript
// Add import
import { dependencyRouter } from "./dependency";

// Add to appRouter
export const appRouter = router({
  // ... existing routers
  dependency: dependencyRouter, // <-- Add this
});
```

#### 4. Test Backend
```bash
# Start dev server
bun run dev:server

# Use Prisma Studio to verify
bun run db:studio
```

#### 5. Commit Changes
```bash
git add packages/api/src/routers/dependency.ts
git add packages/api/src/routers/index.ts
git commit -m "feat: add dependency router for work item relationships"
```

---

### Template: Adding a Frontend Component

**Step-by-Step Process:**

#### 1. Create Component File
```bash
touch apps/web/src/components/dependency-manager.tsx
vim apps/web/src/components/dependency-manager.tsx
```

#### 2. Implement Component
```typescript
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function DependencyManager({ workItemId }: { workItemId: string }) {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  // Fetch dependencies
  const { data: dependencies, isLoading } = useQuery(
    trpc.dependency.getByWorkItem.queryOptions({ workItemId })
  );

  // Create dependency mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => client.dependency.create.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependency"] });
    },
  });

  // Delete dependency mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.dependency.delete.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependency"] });
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Dependencies</h3>
      
      {/* List dependencies */}
      {dependencies?.map((dep: any) => (
        <div key={dep.id} className="flex items-center justify-between">
          <span>{dep.targetItem.title} ({dep.dependencyType})</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteMutation.mutate(dep.id)}
          >
            Remove
          </Button>
        </div>
      ))}

      {/* Add dependency form */}
      {/* TODO: Implement add form */}
    </div>
  );
}
```

#### 3. Use Component
```bash
vim apps/web/src/components/edit-task-modal.tsx
```

```typescript
// Add import
import { DependencyManager } from "./dependency-manager";

// Add in modal
<DependencyManager workItemId={workItem.id} />
```

#### 4. Test Frontend
```bash
bun run dev:web
# Open http://localhost:3001
# Test the component
```

#### 5. Commit Changes
```bash
git add apps/web/src/components/dependency-manager.tsx
git add apps/web/src/components/edit-task-modal.tsx
git commit -m "feat: add dependency manager component"
```

---

## 🔄 Migration Considerations

### Database Schema Changes

**Current schema is complete!** No migrations needed for basic implementation.

**Optional enhancements:**
- Add indexes for dependency queries
- Add cascading deletes for safety
- Add validation constraints

```sql
-- Example: Add index for faster dependency lookups
CREATE INDEX idx_dependency_composite ON "Dependency" ("sourceItemId", "targetItemId");
```

### Breaking Changes

**None expected** - All new features are additive.

---

## 🧪 Testing Strategy

### Backend Testing

For each new router:
1. ✅ Test with Prisma Studio (manual)
2. ✅ Test with Postman/Insomnia (HTTP client)
3. ⏭️ Unit tests (future: Vitest)

### Frontend Testing

For each new component:
1. ✅ Visual inspection in browser
2. ✅ Test all CRUD operations
3. ✅ Check console for errors
4. ⏭️ E2E tests (future: Playwright)

---

## 📈 Success Metrics

### Phase 1 Completion ✅ COMPLETE
- ✅ 5 new routers implemented
- ✅ All routers tested in Prisma Studio
- ✅ No TypeScript errors
- ✅ All changes committed

**Completed Routers:**
1. ✅ `dependency.ts` - Work item relationship management
2. ✅ `workItemState.ts` - Custom workflow states CRUD
3. ✅ `team.ts` - Team CRUD mutations (create, update, delete)
4. ✅ `teamMembership.ts` - Team member management
5. ✅ `organizationMembership.ts` - Organization member management

### Phase 2 Completion ✅ COMPLETE
- ✅ 4 new components implemented
- ✅ 1 new route created
- ✅ Team management working end-to-end
- ✅ Workflow states customizable
- ✅ Dependencies visible in UI
- ✅ Dashboard navigation improved

**Completed Components:**
1. ✅ `team-management.tsx` - Full team CRUD with grid view
2. ✅ `team-member-selector.tsx` - Add/remove team members
3. ✅ `dependency-manager.tsx` - Dependency visualization & management
4. ✅ `workflow-state-editor.tsx` - Custom workflow state editor
5. ✅ `organizations.$organizationId.settings.tsx` - Org settings route
6. ✅ `organizations.$organizationId.teams.tsx` - Dedicated teams route
7. ✅ Integrated DependencyManager into EditTaskModal (Dependencies tab)

### Phase 3 Completion
- ✅ Notifications working
- ✅ Portfolio views functional
- ✅ List view for work items

### Phase 4 Completion
- ✅ Analytics dashboard with charts
- ✅ User profile complete
- ✅ All major features implemented

---

## 🚀 Quick Start

### Immediate Next Steps (Today!)

1. **Choose Phase 1, Step 1.1** (Dependency Router)
2. **Create the file**: `touch packages/api/src/routers/dependency.ts`
3. **Implement basic CRUD** (getByWorkItem, create, delete)
4. **Register in appRouter**
5. **Test in Prisma Studio**
6. **Commit!**

**Estimated time:** 1-2 hours

---

## 📝 Notes

### Dependencies Between Features

- **Team Management** is independent - can be done first
- **Dependencies** require work items - already implemented
- **Workflow States** used by boards - boards already implemented
- **Notifications** can be added incrementally

### Optional Features (Not in Plan)

- Real-time collaboration (WebSockets)
- File upload to cloud storage
- Email integration
- GitHub/GitLab integration
- Mobile app
- SSO/SAML

---

**Last Updated:** 2025-12-30  
**Status:** Phase 2 COMPLETE ✅ - Ready for Phase 3  
**Estimated Total Time:** 56-76 hours (7-10 days for solo developer)
