# Persistent Optimistic Updates Blueprint

## Problem Statement

When creating new entities (lanes, tasks, etc.) in a modal/form, there's a complex flow:
1. User adds entity → local state update
2. User clicks Save → backend mutation
3. Optimistic update adds temp entity to cache
4. Server returns real entity with ID
5. Need to replace temp with real without duplicates or missing IDs

## Core Challenge: Temp ID → Real ID Transition

**Issue:** New lanes created in modal have no ID initially, then get temp-ID in optimistic update, then real ID from server. This creates:
- Duplicate lanes (temp + real)
- Lanes without IDs (`undefined`)
- dnd-kit failing (no valid droppable ID)

## Solution Architecture

### 1. Optimistic Update Pattern (onMutate)

```typescript
onMutate: async (newLaneData) => {
    const queryKey = trpc.board.getById.queryOptions({ id: boardId }).queryKey;
    
    await queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);
    
    // Create temp entity with unique temp ID
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempLane = { id: tempId, ...newLaneData };
    
    // Add to cache
    queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        lanes: [...old.lanes, tempLane]
    }));
    
    return { previousData }; // For rollback
}
```

**Key Points:**
- Always create temp ID (don't rely on undefined)
- Use timestamp + random for uniqueness
- Store previous data for error rollback

### 2. Success Handler - Replace Temp with Real

```typescript
onSuccess: (realLane, newLaneData) => {
    queryClient.setQueryData(queryKey, (old: any) => {
        // CRITICAL: Filter out both undefined IDs AND temp IDs
        const filteredLanes = old.lanes.filter((lane: any) => {
            // Remove lanes without ID
            if (!lane.id) return false;
            
            // Remove temp lanes matching name/position
            if (lane.id.startsWith('temp-') && 
                lane.name === newLaneData.name && 
                lane.position === newLaneData.position) {
                return false;
            }
            
            return true;
        });
        
        // Add real lane and sort by position
        return {
            ...old,
            lanes: [...filteredLanes, realLane].sort((a, b) => a.position - b.position)
        };
    });
    
    // DON'T invalidate here - manual replacement is complete
    // queryClient.invalidateQueries({ queryKey: ["board"] });
}
```

**Key Points:**
- Filter `!lane.id` catches undefined/null
- Match temp lanes by business logic (name + position)
- Sort after adding to maintain order
- **NO invalidateQueries** - prevents duplicate fetch

### 3. Avoid Duplicate Optimistic Updates

**Problem:** If `handleUpdateLane` already updates cache, don't also do it in mutation's `onMutate`.

**Solution:**
```typescript
// In component handler
const handleUpdateLane = (index: number, updates: Partial<Lane>) => {
    setLanes(updatedLanes); // Local state
    
    // Immediate cache update
    queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        lanes: old.lanes.map(lane => 
            lane.id === targetLaneId ? { ...lane, ...updates } : lane
        )
    }));
    
    // Then backend
    updateLaneMutation.mutate({ id, ...updates });
};

// Mutation: NO onMutate needed!
const updateLaneMutation = useMutation({
    mutationFn: async (data) => client.board.updateLane.mutate(data),
    onError: (err) => {
        toast.error("Failed");
        // Cache already updated, let invalidate fix it
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["board"] });
    },
});
```

**Why:** Double cache update = race condition. Handler updates immediately, mutation just persists.

## Query Key Consistency

**CRITICAL:** Always use tRPC-generated query keys, never manual arrays.

```typescript
// ❌ WRONG - manual key doesn't match tRPC internal format
const queryKey = ["board", "getById", { id: boardId }];

// ✅ CORRECT - exact key tRPC uses
const queryKey = trpc.board.getById.queryOptions({ id: boardId }).queryKey;
```

**Why:** tRPC uses internal format. Manual keys → cache updates go to wrong location → views don't update.

## Complete Lane Creation Flow

```
1. User clicks "Add Lane"
   → handleAddLane() adds lane to local state (no ID)

2. User configures name, mappedStates

3. User clicks "Save"
   → handleSave() calls createLaneMutation.mutateAsync()

4. createLaneMutation.onMutate
   → Generates temp-xyz ID
   → Adds temp lane to cache
   → UI shows new lane immediately

5. Backend creates lane, returns real ID

6. createLaneMutation.onSuccess
   → Filters out undefined IDs
   → Filters out temp-xyz matching name/position
   → Adds real lane
   → Sorts by position
   → NO invalidate (prevents duplicate)

7. User closes modal
   → Board view has real lane with real ID
   → dnd-kit registers droppable zone
   → Drag & drop works immediately
```

## Debugging Checklist

When new entities don't work without reload:

1. **Check console logs:**
   - Does entity have real ID after creation?
   - Are there duplicates (temp + real)?
   - Are there entities with `id: undefined`?

2. **Check cache updates:**
   - Does `onSuccess` filter correctly?
   - Is sorting applied after adding?
   - Is `invalidateQueries` causing extra fetch?

3. **Check query keys:**
   - Using `trpc.xxx.queryOptions().queryKey`?
   - Same key in mutations and components?

4. **Check React keys:**
   - Components use `key={entity.id}`?
   - Will remount when ID changes temp→real?

## Anti-Patterns to Avoid

❌ **Relying on undefined IDs**
```typescript
const newLane = { name: "Test" }; // No ID!
```

❌ **Manual query keys**
```typescript
const key = ["board", boardId];
```

❌ **Invalidate after manual cache update**
```typescript
queryClient.setQueryData(key, newData);
queryClient.invalidateQueries({ queryKey: ["board"] }); // Duplicate fetch!
```

❌ **Double optimistic updates**
```typescript
handleUpdate → updates cache
mutation.onMutate → updates cache again // Race condition!
```

❌ **Filtering only temp- prefix**
```typescript
lanes.filter(l => !l.id?.startsWith('temp-')) // Misses undefined!
```

## Best Practices

✅ Always generate temp IDs: `temp-${Date.now()}-${Math.random()}`

✅ Filter both undefined AND temp in success handler

✅ Sort entities after adding to maintain order

✅ Use tRPC query key helpers for consistency

✅ Update cache once per user action (not in both handler and mutation)

✅ Only invalidate when you don't manually update cache

✅ Use business logic (name + position) to match temp entities

✅ Console log before/after cache updates for debugging

## File Reference

**Implementation:**
- `/apps/web/src/components/board-settings-modal.tsx`
  - `createLaneMutation` (lines 492-603)
  - `handleUpdateLane` (lines 375-419)
  
**Pattern applies to:**
- Any modal/form creating new entities
- Any optimistic update flow
- Any temp ID → real ID transition
