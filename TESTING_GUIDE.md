# Testing Guide - How to Verify Implementations

**Purpose:** Step-by-step instructions for testing each backend feature in the frontend/browser

**Last Updated:** 2025-12-30

---

## 🧪 Testing Prerequisites

### Setup Required

1. **Start the development servers:**
```bash
cd /Users/it-admin/z-dev/nexus2
bun run dev
```

This starts:
- Backend: http://localhost:3000
- Frontend: http://localhost:3001

2. **Open Prisma Studio (optional but helpful):**
```bash
bun run db:studio
```
Opens: http://localhost:5555

3. **Open browser DevTools:**
- Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac)
- Go to **Console** tab to see logs
- Go to **Network** tab to see API calls

---

## ✅ Phase 1.1: Dependency Router

**Implementation:** Work item dependency management (blocks, relates_to, depends_on, duplicates)

### 🎯 What Was Implemented

**Backend Routes:**
- `dependency.getByWorkItem` - Get all dependencies for a work item
- `dependency.getBlockingItems` - Get items blocking this work item
- `dependency.getBlockedByItems` - Get items blocked by this work item
- `dependency.create` - Create a new dependency
- `dependency.update` - Update dependency type/description
- `dependency.delete` - Remove a dependency

### 🧪 How to Test (Manual Testing Required - No UI Yet!)

**Step 1: Access tRPC in Browser Console**

1. Open browser: http://localhost:3001
2. Sign in to your account
3. Navigate to any project
4. Open browser DevTools Console (`F12`)

**Step 2: Test via Browser Console**

```javascript
// Get the tRPC client from the page context
// (This assumes the app exposes trpc client globally, or you'll need to use Network tab)

// Instead, we'll use the Network tab to verify API calls
```

**Step 3: Test with Prisma Studio (Recommended)**

1. Open Prisma Studio: http://localhost:5555
2. Go to **Dependency** table
3. Click **Add record**
4. Fill in fields:
   ```
   sourceItemId: <copy-work-item-id-from-WorkItem-table>
   targetItemId: <copy-another-work-item-id>
   dependencyType: "blocks"
   description: "Testing dependency"
   ```
5. Click **Save**
6. Verify the record appears in the table

**Step 4: Verify with Network Tab**

Since there's no UI component yet, we can verify the router is accessible:

1. Open browser: http://localhost:3001
2. Open DevTools → **Network** tab
3. Navigate to a project with work items
4. In Console, type:
   ```javascript
   // This will fail gracefully but shows the endpoint exists
   fetch('http://localhost:3000/trpc/dependency.getByWorkItem?input={"workItemId":"test"}')
     .then(r => r.json())
     .then(console.log)
   ```
5. Check Network tab - you should see the request to `/trpc/dependency.getByWorkItem`

### ✅ Success Criteria

- ✅ Prisma Studio shows Dependency table is accessible
- ✅ Can manually create dependencies in Prisma Studio
- ✅ Network requests to dependency endpoints return responses (not 404)
- ✅ Backend TypeScript compiles without errors

### ⏭️ Next Steps (Frontend Implementation Needed)

**To actually use this feature, we need to create:**
- `dependency-manager.tsx` component (Phase 2.2)
- Add to `edit-task-modal.tsx` 
- Show blocking/blocked indicators on work items

**Where it will appear:**
- In work item detail modal/page
- Visual indicator on kanban cards showing blocked status
- Dependency graph visualization (future enhancement)

---

## ✅ Phase 1.2: WorkItemState Router

**Implementation:** Custom workflow state management for projects

### 🎯 What Was Implemented

**Backend Routes:**
- `workItemState.getByProject` - Get all states for a project
- `workItemState.getById` - Get single state with work item count
- `workItemState.create` - Create new workflow state
- `workItemState.update` - Update state properties
- `workItemState.delete` - Delete state (with validation)
- `workItemState.reorder` - Reorder states (drag-and-drop support)
- `workItemState.getInitialState` - Get initial state for new items
- `workItemState.getFinalStates` - Get completion states
- `workItemState.getByCategory` - Filter states by category

### 🧪 How to Test

**Current Implementation Status:**
- ✅ Backend router fully implemented
- ✅ States are already being used by existing board
- ⚠️ No UI for CRUD operations yet (uses default states)

**Step 1: Verify Default States (Already Working)**

1. Open browser: http://localhost:3001
2. Sign in to your account
3. Navigate to **Dashboard**
4. Create a new project (or open existing)
5. Go to **Board** tab

**What you should see:**
- Default states: "Todo", "In Progress", "Done"
- These were auto-created when the project was created
- Work items can be moved between these states

**Step 2: Verify States in Prisma Studio**

1. Open Prisma Studio: http://localhost:5555
2. Go to **WorkItemState** table
3. You should see:
   - States for each project
   - `position` field (0, 1, 2)
   - `category` (TODO, IN_PROGRESS, DONE)
   - `isInitial` and `isFinal` flags

**Step 3: Test State Queries via Browser Console**

1. Open project page: http://localhost:3001/projects/{projectId}
2. Open DevTools Console
3. Get the project ID from URL
4. Test in Console:

```javascript
// Check if states are loading
// Look at Network tab for: /trpc/board.getStatesForProject

// You should see the API call when the board loads
// Filter Network tab by: "getStatesForProject"
```

**Step 4: Verify State Categories**

1. In Prisma Studio → **WorkItemState** table
2. Check the `category` column shows:
   - `TODO` for "Todo" state
   - `IN_PROGRESS` for "In Progress" state  
   - `DONE` for "Done" state

**Step 5: Test Create State (Manual - Prisma Studio)**

1. Open Prisma Studio: http://localhost:5555
2. Go to **WorkItemState** table
3. Click **Add record**
4. Fill in:
   ```
   projectId: <copy-from-existing-state>
   name: "Code Review"
   category: "IN_PROGRESS"
   position: 1
   color: "#3B82F6"
   isInitial: false
   isFinal: false
   ```
5. Click **Save**
6. Refresh the project board in browser
7. The new state should appear in board lanes

**Step 6: Test WIP Limits (Manual)**

1. Add a state with WIP limit in Prisma Studio:
   ```
   name: "Testing"
   wipLimit: 3
   ```
2. Note: WIP limit enforcement requires frontend implementation

### ✅ Success Criteria

- ✅ Default states appear on project boards
- ✅ States are ordered by position
- ✅ Can create states in Prisma Studio
- ✅ States appear in board UI after creation
- ✅ Only one state has `isInitial: true` per project
- ✅ Only one state has `isFinal: true` per project

### ⏭️ Next Steps (Frontend Implementation Needed)

**To fully use this feature, we need to create:**
- `workflow-state-editor.tsx` component (Phase 2.3)
- Add to Project Settings page
- Drag-and-drop reordering UI
- WIP limit visualization
- State color picker

**Where it will appear:**
- **Project Settings → Workflow tab**
- Click "Settings" button on project page
- Manage custom workflow states
- Set WIP limits per column
- Choose colors and icons

**User Flow (Future):**
```
1. Navigate to Project
2. Click "Settings" button (top-right)
3. Click "Workflow" tab
4. See list of current states
5. Click "Add State" button
6. Fill in form:
   - Name: "Code Review"
   - Category: In Progress
   - Color: Blue
   - WIP Limit: 5
7. Drag states to reorder
8. Click "Save"
9. Return to board → see new state as a column
```

---

## 🎯 Phase 1.3: Team CRUD Mutations (Coming Next)

**Implementation:** Create, Update, Delete teams

### 🧪 How to Test (Once Implemented)

**Current Status:**
- ✅ Can READ teams (`team.getAll`, `team.getById`)
- ⏳ Cannot CREATE/UPDATE/DELETE yet

**Step 1: Verify Current Team Reading**

1. Open Prisma Studio: http://localhost:5555
2. Manually create a team:
   - Go to **Team** table
   - Add record:
     ```
     name: "Backend Team"
     organizationId: <copy-from-Organization-table>
     description: "Backend developers"
     ```
3. Navigate to organization page (when UI exists)
4. Team should appear in team list

**Step 2: Test Create Team (After Implementation)**

Will be tested via:
- Organization settings page
- "Create Team" button
- Fill in team name, description
- Verify team appears in list

**Step 3: Test Update Team (After Implementation)**

Will be tested via:
- Click team in list
- Edit name/description
- Save changes
- Verify updates persist

**Step 4: Test Delete Team (After Implementation)**

Will be tested via:
- Click team in list
- Click "Delete" button
- Confirm deletion
- Verify team removed from list

---

## 📊 Testing Checklist Template

For each new router implementation, use this checklist:

### Backend Verification
- [ ] TypeScript compilation passes (`bun run check-types`)
- [ ] Router registered in `appRouter`
- [ ] Procedures are accessible via Network tab
- [ ] No console errors in browser

### Database Verification (Prisma Studio)
- [ ] Can view related table data
- [ ] Can manually create records
- [ ] Relationships are correct (foreign keys work)
- [ ] Constraints are enforced (unique, required fields)

### Frontend Verification (Once UI Exists)
- [ ] UI component renders without errors
- [ ] Can perform CRUD operations
- [ ] Success/error messages appear
- [ ] Data persists after page reload
- [ ] Loading states work correctly

### Network Tab Verification
- [ ] API calls appear in Network tab
- [ ] Request payload is correct
- [ ] Response data is correct
- [ ] Status codes are appropriate (200, 201, 400, 404, etc.)

### Console Log Verification
- [ ] No errors in browser console
- [ ] No TypeScript errors in terminal
- [ ] Expected log messages appear (if any)

---

## 🔧 Troubleshooting Common Issues

### Issue: "Cannot read property 'mutate' of undefined"

**Solution:**
```typescript
// ❌ Wrong
const trpc = useTRPC();
await trpc.dependency.create.mutate(data);

// ✅ Correct
const client = useTRPCClient();
await client.dependency.create.mutate(data);
```

### Issue: Network request returns 404

**Possible causes:**
1. Router not registered in `appRouter`
2. Server not restarted after code changes
3. Wrong endpoint name

**Solution:**
```bash
# Restart dev server
pkill -f "bun run"
bun run dev
```

### Issue: "Table does not exist" error

**Solution:**
```bash
cd packages/db
bunx prisma db push
```

### Issue: Can't see new data in frontend

**Possible causes:**
1. React Query cache not invalidated
2. Data not refetching

**Solution:**
```typescript
// In mutation's onSuccess:
queryClient.invalidateQueries({ queryKey: ["dependency"] });
```

---

## 📝 Testing Notes

### General Testing Workflow

For each feature implementation:

1. **Backend Test (Prisma Studio)**
   - Verify table exists
   - Manually create test data
   - Verify relationships work

2. **API Test (Network Tab)**
   - Open browser DevTools
   - Navigate to relevant page
   - Watch for API calls
   - Verify request/response

3. **Frontend Test (UI)**
   - Once component exists
   - Test all CRUD operations
   - Verify error handling
   - Check loading states

4. **Console Test (Browser Console)**
   - Check for errors
   - Verify event handlers fire
   - Test with manual fetch calls

### Testing Priority

1. 🔴 **High Priority** - Core features (CRUD operations)
2. 🟡 **Medium Priority** - Edge cases (validation, errors)
3. 🟢 **Low Priority** - Nice-to-have (animations, polish)

---

## 🎯 Quick Reference

### URLs
- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:3000
- **Prisma Studio:** http://localhost:5555

### Common Commands
```bash
# Start dev servers
bun run dev

# Start Prisma Studio
bun run db:studio

# Check types
bun run check-types

# View git commits
git log --oneline -10
```

### DevTools Shortcuts
- **Open DevTools:** `F12` or `Cmd+Option+I` (Mac)
- **Console:** `Cmd+Option+J` (Mac) / `Ctrl+Shift+J` (Win)
- **Network:** `Cmd+Option+N` (Mac) / `Ctrl+Shift+E` (Win)

---

**Last Updated:** 2025-12-30  
**Status:** Living document - updated with each implementation  
**Next Update:** After Phase 1.3 (Team CRUD) implementation
