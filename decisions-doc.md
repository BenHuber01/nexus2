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
- Future: Custom workflow transitions between states

---

**Last Updated:** 2025-12-30
