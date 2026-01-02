# Optimistic Updates & Query Keys - Comprehensive Audit & Fix Plan

**Datum:** 2026-01-02  
**Status:** Planning Phase  
**Priorität:** HIGH - Critical UX Issue

---

## 📋 Problem Statement

Das Projekt hat **inkonsistente Implementierung** von Optimistic Updates und Query Keys:

### Symptome:
- ✅ **TaskFormModal**: Korrekt implementiert (seit heute)
- ✅ **ListView**: Korrekt implementiert (seit heute)
- ✅ **TaskBoard**: Korrekt implementiert
- ✅ **ComponentEditor**: Korrekt implementiert
- ✅ **WorkflowStateEditor**: Korrekt implementiert
- ❌ **BacklogView**: Keine optimistic updates
- ❌ **CommentSection**: Keine optimistic updates
- ❌ **AttachmentList**: Keine optimistic updates
- ❌ **BoardSettingsModal**: Teilweise implementiert
- ❌ **DependencyManager**: Keine optimistic updates
- ❌ **Sprint Management**: Keine optimistic updates
- ❌ **Modal Components**: Keine optimistic updates (create-milestone, create-organization, etc.)

### Root Causes:
1. **Alte Implementierungen** verwenden nur `onSuccess` + `invalidateQueries`
2. **Keine onMutate hooks** für sofortige UI-Updates
3. **Fehlende onError rollbacks** bei Fehlern
4. **Inkonsistente Query Key Verwendung** (manche verwenden `.queryFilter()` statt `.queryOptions().queryKey`)

---

## 🎯 Ziele

1. **100% Optimistic Updates** - Alle Mutations zeigen sofortiges Feedback
2. **Konsistente Query Keys** - Alle verwenden `trpc.xxx.queryOptions().queryKey`
3. **Fehler-Rollback** - Bei Errors automatische Wiederherstellung
4. **Debug Logs** - Konsistentes Logging für Troubleshooting
5. **AGENTS.md Konformität** - Alle folgen dem dokumentierten Pattern

---

## 📊 Audit Results - Komponenten Status

### ✅ KORREKT IMPLEMENTIERT (7 Komponenten)

#### 1. **task-form-modal.tsx**
- **Status:** ✅ Vollständig korrekt
- **Mutations:** create, update, delete
- **Query Key:** ✅ `trpc.workItem.getAll.queryOptions({ projectId }).queryKey`
- **Optimistic:** ✅ onMutate mit create/update/delete logic
- **Rollback:** ✅ onError mit previousData restore
- **Details Handling:** ✅ Deep merge für details object

#### 2. **list-view.tsx**
- **Status:** ✅ Vollständig korrekt
- **Mutations:** bulkDelete, bulkUpdateState
- **Query Key:** ✅ `trpc.workItem.getAll.queryOptions({ projectId }).queryKey`
- **Optimistic:** ✅ Array filtering/mapping
- **Rollback:** ✅ Vorhanden

#### 3. **task-board.tsx**
- **Status:** ✅ Vollständig korrekt
- **Mutations:** updateState (drag & drop)
- **Query Key:** ✅ `trpc.workItem.getAll.queryOptions({ projectId }).queryKey`
- **Optimistic:** ✅ State update via map
- **Rollback:** ✅ Vorhanden

#### 4. **component-editor.tsx**
- **Status:** ✅ Vollständig korrekt
- **Mutations:** create, update, delete
- **Query Key:** ✅ `trpc.component.getByProject.queryOptions({ projectId }).queryKey`
- **Optimistic:** ✅ Alle drei Operationen
- **Rollback:** ✅ Vorhanden

#### 5. **workflow-state-editor.tsx**
- **Status:** ✅ Vollständig korrekt
- **Mutations:** create, update, updateColor, delete, reorder
- **Query Key:** ✅ `trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey`
- **Optimistic:** ✅ Umfangreich implementiert
- **Rollback:** ✅ Vorhanden

#### 6. **dependency-manager.tsx**
- **Status:** ✅ Korrekte Query Keys
- **Mutations:** create, delete
- **Query Key:** ✅ `trpc.workItem.getAll.queryOptions({ projectId }).queryKey`
- **Problem:** ❌ Nur invalidateQueries, kein optimistic update
- **Action:** Optimistic updates hinzufügen

#### 7. **attachment-list.tsx**
- **Status:** ⚠️ Nur Delete-Mutation analysiert
- **Mutation:** delete
- **Action:** Vollständige Analyse + Optimistic Updates

---

### ❌ FEHLERHAFT / UNVOLLSTÄNDIG (12+ Komponenten)

#### 8. **backlog-view.tsx**
- **Problem:** ❌ Keine optimistic updates
- **Mutation:** moveToSprint
- **Aktuell:** Nur `invalidateQueries` + toast
- **Fehlt:**
  - onMutate: Item aus backlog entfernen
  - onError: Item zurück zu backlog
  - Query Key: Verwendet `.queryFilter()` statt `.queryOptions().queryKey`
- **Impact:** User sieht Item im Backlog bis Refresh
- **Priorität:** HIGH

#### 9. **comment-section.tsx**
- **Problem:** ❌ Keine optimistic updates
- **Mutation:** create
- **Aktuell:** Nur `invalidateQueries` + toast
- **Fehlt:**
  - onMutate: Comment sofort anzeigen mit temp-ID
  - onError: Comment wieder entfernen
  - Query Key: Verwendet `.queryFilter()` statt `.queryOptions().queryKey`
- **Impact:** Comments erscheinen verzögert
- **Priorität:** MEDIUM

#### 10. **board-settings-modal.tsx**
- **Problem:** ⚠️ Teilweise implementiert
- **Mutations:** createBoard, updateBoard, deleteBoard, createLane, updateLane, deleteLane
- **Aktuell:** Manuell gebaute Query Keys + teilweise optimistic
- **Zu prüfen:**
  - Zeile 88-112: createBoard
  - Zeile 113-165: updateBoard
  - Zeile 166-179: deleteBoard
  - Zeile 180-242: updateLane (✅ hat optimistic!)
  - Zeile 243-401: deleteLane
  - Zeile 402-end: createLane
- **Action:** Vollständige Analyse + Standardisierung
- **Priorität:** MEDIUM

#### 11. **sprint-management.tsx**
- **Problem:** ❌ Keine optimistic updates
- **Mutations:** create, update
- **Fehlt:** onMutate, onError, proper query keys
- **Priorität:** MEDIUM

#### 12. **log-time-modal.tsx**
- **Problem:** ❌ Keine optimistic updates
- **Mutation:** create
- **Fehlt:** Komplettes optimistic pattern
- **Priorität:** LOW (weniger häufig verwendet)

#### 13-18. **Create Modals (6 Komponenten)**
- **create-milestone-modal.tsx**
- **create-organization-modal.tsx**
- **create-portfolio-modal.tsx**
- **create-project-modal.tsx**
- **Alle:** ❌ Keine optimistic updates
- **Fehlt:** onMutate für sofortiges Hinzufügen
- **Priorität:** MEDIUM (create operations sollten instant sein)

---

## 🔧 Implementation Plan

### Phase 1: Critical Fixes (HIGH Priority)

#### Step 1.1: BacklogView - Move to Sprint
**File:** `apps/web/src/components/backlog-view.tsx`

**Current:**
```typescript
const moveToSprintMutation = useMutation(
    trpc.workItem.moveToSprint.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.workItem.getAll.queryFilter({ projectId }));
            toast.success("Item moved to sprint");
        },
    }) as any
);
```

**Target:**
```typescript
const moveToSprintMutation = useMutation({
    mutationFn: async ({ id, sprintId }: { id: string; sprintId: string }) => {
        return await client.workItem.moveToSprint.mutate({ id, sprintId });
    },
    onMutate: async ({ id, sprintId }) => {
        const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
        await queryClient.cancelQueries({ queryKey });
        const previousItems = queryClient.getQueryData(queryKey);
        
        // Optimistically update item's sprintId
        queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return old.map((item: any) =>
                item.id === id ? { ...item, sprintId } : item
            );
        });
        
        console.log("[BacklogView] Optimistic moveToSprint:", { id, sprintId });
        return { previousItems };
    },
    onError: (err, _vars, context: any) => {
        const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
        if (context?.previousItems) {
            queryClient.setQueryData(queryKey, context.previousItems);
        }
        toast.error("Failed to move item to sprint");
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ 
            queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey 
        });
        toast.success("Item moved to sprint");
    },
});
```

**Changes Required:**
1. Import `useTRPCClient`
2. Get `client` instance
3. Add onMutate with optimistic update
4. Add onError with rollback
5. Fix query key to use `.queryOptions().queryKey`
6. Add console logs

---

#### Step 1.2: CommentSection - Create Comment
**File:** `apps/web/src/components/comment-section.tsx`

**Current:**
```typescript
const createMutation = useMutation(
    trpc.comment.create.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.comment.getByWorkItem.queryFilter({ workItemId }));
            setNewComment("");
            toast.success("Comment added");
        },
    })
);
```

**Target:**
```typescript
const createMutation = useMutation({
    mutationFn: async (data: { body: string; workItemId: string }) => {
        return await client.comment.create.mutate(data);
    },
    onMutate: async (newComment) => {
        const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
        await queryClient.cancelQueries({ queryKey });
        const previousComments = queryClient.getQueryData(queryKey);
        
        // Optimistically add comment
        queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            
            const tempId = `temp-${Date.now()}`;
            const now = new Date().toISOString();
            
            const optimisticComment = {
                id: tempId,
                body: newComment.body,
                workItemId: newComment.workItemId,
                userId: null, // Will be filled by server
                user: null, // Will be filled by refetch
                createdAt: now,
                updatedAt: now,
                sentimentScore: null,
                sentimentLabel: null,
            };
            
            console.log("[CommentSection] Optimistic create:", optimisticComment);
            return [...old, optimisticComment];
        });
        
        return { previousComments };
    },
    onError: (err, _data, context: any) => {
        const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
        if (context?.previousComments) {
            queryClient.setQueryData(queryKey, context.previousComments);
        }
        toast.error("Failed to add comment");
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ 
            queryKey: trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey 
        });
        setNewComment("");
        toast.success("Comment added");
    },
});
```

**Changes Required:**
1. Import `useTRPCClient`
2. Get `client` instance
3. Add onMutate with temp comment
4. Add onError with rollback
5. Fix query key
6. Add console logs

---

### Phase 2: Medium Priority Fixes

#### Step 2.1: DependencyManager - Add Optimistic Updates
**File:** `apps/web/src/components/dependency-manager.tsx`

**Status:** Query Keys korrekt, aber keine optimistic updates

**Mutations to fix:**
- create dependency
- delete dependency

**Pattern:** Wie CommentSection (add/remove from array)

---

#### Step 2.2: AttachmentList - Full Analysis + Optimistic
**File:** `apps/web/src/components/attachment-list.tsx`

**Action:** Vollständige Analyse + Implementierung

---

#### Step 2.3: SprintManagement - Add Optimistic Updates
**File:** `apps/web/src/components/sprint-management.tsx`

**Mutations:**
- create sprint
- update sprint

**Pattern:** Wie WorkflowStateEditor

---

#### Step 2.4: BoardSettingsModal - Standardize All Mutations
**File:** `apps/web/src/components/board-settings-modal.tsx`

**Action:** 
1. Analyse aller 6 Mutations
2. Standardisierung auf tRPC query keys
3. Komplette optimistic updates

---

### Phase 3: Create Modals (Lower Priority)

#### Step 3.1-3.6: Standardize Create Modals
**Files:**
- create-milestone-modal.tsx
- create-organization-modal.tsx
- create-portfolio-modal.tsx
- create-project-modal.tsx

**Pattern:** Optimistic add to list + temp-ID

---

### Phase 4: LogTimeModal
**File:** `apps/web/src/components/log-time-modal.tsx`

**Priority:** LOW (weniger kritisch für UX)

---

## 📝 Standard Pattern Template

Für alle zukünftigen Mutations:

```typescript
import { useTRPCClient } from "@/utils/trpc";

const client = useTRPCClient();
const queryClient = useQueryClient();

const mutation = useMutation({
    mutationFn: async (data) => {
        return await client.router.procedure.mutate(data);
    },
    onMutate: async (newData) => {
        // 1. Get correct query key
        const queryKey = trpc.router.query.queryOptions(input).queryKey;
        
        // 2. Cancel outgoing queries
        await queryClient.cancelQueries({ queryKey });
        
        // 3. Snapshot previous data
        const previousData = queryClient.getQueryData(queryKey);
        
        // 4. Optimistically update cache
        queryClient.setQueryData(queryKey, (old: any) => {
            // Your optimistic update logic
        });
        
        // 5. Log for debugging
        console.log("[Component] Optimistic mutation:", newData);
        
        // 6. Return context for rollback
        return { previousData };
    },
    onError: (err, _data, context: any) => {
        // 1. Get query key
        const queryKey = trpc.router.query.queryOptions(input).queryKey;
        
        // 2. Rollback to previous data
        if (context?.previousData) {
            queryClient.setQueryData(queryKey, context.previousData);
        }
        
        // 3. Log error
        console.error("[Component] Mutation error:", err);
        
        // 4. Show error toast
        toast.error("Operation failed");
    },
    onSuccess: () => {
        // 1. Invalidate to refetch fresh data
        queryClient.invalidateQueries({ 
            queryKey: trpc.router.query.queryOptions(input).queryKey 
        });
        
        // 2. Show success toast
        toast.success("Operation successful");
    },
});
```

---

## ✅ Checklist für jede Mutation

- [ ] Import `useTRPCClient` und get `client`
- [ ] Query Key: `trpc.xxx.queryOptions(input).queryKey`
- [ ] onMutate: Cancel queries + snapshot + optimistic update
- [ ] onError: Rollback + error toast + console.error
- [ ] onSuccess: Invalidate queries + success toast
- [ ] Console logs: `[ComponentName] Optimistic action`
- [ ] Context return: `{ previousData }`
- [ ] Proper temp-ID: `temp-${Date.now()}` für create
- [ ] Deep merge für nested objects (wie details)

---

## 🎯 Success Criteria

Nach Abschluss aller Phasen:

1. ✅ **100% Coverage**: Alle 25+ Mutations haben optimistic updates
2. ✅ **Query Key Consistency**: Alle verwenden `.queryOptions().queryKey`
3. ✅ **Error Recovery**: Alle haben onError rollback
4. ✅ **Debug Logs**: Konsistentes Logging-Pattern
5. ✅ **AGENTS.md Konformität**: Pattern dokumentiert und befolgt
6. ✅ **UX Improvement**: Keine verzögerten UI-Updates mehr

---

## 📊 Progress Tracking

### Phase 1 (High Priority) - 2/2 completed ✅
- [x] Step 1.1: BacklogView ✅ COMPLETED
- [x] Step 1.2: CommentSection ✅ COMPLETED

### Phase 2 (Medium Priority) - 3/4 completed
- [x] Step 2.1: DependencyManager ✅ COMPLETED
- [x] Step 2.2: AttachmentList ✅ COMPLETED
- [x] Step 2.3: SprintManagement ✅ COMPLETED
- [ ] Step 2.4: BoardSettingsModal

### Phase 3 (Create Modals) - 0/4 completed
- [ ] Step 3.1: create-milestone-modal
- [ ] Step 3.2: create-organization-modal
- [ ] Step 3.3: create-portfolio-modal
- [ ] Step 3.4: create-project-modal

### Phase 4 (Low Priority) - 0/1 completed
- [ ] Step 4.1: LogTimeModal

---

## 🚀 Execution Order

**Empfohlene Reihenfolge:**

1. **BacklogView** (häufig verwendet, kritisch)
2. **CommentSection** (häufig verwendet)
3. **DependencyManager** (wichtig für Task-Management)
4. **AttachmentList** (wichtig für Collaboration)
5. **BoardSettingsModal** (komplex, aber wichtig)
6. **SprintManagement** (Sprint-basierte Workflows)
7. **Create Modals** (batch processing möglich)
8. **LogTimeModal** (weniger kritisch)

---

## 📚 Related Documentation

- **AGENTS.md** Zeile 186-360: Optimistic Updates Pattern
- **AGENTS.md** Zeile 324-450: Query Key Best Practices
- **task-form-modal.tsx**: Reference Implementation
- **component-editor.tsx**: Reference Implementation
- **workflow-state-editor.tsx**: Complex Reference

---

**Next Action:** Start with Phase 1, Step 1.1 (BacklogView)
