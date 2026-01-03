# Maybe TODO Later

This file collects potential improvements and features to implement in the future.

---

## 🎯 Board Lane State Mapping - Validation & UX Improvement

**Status:** To Be Implemented Later  
**Priority:** Medium  
**Affected Component:** `apps/web/src/components/board-settings-modal.tsx`

### Current Issue

When configuring board lanes, users can select "Mapped States" (e.g., To Do, In Progress, Done) for each lane. However, the current implementation allows the **same state to be mapped to multiple lanes**, causing:

- ❌ **Duplicate Tasks**: Tasks appear in multiple lanes if their state is mapped to multiple lanes
- ❌ **Confusing UX**: Users don't understand why tasks appear twice
- ❌ **No Validation**: System doesn't prevent or warn about overlapping state mappings

### Technical Details

**Code Location:** `apps/web/src/components/task-board.tsx:198-199`

```typescript
tasks={filteredWorkItems?.filter((item: any) =>
    lane.mappedStates.includes(item.stateId)
) || []}
```

**Problem:** Each lane filters ALL work items and shows those matching its mapped states. If two lanes map the same state, the task appears in both.

**Example of Problematic Configuration:**
```
Lane "Open"    → mappedStates: ["To Do", "In Progress"]
Lane "Working" → mappedStates: ["In Progress", "Testing"]
```
Result: Tasks with state "In Progress" appear in BOTH lanes! ❌

### Proposed Solutions

#### Option 1: Validation on Save ⭐ (Recommended)

Add validation before saving board configuration:

```typescript
// Before saving, check for duplicate state mappings
const allMappedStates = lanes.flatMap(lane => lane.mappedStates);
const duplicates = allMappedStates.filter((state, index) => 
    allMappedStates.indexOf(state) !== index
);

if (duplicates.length > 0) {
    toast.error("Each state can only be mapped to one lane!");
    return;
}
```

**Benefits:**
- ✅ Prevents duplicate mappings at save time
- ✅ Shows clear error message to user
- ✅ Simple implementation

**Implementation Steps:**
1. Add validation function in `board-settings-modal.tsx`
2. Call before `handleSave()`
3. Show error toast with duplicate state names
4. Highlight problematic lanes in UI

#### Option 2: Visual Indicators in UI

Enhance the Board Settings Modal to show:
- ⚠️ Which states are already mapped (grayed out or marked)
- ✅ Which states are still available
- ❌ Real-time error indication when duplicates are detected

**Benefits:**
- ✅ Prevents errors proactively
- ✅ Better user experience
- ✅ No surprises at save time

**Implementation Steps:**
1. Track used states across all lanes
2. Update state checkbox rendering to show availability
3. Add visual indicators (colors, icons)
4. Show warning badges on lanes with duplicates

#### Option 3: Exclusive State Assignment

Change from multi-select checkboxes to exclusive assignment (like radio buttons across lanes):
- Each state can only be selected in ONE lane
- Selecting a state in one lane automatically deselects it in others

**Benefits:**
- ✅ Impossible to create duplicates
- ✅ Clear mental model

**Drawbacks:**
- ⚠️ More complex UI interaction
- ⚠️ Requires significant refactoring

### Correct Usage Pattern

**✅ Good Configuration (N:1 Grouping):**
```
Lane "Backlog"     → ["Backlog"]
Lane "To Do"       → ["To Do"]
Lane "In Progress" → ["In Progress", "Code Review"]  // Multiple states in one lane = OK
Lane "Done"        → ["Done"]
```
Each state appears in exactly ONE lane. Multiple states can be grouped in a single lane.

**❌ Bad Configuration (1:N Overlap):**
```
Lane "Open"    → ["To Do", "In Progress"]
Lane "Working" → ["In Progress", "Testing"]  // "In Progress" appears twice = BAD
```

### Related Files

- `apps/web/src/components/board-settings-modal.tsx` - Lane configuration UI
- `apps/web/src/components/task-board.tsx` - Task rendering logic
- `packages/api/src/routers/board.ts` - Board/lane backend logic

### Acceptance Criteria

- [ ] Users cannot save a board configuration with duplicate state mappings
- [ ] Clear error message explains which states are duplicated
- [ ] UI shows which states are already assigned (optional enhancement)
- [ ] Documentation updated with correct usage pattern
- [ ] Tests added for validation logic

---

**Last Updated:** 2025-12-30  
**Next Review:** When board configuration becomes frequently used

---

## 🤖 AI SDK v6 Tool Schema Fix

**Status:** To Be Implemented Later  
**Priority:** High (blocks AI tool execution)  
**Affected Component:** `apps/server/src/index.ts`

### Current Issue

AI tools defined with `tool()` helper send invalid schema to OpenAI API:

**Error:**
```
AI_APICallError: Invalid schema for function 'create_bug_ticket': 
schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.
```

### Root Cause

**Location:** `apps/server/src/index.ts:91, 149`

```typescript
// Current problematic code:
create_organization: tool({
    description: "...",
    schema: z.object({...}),  // AI SDK v6 expects different property name?
    execute: async (...) => {...}
} as any),  // ❌ as any cast corrupts tool structure
```

**Problems:**
1. `as any` cast bypasses type checking and corrupts runtime object
2. Property name might be wrong (`schema` vs `parameters` vs `inputSchema`)
3. AI SDK v6 changed tool API - needs research
4. Tool object doesn't convert properly to OpenAI function calling format

### Why We Used `as any`

TypeScript errors:
```
error TS2769: No overload matches this call.
  Object literal may only specify known properties, 
  and 'schema' does not exist in type 'Tool<never, never>'.
```

We couldn't find correct property name/structure, so used `as any` to bypass - but this breaks runtime.

### Proposed Solution

1. **Research AI SDK v6 tool API:**
   - Check `node_modules/ai/dist/index.d.ts` for correct `tool()` signature
   - Look at official examples in Vercel AI SDK v6 docs
   - Find correct property names and structure

2. **Remove `as any` casts:**
   - Fix type errors properly
   - Ensure tool object structure matches OpenAI expectations

3. **Test with both tools:**
   - `create_organization` (simple)
   - `create_bug_ticket` (with optional fields)

### Workaround (Current)

Tools are defined but will fail at runtime when called. User sees error in AI response.

### Related Files

- `apps/server/src/index.ts` (lines 52-91, 92-149)
- AI SDK v6 migration notes

---

**Last Updated:** 2026-01-03  
**Next Review:** Before enabling AI features in production
