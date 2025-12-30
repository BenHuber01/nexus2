# Nexus2 - Frontend Navigation & Feature Traceability

**Last Updated:** 2025-12-30  
**Purpose:** Document all frontend routes, navigation paths, and feature interactions

---

## 🗺️ Available Routes

### Authentication Routes

#### `/login`
- **Component:** `apps/web/src/routes/login.tsx`
- **Purpose:** User authentication
- **Features:**
  - Sign in form with email/password
  - Link to sign up
- **Navigation:**
  - After successful login → `/dashboard`

#### `/` (Landing Page)
- **Component:** `apps/web/src/routes/index.tsx`
- **Purpose:** Public landing page
- **Navigation:**
  - "Get Started" → `/login` or `/dashboard` (if authenticated)

---

### Main Application Routes

#### `/dashboard`
- **Component:** `apps/web/src/routes/dashboard.tsx`
- **Purpose:** Main dashboard showing all organizations and projects
- **Features:**
  - List all user's organizations
  - Display projects per organization
  - Quick access buttons per organization:
    - **"Teams"** → `/organizations/{orgId}/teams`
    - **"Settings"** → `/organizations/{orgId}/settings`
  - Create new organization button
- **Interactions:**
  - Click on project card → `/projects/{projectId}`
  - Click "+ New Project" → Opens CreateProjectModal
  - Click "Create Organization" → Opens CreateOrganizationModal

---

### Organization Routes

#### `/organizations/{organizationId}/teams`
- **Component:** `apps/web/src/routes/organizations.$organizationId.teams.tsx`
- **Purpose:** Team management for an organization
- **Features:**
  - Uses `TeamManagement` component
  - Create, edit, delete teams
  - View team members count
  - Manage team members
- **Navigation:**
  - From: Dashboard → Click "Teams" button
  - "Organization Settings" button → `/organizations/{orgId}/settings`
  - Click "Manage" on team → Opens TeamMemberSelector modal
- **Interactions:**
  - Click "Create Team" → Opens create team dialog
  - Click edit icon → Opens edit team dialog
  - Click "Manage" → Opens TeamMemberSelector modal

#### `/organizations/{organizationId}/settings`
- **Component:** `apps/web/src/routes/organizations.$organizationId.settings.tsx`
- **Purpose:** Organization settings with tabbed interface
- **Tabs:**
  1. **General** - Organization name and description
  2. **Members** - Organization member management
  3. **Teams** - Full team management (reuses TeamManagement component)
- **Features:**
  - Update organization details (name, description) ✅
  - Add/remove organization members
  - Change member roles (member/admin/owner)
  - Full team management capabilities
- **Backend Integration:**
  - Router: `packages/api/src/routers/organization.ts`
  - Procedures: `getById`, `update` (mutation)
  - **Optimistic Updates:** ✅
    - Organization updates are immediately visible in UI (onMutate)
    - Automatic rollback on error (onError)
  - **Console Logs:**
    - `[GeneralSettings] Optimistic update:` - Shows updated organization data
    - `[GeneralSettings] Update error:` - Logs errors if mutation fails
- **Navigation:**
  - From: Dashboard → Click "Settings" button
- **Interactions:**
  - General tab: Edit name/description → Click "Save Changes" → Updates immediately
  - Members tab: Click "Invite Member" → Shows invite form
  - Members tab: Change role dropdown → Updates member role
  - Members tab: Click X → Removes member
  - Teams tab: Same as `/organizations/{orgId}/teams`
- **Bug Fix (2025-12-30):**
  - **Problem:** TypeScript error "Property 'update' does not exist" on organization router
  - **Root Cause:** Missing `update` mutation procedure in organization router
  - **Solution:** Added `update` mutation with id, name, slug, description fields
  - **Enhancement:** Implemented optimistic updates for instant UI feedback

---

### Project Routes

#### `/projects/{projectId}`
- **Component:** `apps/web/src/routes/projects.$projectId.tsx`
- **Purpose:** Project detail page with multiple tabs
- **Tabs:**
  1. **Board** - Kanban/Scrum board with lanes
  2. **Backlog** - Product backlog view
  3. **Sprints** - Sprint management
  4. **Reports** - Project metrics (placeholder)
- **Features:**
  - Task board with drag-and-drop
  - Sprint planning
  - Backlog grooming
  - Work item management
- **Navigation:**
  - From: Dashboard → Click project card
- **Interactions:**
  - Click work item → Opens EditTaskModal
  - Board tab: Board selector dropdown
  - Board tab: Board settings icon → Opens BoardSettingsModal
  - Sprints tab: Sprint management operations

---

### AI Routes

#### `/ai`
- **Component:** `apps/web/src/routes/ai.tsx`
- **Purpose:** AI-powered chat interface
- **Features:**
  - Chat with Gemini AI
  - Context-aware assistance
- **Navigation:**
  - Header → "AI Chat" link

---

## 🎯 Key Components & Their Usage

### Modals

#### CreateTaskModal (ENHANCED)
- **File:** `apps/web/src/components/create-task-modal.tsx`
- **Triggered by:** Project board/backlog → "+ New Task" button
- **Tabs:**
  1. **General** - Title, description, type, priority, state, assignee, sprint, epic
  2. **Planning** - Story points, due date, estimated hours, remaining hours
  3. **Details** - Acceptance criteria, technical notes, reproduction steps, business value, user persona
- **Features:**
  - All fields from data model included
  - Tab-based organization matching EditTaskModal
  - Sprint and epic selection
  - Time tracking fields
  - Rich detail fields for requirements
- **Observable Changes:**
  - After creation → Task appears in selected sprint/backlog
  - All fields saved to database
  - Modal closes automatically on success

#### TeamMemberSelector
- **File:** `apps/web/src/components/team-member-selector.tsx`
- **Triggered by:** 
  - Teams route: Click "Manage" button on team card
  - Organization settings: Teams tab → Click "Manage"
- **Features:**
  - Add org members to team
  - Remove members from team
  - Search members
  - View member details with avatars

#### EditTaskModal
- **File:** `apps/web/src/components/edit-task-modal.tsx`
- **Triggered by:** Click on work item in board/backlog
- **Tabs:**
  1. **General** - Title, description, type, priority, assignee
  2. **Planning** - Story points, dates, hours
  3. **Details** - Acceptance criteria, technical notes
  4. **Dependencies** - Work item dependencies (NEW!)
- **Features:**
  - Full work item editing
  - Dependency management integrated
  - Time tracking
  - Rich text fields

#### DependencyManager (within EditTaskModal)
- **File:** `apps/web/src/components/dependency-manager.tsx`
- **Embedded in:** EditTaskModal → Dependencies tab
- **Features:**
  - Add dependencies (blocks, depends_on, relates_to, duplicates)
  - Remove dependencies
  - Visual state indicators (done/in-progress)
  - Categorized view (outgoing/incoming)
- **Interactions:**
  - Click "Add" → Shows dependency form
  - Select work item + dependency type → Creates link
  - Click X → Removes dependency

#### WorkflowStateEditor
- **File:** `apps/web/src/components/workflow-state-editor.tsx`
- **Not yet exposed in UI** (standalone component)
- **Planned for:** Project settings or board configuration
- **Features:**
  - Create custom workflow states
  - Color picker
  - WIP limits
  - Reorder states
  - Set initial/final flags

#### BoardSettingsModal (FIXED: Lane Management)
- **File:** `apps/web/src/components/board-settings-modal.tsx`
- **Triggered by:** Project board → Settings icon
- **Purpose:** Create and configure boards with lanes
- **Features:**
  - Board creation/editing (name, type: kanban/scrum, default flag)
  - Sprint association (optional)
  - **Lane management:**
    - Add lanes to existing boards ✅ (FIXED)
    - Configure lane properties (name, WIP limit, mapped states)
    - Reorder lanes with up/down buttons
    - Delete lanes
    - Expand/collapse lane settings
- **Bug Fix (2025-12-30):**
  - **Problem:** New lanes added to existing boards were not saved to database
  - **Root Cause:** `handleSave` function only updated board properties, not lanes
  - **Solution:** Now creates lanes without IDs (new lanes) for existing boards
  - **Optimistic Updates Added:** ✅
    - Lane updates are immediately visible in UI (onMutate)
    - Lane deletes are immediately visible in UI (onMutate)
    - Board updates are immediately visible in UI (onMutate)
    - Automatic rollback on error (onError)
  - **Console Logs:**
    - `[BoardSettings] Adding new lane:` - When clicking "Add Lane"
    - `[BoardSettings] Saving board. BoardId: ... Lanes: ...` - When saving
    - `[BoardSettings] New lanes to create:` - Shows which lanes will be created
    - `[BoardSettings] Creating lane for existing board:` - Per lane creation
    - `[BoardSettings] Optimistic lane update:` - Optimistic update applied
    - `[BoardSettings] Optimistic lane delete:` - Optimistic delete applied
    - `[BoardSettings] Optimistic board update:` - Optimistic board update applied
- **Data Model Alignment:**
  - Board ↔ BoardLane: One-to-many relationship ✅
  - BoardLane has cascading delete on Board ✅
  - Lanes reference Board via `boardId` ✅
  - All required fields (name, position, mappedStates) properly handled ✅
- **Observable Changes:**
  - ⚡ **Instant UI Updates:** Changes are visible immediately (optimistic updates)
  - New lanes appear instantly when editing lane properties
  - Lane deletions happen instantly in the UI
  - Board name/settings changes reflect immediately
  - ✅ Success toasts confirm server persistence
  - ❌ Automatic rollback if server errors occur
  - Console logs help debug the lane creation and update process
  - WIP limits per lane
  - State mapping to lanes

---

## 📊 Phase 2 Implementation Status

### ✅ Completed Features

1. **Team Management** (Steps 2.1)
   - Route: `/organizations/{orgId}/teams` ✅
   - Component: `team-management.tsx` ✅
   - Component: `team-member-selector.tsx` ✅
   - Dashboard integration ✅

2. **Dependency Manager** (Step 2.2)
   - Component: `dependency-manager.tsx` ✅
   - Integrated into EditTaskModal ✅

3. **Workflow State Editor** (Step 2.3)
   - Component: `workflow-state-editor.tsx` ✅
   - ⚠️ Not yet exposed in UI (needs integration)

4. **Organization Settings** (Step 2.4)
   - Route: `/organizations/{orgId}/settings` ✅
   - Member management ✅
   - Team management integration ✅
   - Dashboard navigation ✅

---

## 🎮 User Flows

### Flow 1: Creating and Managing a Team

1. **Start:** `/dashboard`
2. **Navigate:** Click "Teams" button for desired organization
3. **Arrive:** `/organizations/{orgId}/teams`
4. **Create Team:**
   - Click "Create Team" button
   - Fill in team name and description
   - Click "Create Team"
   - ✅ Team appears in grid
5. **Add Members:**
   - Click "Manage" on team card
   - TeamMemberSelector modal opens
   - Select user from dropdown
   - Click "Add"
   - ✅ Member added to team
6. **Edit Team:**
   - Click edit icon on team card
   - Modify name/description
   - Click "Update Team"
   - ✅ Changes saved

### Flow 2: Managing Work Item Dependencies

1. **Start:** `/projects/{projectId}` (Board or Backlog tab)
2. **Open Work Item:** Click on any work item card
3. **EditTaskModal opens** with 4 tabs
4. **Navigate:** Click "Dependencies" tab
5. **Add Dependency:**
   - Click "Add" button
   - Select target work item
   - Choose dependency type (blocks/depends_on/relates_to/duplicates)
   - Optional: Add description
   - Click "Add Dependency"
   - ✅ Dependency appears in list
6. **View Dependencies:**
   - See "This item affects:" section (outgoing)
   - See "This item is affected by:" section (incoming)
   - Visual state indicators show if blocking items are done/in-progress
7. **Remove Dependency:**
   - Click X button on dependency
   - Confirm
   - ✅ Dependency removed

### Flow 3: Organization Member Management

1. **Start:** `/dashboard`
2. **Navigate:** Click "Settings" button for organization
3. **Arrive:** `/organizations/{orgId}/settings`
4. **Click:** "Members" tab
5. **View Members:** See all organization members with roles
6. **Change Role:**
   - Click role dropdown for member
   - Select new role (member/admin/owner)
   - ✅ Role updated immediately
7. **Remove Member:**
   - Click X button
   - Confirm
   - ✅ Member removed (with safety checks for last admin)

---

## 🔍 Observable Changes & Debugging

### Console Logs to Monitor

When testing features, watch for these console outputs:

1. **Team Operations:**
   - Team created/updated/deleted confirmations
   - Member add/remove operations
   
2. **Dependency Operations:**
   - Dependency created/deleted
   - Query invalidations

3. **Network Requests:**
   - tRPC calls to backend
   - Mutation success/error responses

### Expected UI Updates

1. **After Creating Team:**
   - Team card appears in grid
   - Member count shows 0
   
2. **After Adding Dependency:**
   - Dependency appears in categorized list
   - State icon shows current status
   
3. **After Changing Member Role:**
   - Dropdown shows new role immediately
   - No page reload needed

---

## 🚀 Next Steps

### To Access New Features:

1. **Team Management:**
   ```
   Dashboard → Click "Teams" button → Create/manage teams
   ```

2. **Dependencies:**
   ```
   Project → Click work item → Dependencies tab → Add dependencies
   ```

3. **Organization Settings:**
   ```
   Dashboard → Click "Settings" button → Manage org/members/teams
   ```

### Missing UI Integration:

- **WorkflowStateEditor:** Needs to be exposed in:
  - Project settings page (to be created)
  - Or board configuration modal

---

**End of Navigation Guide**
