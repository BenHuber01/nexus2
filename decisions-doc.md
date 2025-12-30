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

**Last Updated:** 2025-12-30
