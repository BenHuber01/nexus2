# Architecture Decision Records (ADR)

This document tracks important architectural and design decisions made during development.

---

## ADR-001: Board Lane State Mapping - Auto-Assignment + Visual Warnings

**Date:** 2025-12-30  
**Status:** Accepted  
**Decision Makers:** Development Team

### Context

When users create new board lanes without configuring "Mapped States", tasks do not appear in those lanes even if they are assigned to the correct sprint. This creates confusion because:

1. Users create custom lanes (e.g., "lane1", "lane2")
2. Tasks are created and assigned to the sprint
3. Tasks have a state (e.g., "To Do", "In Progress")
4. Lanes have empty `mappedStates` arrays
5. **Result:** Tasks are invisible in the board despite being in the sprint

**Technical Detail:**
```typescript
// task-board.tsx:198-199
tasks={filteredWorkItems?.filter((item: any) =>
    lane.mappedStates.includes(item.stateId)  // Empty array = no matches!
) || []}
```

### Problem

Tasks become invisible when:
- Lane has `mappedStates = []` (empty)
- OR lane has no `mappedStates` property
- Sprint filtering works, but state filtering fails

### Decision

**Hybrid Solution: Smart Auto-Assignment (C) + Visual Warnings (B)**

#### Part 1: Smart Default on Save (Option C)

When saving a lane with empty `mappedStates`:
1. Check if any workflow states are available in the project
2. Find states that are NOT already mapped to other lanes
3. Auto-assign the first available state to the lane
4. Log the auto-assignment for transparency

**Implementation Location:** `apps/web/src/components/board-settings-modal.tsx` in `handleSave()`

**Code Pattern:**
```typescript
for (const lane of newLanes) {
    let mappedStates = lane.mappedStates;
    
    // Auto-assign if empty
    if (!mappedStates || mappedStates.length === 0) {
        const availableStates = states.filter(state => 
            !allUsedStates.includes(state.id)
        );
        
        if (availableStates.length > 0) {
            mappedStates = [availableStates[0].id];
            console.log(`[BoardSettings] Auto-assigned state "${availableStates[0].name}" to lane "${lane.name}"`);
        }
    }
    
    await createLaneMutation.mutateAsync({
        ...lane,
        mappedStates: mappedStates,
    });
}
```

#### Part 2: Visual Warning in Board (Option B)

Display a warning badge/alert in lanes that have no mapped states:

**Implementation Location:** `apps/web/src/components/task-board.tsx` in `BoardLane` component

**UI Pattern:**
```typescript
{hasNoMappedStates && (
    <Badge variant="warning" className="text-xs">
        ⚠️ No states mapped - configure in settings
    </Badge>
)}
```

### Alternatives Considered

**Option A: Full Auto-Assignment**
- ✅ Simplest for users
- ❌ No control over which states go where
- ❌ Might create unwanted mappings

**Option D: Make mappedStates Required**
- ✅ Prevents the problem entirely
- ❌ Forces users to configure even if they don't understand states yet
- ❌ Less flexible

**Option B Only: Just Show Warnings**
- ✅ User maintains full control
- ❌ Board remains non-functional until user fixes it manually
- ❌ Poor initial experience

### Consequences

**Positive:**
- ✅ New boards work immediately (auto-assignment ensures at least one state per lane)
- ✅ Users can still customize mappings in board settings
- ✅ Visual feedback when something is misconfigured
- ✅ Transparent logging for debugging
- ✅ Prevents the "invisible tasks" problem for new users

**Negative:**
- ⚠️ Auto-assignment might not match user's mental model
- ⚠️ Requires tracking which states are already assigned
- ⚠️ Adds complexity to save logic

**Mitigations:**
- Clear console logs explaining auto-assignments
- Visual indicators showing current state mappings
- Easy reconfiguration in board settings UI

### Implementation Steps

1. **Phase 1: Smart Auto-Assignment**
   - Track used states across all lanes
   - Implement auto-assignment logic in `handleSave()`
   - Add console logs for transparency
   - Test with various scenarios (no states, some states, all states used)

2. **Phase 2: Visual Warnings**
   - Add `hasNoMappedStates` check in BoardLane component
   - Display warning badge when empty
   - Optional: Add tooltip with link to settings

3. **Phase 3: Documentation**
   - Update `steps-to-follow.md` with new behavior
   - Add examples of correct usage
   - Document auto-assignment logic

### Validation Criteria

- [ ] New lanes without mappedStates get auto-assigned available states
- [ ] Lanes with empty mappedStates show warning in board view
- [ ] Console logs clearly indicate auto-assignments
- [ ] Users can override auto-assignments in settings
- [ ] No duplicate state assignments occur
- [ ] Documentation updated

### Related Decisions

- See `maybe-todo-later.md` - Board Lane State Mapping Validation (duplicate prevention)
- Future: Consider making state management more intuitive in UI

---

## ADR-002: Workflow State Management UI

**Date:** 2025-12-30  
**Status:** ✅ **IMPLEMENTED**  
**Decision Makers:** Development Team

### Context

Currently, workflow states (To Do, In Progress, Done) are hardcoded when a project is created. Users have no way to:
- Create custom states (e.g., "Backlog", "Code Review", "Testing", "Deployed")
- Edit existing states (name, color, category)
- Delete unused states
- Reorder states

This limits flexibility, especially for custom board lanes that need to map to specific states.

### Problem

**Current Limitation:**
- Only 3 default states: "Todo", "In Progress", "Done"
- No UI to manage states
- Custom lanes can't map to custom states (they don't exist)
- Workflow is too rigid for different project types

**User Need:**
- Flexible state management per project
- Ability to create states that match team's workflow
- Visual customization (colors, icons)
- Category assignment (TODO, IN_PROGRESS, DONE, ARCHIVED) for workflow logic

### Decision

**Create a Workflow State Editor Component**

#### Backend (Already Available! ✅)

The `workItemStateRouter` already provides all necessary procedures:
- ✅ `getByProject` - List all states
- ✅ `create` - Create new state
- ✅ `update` - Edit state
- ✅ `delete` - Delete state (with safety check)
- ✅ `reorder` - Reorder states
- ✅ `getInitialState` - Get initial state
- ✅ `getFinalStates` - Get final states
- ✅ `getByCategory` - Filter by category

**Features:**
- Duplicate name prevention (unique per project)
- Auto-positioning (adds to end if not specified)
- Initial/Final state management (only one of each)
- Safety check (can't delete if work items use it)
- Automatic position reordering after delete

#### Frontend (✅ Implemented)

**Component:** `WorkflowStateEditor`
- **Location:** `apps/web/src/components/workflow-state-editor.tsx`
- **Integration:** Project Settings page (`apps/web/src/routes/projects_.$projectId_.settings.tsx`)
- **Access Path:** Project → Settings button → "Workflow States" tab

**Implemented Features:**
1. **List States**
   - Show all states in position order
   - Display: name, color, category, position, usage count
   - Visual indicators for initial/final states

2. **Create State**
   - Form: name, category, color, icon
   - Toggle: isInitial, isFinal
   - Validation: unique name, required fields

3. **Edit State**
   - Inline editing or modal
   - Update all properties
   - Color picker for color
   - Category dropdown (TODO, IN_PROGRESS, DONE, ARCHIVED)

4. **Delete State**
   - Confirmation dialog
   - Show error if work items exist
   - Suggest alternative state to move items to

5. **Reorder States**
   - Drag & drop to reorder
   - Or up/down buttons
   - Save new positions

6. **Optimistic Updates**
   - Immediate UI feedback for all operations
   - Rollback on error

### Implementation Plan

#### Phase 1: Component Enhancement ✅ COMPLETE
- Component exists at `apps/web/src/components/workflow-state-editor.tsx`
- All CRUD operations implemented
- Optimistic updates added for all mutations (create, update, delete, reorder)

#### Phase 2: Integration ✅ COMPLETE
- Created Project Settings route: `apps/web/src/routes/projects_.$projectId_.settings.tsx`
- Two tabs: "General" and "Workflow States"
- Settings button in project header links to settings page
- WorkflowStateEditor integrated in "Workflow States" tab

#### Phase 3: UX Enhancements ✅ COMPLETE
- Color picker component
- Category dropdown with all enum values
- Usage count display (prevents deletion of states in use)
- Warning dialogs for destructive actions
- Cross-cache invalidation (workItemState + board queries)

#### Phase 4: Board Integration ✅ COMPLETE
- Board Settings shows all available states
- State changes automatically refresh board
- Auto-assignment uses newly created states

### Data Model

```typescript
WorkItemState {
  id: string           // UUID
  name: string         // "Code Review" (unique per project)
  category: enum       // TODO, IN_PROGRESS, DONE, ARCHIVED
  position: int        // Order in list
  wipLimit: int?       // Optional WIP limit
  color: string        // Hex color (default: #6B7280)
  icon: string?        // Optional icon name
  isInitial: boolean   // Default state for new items
  isFinal: boolean     // Marks completion
  projectId: string    // Parent project
}
```

**Categories:**
- `TODO` - Not started
- `IN_PROGRESS` - Active work
- `DONE` - Completed
- `ARCHIVED` - Archived/closed

### UI Mockup (Text)

```
┌─ Workflow States ─────────────────────────────┐
│  [+ Create State]                             │
├───────────────────────────────────────────────┤
│  🟢 Backlog       [TODO]        Position: 1   │
│     ↑ ↓  ✏️ 🗑️                 (5 items)      │
│                                               │
│  🟡 To Do         [TODO]        Position: 2   │
│     ↑ ↓  ✏️ 🗑️                 (12 items)     │
│     [Initial State]                           │
│                                               │
│  🔵 In Progress   [IN_PROGRESS] Position: 3   │
│     ↑ ↓  ✏️ 🗑️                 (8 items)      │
│                                               │
│  🟠 Code Review   [IN_PROGRESS] Position: 4   │
│     ↑ ↓  ✏️ 🗑️                 (3 items)      │
│                                               │
│  🟣 Testing       [IN_PROGRESS] Position: 5   │
│     ↑ ↓  ✏️ 🗑️                 (2 items)      │
│                                               │
│  🟢 Done          [DONE]        Position: 6   │
│     ↑ ↓  ✏️ 🗑️                 (45 items)     │
│     [Final State]                             │
└───────────────────────────────────────────────┘
```

### Validation Criteria

- [✅] User can create new workflow states
- [✅] User can edit state properties (name, color, category)
- [✅] User can delete states (with safety check)
- [✅] User can reorder states
- [✅] Color picker works correctly
- [✅] Category dropdown shows all options
- [✅] Initial/Final toggles work (mutual exclusion)
- [✅] Work item count displays correctly
- [✅] Cannot delete state with work items (shows error)
- [✅] Board Settings shows newly created states
- [✅] Optimistic updates work for all operations
- [✅] Documentation updated

### Related Decisions

- ADR-001: Board Lane State Mapping (lanes map to these states)
- ADR-003: Workflow State Categories (explains category vs state distinction)
- Future: Custom workflow transitions between states

---

## ADR-003: Workflow State Categories - Fixed Enum Design

**Date:** 2025-12-30  
**Status:** Accepted  
**Decision Makers:** Development Team

### Context

Workflow states have two levels:
1. **State Name** (custom, user-defined): "Code Review", "QA Testing", "Backlog", etc.
2. **State Category** (fixed enum): `TODO`, `IN_PROGRESS`, `DONE`, `ARCHIVED`

This design can be confusing because users might wonder:
- "Why can't I create custom categories?"
- "What's the point of categories if I have custom states?"

### The Purpose of Categories

**Categories are NOT old states** - they are **semantic metadata** for system automation.

#### 1. Workflow Automation & Business Logic

```typescript
// Sprint Completion Check
const allDone = sprintTasks.every(task => 
  task.state.category === WorkItemStateCategory.DONE ||
  task.state.category === WorkItemStateCategory.ARCHIVED
);

// Initial State for New Tasks
const initialState = states.find(s => s.isInitial);
// → Must be category: TODO (semantically correct)
```

#### 2. Metrics & Reporting

```typescript
// Velocity Calculation
const velocity = completedStories
  .filter(s => s.state.category === WorkItemStateCategory.DONE)
  .reduce((sum, s) => sum + s.storyPoints, 0);

// Burndown Chart: Only count DONE categories as complete
const remaining = totalPoints - donePoints;
```

#### 3. WIP (Work In Progress) Limits

```typescript
// Count active work
const wipCount = tasks.filter(t => 
  t.state.category === WorkItemStateCategory.IN_PROGRESS
).length;

if (wipCount >= lane.wipLimit) {
  toast.warning("WIP limit reached!");
}
```

#### 4. Board Behavior & Filtering

```typescript
// "Show only tasks that are being worked on"
const activeWork = allTasks.filter(t => 
  t.state.category === WorkItemStateCategory.IN_PROGRESS
);

// "Move all TODO items to sprint backlog"
const backlogItems = allTasks.filter(t => 
  t.state.category === WorkItemStateCategory.TODO
);
```

### Real-World Example

**Your Custom Workflow:**

| State Name | Category | Semantic Meaning | Use Case |
|------------|----------|------------------|----------|
| "Backlog" | `TODO` | Not started | Sprint planning pool |
| "Ready for Dev" | `TODO` | Planned but not active | Ready to pull |
| "In Development" | `IN_PROGRESS` | Active work | Counts toward WIP |
| "Code Review" | `IN_PROGRESS` | Still active | Counts toward WIP |
| "QA Testing" | `IN_PROGRESS` | Still active | Counts toward WIP |
| "Ready to Deploy" | `IN_PROGRESS` | Still active | Counts toward WIP |
| "Deployed" | `DONE` | Complete | Counts toward velocity |
| "Closed" | `DONE` | Complete | Counts toward velocity |
| "Won't Fix" | `ARCHIVED` | Cancelled | Excluded from metrics |

**What the system sees:**
- 9 different states → Flexible workflow
- 4 categories → Predictable automation

**Example automation:**
```typescript
// Can we close the sprint?
if (sprintTasks.every(t => t.state.category !== 'IN_PROGRESS')) {
  // All tasks are either DONE, ARCHIVED, or TODO (moved to next sprint)
  enableSprintClosure();
}
```

### Decision: Keep Categories as Fixed Enum

**Why NOT allow custom categories?**

#### ❌ Problems with Custom Categories:

1. **Breaks Business Logic:**
   ```typescript
   // This code would break:
   if (state.category === WorkItemStateCategory.DONE) { ... }
   // If categories are custom strings, we can't write reliable code
   ```

2. **Metrics Become Meaningless:**
   - Velocity calculation needs to know what "done" means
   - Burndown charts need a clear "complete" definition
   - WIP limits need to know what "active work" means

3. **No Standard for Integrations:**
   - Jira import/export would break
   - Sprint reports wouldn't work
   - Third-party tools expect standard categories

4. **Analysis Paralysis:**
   - "Should I create 'On Hold' as TODO or IN_PROGRESS?"
   - "Is 'Blocked' a category or a state?"
   - Too many decisions, no clear patterns

5. **Database Schema Complexity:**
   ```prisma
   // Current: Simple enum (4 values, type-safe)
   enum WorkItemStateCategory {
     TODO
     IN_PROGRESS
     DONE
     ARCHIVED
   }
   
   // Alternative: Would need new table + foreign keys
   model StateCategory {
     id   String @id
     name String
     // ... complexity explosion
   }
   ```

#### ✅ Benefits of Fixed Categories:

1. **Predictable Automation:** Code can rely on 4 known values
2. **Clear Semantics:** Everyone understands TODO vs DONE
3. **Simple Mental Model:** Categories = "What is the system doing?"
4. **Type Safety:** TypeScript enums prevent typos
5. **Performance:** Enum comparison is faster than string comparison
6. **Standard Compliance:** Matches Agile best practices (To Do, Doing, Done)

### Alternative Considered: State Tags

If users need MORE semantic grouping beyond categories, we could add **tags**:

```typescript
WorkItemState {
  name: "Code Review"
  category: IN_PROGRESS  // Fixed enum
  tags: ["review", "blocked", "waiting-for-feedback"]  // Flexible!
}
```

**Future Enhancement:** State tags for custom filtering/reporting without breaking core logic.

### Consequences

**Positive:**
- ✅ System automation works reliably
- ✅ Metrics (velocity, burndown) are accurate
- ✅ WIP limits are enforceable
- ✅ Sprint planning logic is predictable
- ✅ Simple mental model: "States = what users see, Categories = what system needs"

**Negative:**
- ⚠️ Users might be confused initially ("Why only 4 categories?")
- ⚠️ Need to map custom states to fixed categories
- ⚠️ Less flexibility in semantic grouping (mitigated by future tags feature)

**Mitigations:**
- Clear documentation explaining category purpose
- Tooltips in UI: "Category determines how the system treats this state"
- Suggested mappings: "Code Review → IN_PROGRESS" (still active work)

### UI Clarity Improvements

**Category Dropdown with Descriptions:**
```
┌─ Select Category ──────────────────────────────┐
│ ○ To Do        (Not started, waiting)         │
│ ○ In Progress  (Active work, counts WIP)      │
│ ○ Done         (Complete, counts velocity)    │
│ ○ Archived     (Cancelled, excluded)          │
└────────────────────────────────────────────────┘
```

**Help Text in UI:**
> "Category determines how the system handles automation (metrics, WIP limits, sprint completion). Your state name is what users see."

### Validation Criteria

- [✅] Categories remain fixed enum (TODO, IN_PROGRESS, DONE, ARCHIVED)
- [✅] Backend logic relies on category for automation
- [ ] UI explains category purpose clearly (future tooltip enhancement)
- [✅] Users can create unlimited custom states
- [✅] Documentation explains State vs Category distinction
- [ ] Future: Consider state tags for additional grouping

### Related Decisions

- ADR-002: Workflow State Management UI
- ADR-001: Board Lane State Mapping
- Future: State tags for flexible grouping without breaking automation

---

## ADR-003: Project Components for Task Categorization

**Date:** 2025-12-30  
**Status:** ✅ **IMPLEMENTED**  
**Decision Makers:** Development Team

### Context

Tasks need to be categorized by technical components (e.g., "Frontend", "Backend", "Design") to facilitate filtering, resource allocation, and component-based metrics.

### Problem

**Current Limitation:**
- No way to tag tasks with component information
- Difficult to filter tasks by technical area
- No visibility into which components have the most work

**User Need:**
- Multiple components per task (many-to-many)
- Project-scoped component definitions
- Administration UI to manage components
- Visual indicators (colors)

### Decision

**Implemented Many-to-Many Component System**

#### Database Schema

```prisma
model Component {
  id          String   @id @default(uuid())
  name        String
  description String?
  color       String   @default("#3B82F6")
  position    Int      @default(0)
  projectId   String
  workItems   ComponentOnWorkItem[]
  @@unique([projectId, name])
}

model ComponentOnWorkItem {
  workItemId  String
  componentId String
  assignedAt  DateTime @default(now())
  @@id([workItemId, componentId])
}
```

#### Implementation Phases

**Phase 1: Database & Backend** ✅ COMPLETE
- Component and ComponentOnWorkItem models
- Component router with CRUD procedures
- WorkItem router updated for component support

**Phase 2: Administration UI** ✅ COMPLETE
- component-editor.tsx created
- Components tab in Project Settings
- Color picker and usage count display

**Phase 3: Task Forms** ✅ COMPLETE
- Component multi-select in edit-task-modal
- Checkbox UI with color indicators

**Phase 4: Views** 🚧 PENDING
- Display components in task-board cards
- Component filter in list-view

### Key Features

- ✅ Project-scoped components
- ✅ Many-to-many relationship
- ✅ Color-coded visual identification
- ✅ Optimistic updates
- ✅ Usage tracking
- ✅ Unique names per project

### Files Modified

**Backend:**
- `packages/db/prisma/schema.prisma` - Added models
- `packages/api/src/routers/component.ts` - New router
- `packages/api/src/routers/workItem.ts` - Added componentIds support
- `packages/api/src/routers/index.ts` - Exported component router

**Frontend:**
- `apps/web/src/components/component-editor.tsx` - New component
- `apps/web/src/components/edit-task-modal.tsx` - Added component multi-select
- `apps/web/src/routes/projects_.$projectId_.settings.tsx` - Added Components tab

---

**Last Updated:** 2025-12-30
