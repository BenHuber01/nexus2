# Home Dashboard Plan

## Implementation Status

### ✅ Completed
- **Quick Stats Bar** - 4 metric cards (Open Tasks, Due This Week, Active Sprints, Recent Comments)
- **My Active Tasks** - Table view with task details, project context, click to open modal
- **Active Sprints** - Collapsible cards with progress bars and task stats
- **Recent Activity** - Timeline view with comments and state changes
- **My Projects** - Grid view of projects grouped by organization with task counts
- **Upcoming Due Dates** - Grouped by Overdue/Today/Tomorrow/This Week
- **Backend**: `dashboard.getStats`, `workItem.getByAssignee`, `sprint.getActive`, `activity.getRecent`, `workItem.getUpcoming`, `organization.getWithProjects`
- **UI Components**: Progress component from shadcn/ui

### ❌ Not Yet Implemented
- **Team Activity** - Team members' work overview (optional feature)
- **Backend**: `team.getActivity` endpoint (optional)

---

## Overview
Transform the home page into a personalized dashboard showing user's most relevant work across all organizations and projects.

## Core Principles
- **Personal Focus**: Show only what's relevant to the current user
- **Actionable**: Quick access to active work
- **Overview**: High-level metrics without overwhelming detail
- **Performance**: Efficient queries, no unnecessary data loading

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: Welcome back, [User]                            │
│ Quick Stats Bar (Cards)                                 │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐               │
│ │ My Active Tasks │ │ Recent Activity │               │
│ │ (List/Table)    │ │ (Timeline)      │               │
│ │                 │ │                 │               │
│ │                 │ │                 │               │
│ └─────────────────┘ └─────────────────┘               │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Active Sprints Overview (Collapsible Cards)         │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ My Projects   │ │ Team Activity │ │ Upcoming Due  │ │
│ │ (Grid Cards)  │ │ (List)        │ │ (List)        │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Components Breakdown

### 1. Quick Stats Bar (Top) ✅ IMPLEMENTED
**4 Metric Cards (Horizontal)**

- **My Open Tasks** ✅
  - Count of assigned tasks (non-completed states)
  - Icon: CheckCircle2 (blue)
  - Click: Not yet implemented

- **Tasks Due This Week** ✅
  - Count of tasks with dueDate in next 7 days
  - Icon: Clock (orange)
  - Click: Not yet implemented

- **Active Sprints** ✅
  - Count of sprints in "active" state across all projects
  - Icon: Rocket (green)
  - Click: Not yet implemented

- **Recent Comments** ✅
  - Count of comments on user's tasks (last 24h, excluding own comments)
  - Icon: MessageSquare (purple)
  - Click: Not yet implemented

**Data Source**: 
```typescript
trpc.dashboard.getStats.query() // ✅ Implemented
```

**Implementation**: `/apps/web/src/components/dashboard/quick-stats-bar.tsx`

---

### 2. My Active Tasks (Left Panel) ✅ IMPLEMENTED
**Table View - Current User's Work**

**Columns**: ✅
- Project Key + Task ID (e.g., `PROJ-123`)
- Title (truncated) + Project name subtitle
- Priority (Badge with color coding)
- State (Badge)
- Due Date (relative format with overdue highlighting)

**Filters** (Top): ❌ Not implemented
- All / High Priority / Due Soon
- Grouping: By Project / By Sprint

**Actions**: ✅
- Click row → Open task modal (TaskFormModal)
- Max 15 items
- Empty state handling

**Data Source**: ✅
```typescript
trpc.workItem.getByAssignee.query({ 
  userId: currentUser.id,
  limit: 15
})
// Filters by non-DONE states, ordered by priority (desc) and dueDate (asc)
```

**Implementation**: `/apps/web/src/components/dashboard/my-active-tasks.tsx`

---

### 3. Recent Activity (Right Panel) ✅ IMPLEMENTED
**Timeline View - User & Team Updates**

**Items** (Chronological, newest first): ✅
- Task state changes
- New comments on watched tasks
- Task assignments
- Sprint starts/completions (via ActivityLog)

**Format**: ✅
```
[Icon] [User Avatar] [Action] [Target] • [Time]
```

**Example**:
```
✓ John D. completed "Fix login bug" • 2h ago
💬 Sarah M. commented on "API refactor" • 3h ago
→ Mike L. moved "Update docs" to In Progress • 5h ago
```

**Max**: ✅ 10 items, skeleton loading states

**Data Source**: ✅
```typescript
trpc.activity.getRecent.query({ 
  limit: 10
})
// Combines ActivityLog entries + recent comments
```

**Implementation**: `/apps/web/src/components/dashboard/recent-activity.tsx`

---

### 4. Active Sprints Overview ✅ IMPLEMENTED
**Collapsible Cards per Sprint**

**Card Header**: ✅
- Sprint Name + Project Name (badge)
- Progress Bar (% completed tasks)
- Days Remaining / Overdue status
- Expand/Collapse icon (ChevronDown/ChevronUp)

**Card Content (when expanded)**: ✅
- **Stats Row** (4-column grid):
  - Total Tasks: X
  - Todo: W (gray)
  - In Progress: Z (blue)
  - Done: Y (green)

- **Sprint Goal**: ✅ Displayed if available

- **Task Breakdown** (Mini table): ❌ Not implemented
  - Top 5 tasks in sprint
  - State + Assignee
  - Click → Task modal

**Sorting**: ✅ By sprint end date (soonest first)

**Data Source**: ✅
```typescript
trpc.sprint.getActive.query({ 
  limit: 3
})
// Returns sprints with stats: { total, todo, inProgress, done }
```

**Implementation**: `/apps/web/src/components/dashboard/active-sprints.tsx`

---

### 5. My Projects (Grid) ✅ IMPLEMENTED
**Card Grid - User's Organizations & Projects**

**Card Layout**: ✅
- Organization cards with nested project lists
- Project key + task count badges
- Click to navigate to project view
- Max 5 projects shown per org, "+ more" indicator

**Features**: ✅
- Group by organization
- Show task count per project (assigned to user, non-DONE)
- Click project → Navigate to project view
- Hover states and chevron indicators

**Data Source**: ✅
```typescript
trpc.organization.getWithProjects.query()
// Returns orgs with projects + taskCount per project
```

**Implementation**: `/apps/web/src/components/dashboard/my-projects.tsx`

---

### 6. Team Activity (Optional) ❌ NOT IMPLEMENTED
**List View - Team Members' Work**

Shows recent work from team members in same projects:
- Who's working on what
- Recent completions
- Blockers/high-priority items

**Format**:
- Avatar + Name + Current Task + Status

**Data Source**: ❌ Requires implementation
```typescript
trpc.team.getActivity.query({ limit: 5 })
```

**Status**: Requires backend endpoint + frontend component

---

### 7. Upcoming Due Dates ✅ IMPLEMENTED
**List View - Tasks Due Soon**

**Grouped by Date**: ✅
- Overdue (red with AlertCircle icon)
- Today (orange)
- Tomorrow (yellow)
- This Week (default)

**Item Format**: ✅
- Task ID (Project key + short ID)
- Task Title (truncated)
- State badge
- Project name
- Assignee (if not current user)
- Relative time ("due in 2 days")

**Click**: ✅ Open task modal (TaskFormModal)

**Data Source**: ✅
```typescript
trpc.workItem.getUpcoming.query({ 
  userId: currentUser.id,
  days: 7
})
// Returns tasks due within 7 days, sorted by dueDate asc
```

**Implementation**: `/apps/web/src/components/dashboard/upcoming-due-dates.tsx`

---

## Backend Requirements

### New tRPC Routers

**1. Dashboard Router** (`packages/api/src/routers/dashboard.ts`)
```typescript
export const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Aggregate stats for current user
    return {
      openTasksCount,
      dueThisWeekCount,
      activeSprintsCount,
      recentCommentsCount,
    };
  }),
});
```

**2. Activity Router** (`packages/api/src/routers/activity.ts`)
```typescript
export const activityRouter = router({
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      // Query activity logs or derive from work items
      return activities;
    }),
});
```

**3. Extend Existing Routers**
- `workItem.getByAssignee()` - filter by user + states
- `workItem.getUpcoming()` - filter by dueDate range
- `sprint.getActive()` - include task counts
- `organization.getWithProjects()` - include user's task counts per project

---

## Implementation Steps

### Phase 1: Backend (Data Layer)
1. ✅ Create `dashboard.ts` router with `getStats` endpoint
2. ✅ Create `activity.ts` router with `getRecent` endpoint
3. ✅ Add `workItem.getByAssignee` procedure
4. ✅ Add `workItem.getUpcoming` procedure
5. ✅ Extend `sprint.getActive` with task counts
6. ✅ Add `organization.getWithProjects` with task counts
7. ⏳ Test all endpoints with Postman/Prisma Studio

### Phase 2: Frontend Components
1. ✅ Create `/apps/web/src/components/dashboard/` folder
2. ✅ Build `QuickStatsBar.tsx` (4 stat cards)
3. ✅ Build `MyActiveTasks.tsx` (table view)
4. ✅ Build `RecentActivity.tsx` (timeline)
5. ✅ Build `ActiveSprints.tsx` (collapsible cards)
6. ✅ Build `MyProjects.tsx` (grid)
7. ✅ Build `UpcomingDueDates.tsx` (grouped list)
8. ❌ Build `TeamActivity.tsx` (optional)

### Phase 3: Integration
1. ✅ Update `/apps/web/src/routes/index.tsx` (home route)
2. ✅ Wire up all components with tRPC queries
3. ✅ Add loading skeletons for each section
4. ✅ Add two-column layout for Tasks/Activity
5. ⏳ Add refetchOnMount/refetchOnWindowFocus for fresh data

### Phase 4: Polish
1. ✅ Add empty states for all components
2. ✅ Add hover states and animations
3. ✅ Responsive grid layouts
4. ⏳ Test multi-user scenarios
5. ⏳ Optimize query performance (indexes, includes)
6. ⏳ Add navigation links ("View All", etc.)

---

## Performance Considerations

**Query Optimization**:
- Use `_count` for aggregations (avoid fetching full relations)
- Limit result sets (max 10-15 items per section)
- Use `select` to fetch only needed fields
- Add database indexes on frequently queried fields:
  - `WorkItem.assigneeId`
  - `WorkItem.dueDate`
  - `WorkItem.stateId`
  - `Sprint.state`

**Caching Strategy**:
- `refetchOnMount: true` for dashboard (always fresh on load)
- `staleTime: 30000` (30s) to reduce redundant queries
- Invalidate on mutations (task updates, state changes)

---

## UI/UX Details

**Color Coding**:
- Overdue: `destructive` (red)
- Due Today: `warning` (orange/yellow)
- High Priority: `destructive` outline
- Completed: `success` (green)

**Responsive Design**:
- Desktop (>1024px): 2-column layout
- Tablet (768-1024px): 1-column, collapsible sections
- Mobile (<768px): Stack all sections vertically

**Interactions**:
- All task rows clickable → Open TaskFormModal
- All project cards clickable → Navigate to project
- Hover states on interactive elements
- Smooth expand/collapse animations for sprint cards

---

## Future Enhancements (v2)

**Analytics**:
- Velocity chart (tasks completed per week)
- Burndown for active sprints
- Time tracking summary (hours logged this week)

**Customization**:
- User can hide/show sections
- Drag-and-drop to reorder sections
- Pin favorite projects to top

**Notifications**:
- Browser notifications for new comments
- In-app notification center (bell icon)

**AI Insights**:
- "Tasks at risk" (due soon, no progress)
- "Suggested next task" based on priority/dependencies
- Sentiment analysis on comments

---

## Notes

- Keep dashboard focused on **action**, not just information
- Every metric should lead to an actionable view
- Use optimistic updates for all mutations (task state, assignments)
- Ensure consistent query keys across dashboard and other views
- Consider WebSocket for real-time activity feed (future enhancement)
