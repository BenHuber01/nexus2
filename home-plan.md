# Home Dashboard Plan

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

### 1. Quick Stats Bar (Top)
**4 Metric Cards (Horizontal)**

- **My Open Tasks**
  - Count of assigned tasks (non-completed states)
  - Badge: Priority breakdown (High/Critical count)
  - Click: Filter to "My Tasks" view

- **Tasks Due This Week**
  - Count of tasks with dueDate in next 7 days
  - Badge: Overdue count (red)
  - Click: Show filtered list

- **Active Sprints**
  - Count of sprints in "active" state across all projects
  - Badge: Current sprint progress %
  - Click: Navigate to sprint view

- **Recent Comments**
  - Count of unread comments on user's tasks (last 24h)
  - Badge: New count
  - Click: Show activity timeline

**Data Source**: 
```typescript
trpc.dashboard.getStats.query() // New endpoint
```

---

### 2. My Active Tasks (Left Panel)
**Table View - Current User's Work**

**Columns**:
- Project Key + Task ID (e.g., `PROJ-123`)
- Title (truncated)
- Priority (Badge)
- State (Badge)
- Due Date (relative: "2 days" with color coding)

**Filters** (Top):
- All / High Priority / Due Soon
- Grouping: By Project / By Sprint

**Actions**:
- Click row → Open task modal
- Max 10-15 items, "View All" link at bottom

**Data Source**:
```typescript
trpc.workItem.getByAssignee.query({ 
  userId: currentUser.id,
  states: ['TODO', 'IN_PROGRESS'],
  limit: 15
})
```

---

### 3. Recent Activity (Right Panel)
**Timeline View - User & Team Updates**

**Items** (Chronological, newest first):
- Task state changes
- New comments on watched tasks
- Task assignments
- Sprint starts/completions

**Format**:
```
[Icon] [User Avatar] [Action] [Target] • [Time]
```

**Example**:
```
✓ John D. completed "Fix login bug" • 2h ago
💬 Sarah M. commented on "API refactor" • 3h ago
→ Mike L. moved "Update docs" to In Progress • 5h ago
```

**Max**: 10 items, "View All Activity" link

**Data Source**:
```typescript
trpc.activity.getRecent.query({ 
  limit: 10,
  types: ['state_change', 'comment', 'assignment']
})
```

---

### 4. Active Sprints Overview
**Collapsible Cards per Sprint**

**Card Header**:
- Sprint Name + Project Name
- Progress Bar (% completed tasks)
- Days Remaining (badge)
- Expand/Collapse icon

**Card Content (when expanded)**:
- **Stats Row**:
  - Total Tasks: X
  - Completed: Y (green)
  - In Progress: Z (blue)
  - Todo: W (gray)

- **Task Breakdown** (Mini table):
  - Top 5 tasks in sprint
  - State + Assignee
  - Click → Task modal

**Sorting**: By sprint end date (soonest first)

**Data Source**:
```typescript
trpc.sprint.getActive.query({ 
  includeTaskCounts: true,
  limit: 3
})
```

---

### 5. My Projects (Grid)
**Card Grid - User's Organizations & Projects**

**Card Layout**:
```
┌────────────────────────┐
│ [Org Icon] Org Name    │
│ ────────────────────   │
│ Project A    [5 tasks] │
│ Project B    [2 tasks] │
│ Project C    [0 tasks] │
│                        │
│ [View All Projects →]  │
└────────────────────────┘
```

**Features**:
- Group by organization
- Show task count per project (assigned to user)
- Click project → Navigate to project view
- Max 3 organizations, expand for more

**Data Source**:
```typescript
trpc.organization.getWithProjects.query({
  includeTaskCounts: true
})
```

---

### 6. Team Activity (Optional)
**List View - Team Members' Work**

Shows recent work from team members in same projects:
- Who's working on what
- Recent completions
- Blockers/high-priority items

**Format**:
- Avatar + Name + Current Task + Status

**Data Source**:
```typescript
trpc.team.getActivity.query({ limit: 5 })
```

---

### 7. Upcoming Due Dates
**List View - Tasks Due Soon**

**Grouped by Date**:
- Overdue (red)
- Today (orange)
- Tomorrow (yellow)
- This Week (default)

**Item Format**:
- Task Title
- Project
- Assignee (if not current user)

**Click**: Open task modal

**Data Source**:
```typescript
trpc.workItem.getUpcoming.query({ 
  userId: currentUser.id,
  days: 7
})
```

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
1. Create `dashboard.ts` router with `getStats` endpoint
2. Create `activity.ts` router with `getRecent` endpoint
3. Add `workItem.getByAssignee` procedure
4. Add `workItem.getUpcoming` procedure
5. Extend `sprint.getActive` with task counts
6. Test all endpoints with Postman/Prisma Studio

### Phase 2: Frontend Components
1. Create `/apps/web/src/components/dashboard/` folder
2. Build `QuickStatsBar.tsx` (4 stat cards)
3. Build `MyActiveTasks.tsx` (table view)
4. Build `RecentActivity.tsx` (timeline)
5. Build `ActiveSprints.tsx` (collapsible cards)
6. Build `MyProjects.tsx` (grid)
7. Build `UpcomingDue.tsx` (list)

### Phase 3: Integration
1. Update `/apps/web/src/routes/index.tsx` (home route)
2. Wire up all components with tRPC queries
3. Add refetchOnMount/refetchOnWindowFocus for fresh data
4. Add loading skeletons for each section

### Phase 4: Polish
1. Add empty states ("No tasks assigned", etc.)
2. Add navigation links ("View All", etc.)
3. Add hover states and animations
4. Test multi-user scenarios
5. Optimize query performance (indexes, includes)

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
