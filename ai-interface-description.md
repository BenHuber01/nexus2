# AI Interface Description - Nexus2 System

## Overview

This document describes all interfaces, APIs, and integration points in Nexus2 that AI systems can leverage for intelligent automation and enhancement. It serves as a technical specification for AI tooling integration.

---

## 1. tRPC API Endpoints

### Base Configuration
- **Protocol**: HTTP/HTTPS with tRPC
- **Base URL**: `http://localhost:3000/trpc` (development)
- **Authentication**: Session-based (cookies)
- **Serialization**: SuperJSON (supports Date objects)
- **Batching**: Supported via `httpBatchLink`

### 1.1 WorkItem Router (`workItem.*`)

#### `workItem.getAll`
**Purpose**: Retrieve all work items for a project
```typescript
Input: { projectId: string }
Output: WorkItem[] // Array of work items with relations
```

**Relations Included**:
- `assignee`: User object
- `state`: WorkItemState
- `sprint`: Sprint
- `details`: WorkItemDetail
- `components`: ComponentOnWorkItem[] with component details
- `project`: { id, key, name }

**AI Use Cases**:
- Training data for task classification
- Historical task analysis
- Pattern recognition for similar tasks

---

#### `workItem.getById`
**Purpose**: Get detailed work item by ID
```typescript
Input: { id: string }
Output: WorkItem // Full work item with all relations
```

**Relations Included**:
- All from `getAll` plus:
- `creator`: User
- `comments`: Comment[] with user
- `attachments`: Attachment[]
- `parent`, `children`, `epic`, `stories`

**AI Use Cases**:
- Context retrieval for AI assistants
- Deep task analysis
- Dependency graph construction

---

#### `workItem.create`
**Purpose**: Create new work item
```typescript
Input: {
  title: string
  description?: string
  type: WorkItemType // EPIC | FEATURE | STORY | BUG | TASK | SUB_TASK
  priority: Priority // CRITICAL | HIGH | MEDIUM | LOW
  projectId: string
  stateId?: string
  assigneeId?: string | null
  sprintId?: string | null
  epicId?: string | null
  parentId?: string | null
  storyPoints?: number | null
  estimatedHours?: number | null
  remainingHours?: number | null
  dueDate?: Date | null
  componentIds?: string[]
  details?: {
    acceptanceCriteria?: string | null
    technicalNotes?: string | null
    reproSteps?: string | null
    businessValue?: string | null
    userPersona?: string | null
  }
}
Output: WorkItem // Created work item
```

**AI Use Cases**:
- **Automated task creation** from natural language
- **Meeting notes → tasks** conversion
- **Epic breakdown** into stories/tasks
- **Bug report** auto-structuring

**AI Integration Example**:
```typescript
// AI parses: "We need to fix the login timeout bug"
await client.workItem.create.mutate({
  title: "Fix login session timeout issue",
  type: "BUG",
  priority: "HIGH",
  projectId: currentProject,
  description: "Users are being logged out after 5 minutes of inactivity",
  details: {
    reproSteps: "1. Login\n2. Wait 5 minutes\n3. Try to navigate",
    technicalNotes: "Investigate session management and JWT expiration"
  },
  estimatedHours: 8,
  componentIds: ["auth-component-id"]
})
```

---

#### `workItem.update`
**Purpose**: Update existing work item
```typescript
Input: {
  id: string
  title?: string
  description?: string
  type?: WorkItemType
  priority?: Priority
  stateId?: string
  assigneeId?: string | null
  sprintId?: string | null
  epicId?: string | null
  parentId?: string | null
  storyPoints?: number
  estimatedHours?: number
  remainingHours?: number
  dueDate?: Date | null
  order?: number
  componentIds?: string[]
  details?: {
    acceptanceCriteria?: string | null
    technicalNotes?: string | null
    reproSteps?: string | null
    businessValue?: string | null
    userPersona?: string | null
  }
}
Output: WorkItem // Updated work item
```

**AI Use Cases**:
- **Auto-enrichment** of task details
- **Smart field completion** (missing acceptance criteria)
- **Automated status updates** based on activity
- **Estimation refinement** based on progress

---

#### `workItem.updateState`
**Purpose**: Move work item to different state
```typescript
Input: { id: string, stateId: string }
Output: WorkItem
```

**AI Use Cases**:
- **Automated workflow transitions**
- **Bulk state updates** based on criteria
- **Smart reminders** for stale tasks

---

#### `workItem.delete`
**Purpose**: Delete work item (cascades to related data)
```typescript
Input: { id: string }
Output: WorkItem // Deleted item
```

---

#### `workItem.getByAssignee`
**Purpose**: Get tasks assigned to specific user
```typescript
Input: { userId: string, limit?: number }
Output: WorkItem[] // Non-DONE tasks, ordered by priority/dueDate
```

**AI Use Cases**:
- **Workload analysis**
- **Capacity planning**
- **Personalized task recommendations**

---

#### `workItem.getUpcoming`
**Purpose**: Get tasks due soon
```typescript
Input: { userId: string, days?: number }
Output: WorkItem[] // Tasks due within X days
```

**AI Use Cases**:
- **Deadline alerts**
- **Priority suggestions**
- **Schedule optimization**

---

#### `workItem.getEpics`
**Purpose**: Get all epics for a project
```typescript
Input: { projectId: string }
Output: WorkItem[] // Only EPIC type items
```

**AI Use Cases**:
- **Epic-level planning**
- **Roadmap generation**

---

#### `workItem.moveToSprint`
**Purpose**: Assign work item to sprint
```typescript
Input: { id: string, sprintId: string }
Output: WorkItem
```

---

#### `workItem.moveToBacklog`
**Purpose**: Remove work item from sprint
```typescript
Input: { id: string }
Output: WorkItem
```

---

### 1.2 Sprint Router (`sprint.*`)

#### `sprint.getAll`
**Purpose**: Get all sprints for project
```typescript
Input: { projectId: string }
Output: Sprint[]
```

**Relations**: `project` (id, name, key)

---

#### `sprint.getById`
**Purpose**: Get sprint with details
```typescript
Input: { id: string }
Output: Sprint
```

**Relations**: `project`, `workItems`, `retrospectives`

---

#### `sprint.getActive`
**Purpose**: Get active sprints with task statistics
```typescript
Input: { limit?: number }
Output: Array<{
  ...Sprint
  stats: {
    total: number
    todo: number
    inProgress: number
    done: number
  }
}>
```

**AI Use Cases**:
- **Sprint health monitoring**
- **Velocity prediction**
- **Capacity planning**
- **Risk assessment**

---

#### `sprint.create`
**Purpose**: Create new sprint
```typescript
Input: {
  name: string
  goal?: string
  startDate: Date
  endDate: Date
  projectId: string
  state?: "planned" | "active" | "completed"
}
Output: Sprint
```

**AI Use Cases**:
- **Automated sprint creation** based on patterns
- **Goal generation** from backlog analysis

---

#### `sprint.update`
**Purpose**: Update sprint details
```typescript
Input: {
  id: string
  name?: string
  goal?: string
  startDate?: Date
  endDate?: Date
  state?: "planned" | "active" | "completed"
}
Output: Sprint
```

---

#### `sprint.start`
**Purpose**: Mark sprint as active
```typescript
Input: { id: string }
Output: Sprint
```

---

#### `sprint.complete`
**Purpose**: Complete sprint
```typescript
Input: { id: string }
Output: Sprint
```

**AI Use Cases**:
- **Automated sprint closure** after end date
- **Retrospective data preparation**

---

### 1.3 Dashboard Router (`dashboard.*`)

#### `dashboard.getStats`
**Purpose**: Get user dashboard statistics
```typescript
Input: None (uses session user)
Output: {
  openTasksCount: number
  dueThisWeekCount: number
  activeSprintsCount: number
  recentCommentsCount: number
}
```

**AI Use Cases**:
- **Personalized dashboards**
- **Workload indicators**
- **Alert triggers**

---

### 1.4 Activity Router (`activity.*`)

#### `activity.getRecent`
**Purpose**: Get recent activity timeline
```typescript
Input: { limit?: number }
Output: Array<{
  id: string
  type: "state_change" | "assignment" | "completion" | "comment"
  actor: { id, name, avatarUrl }
  target: {
    id: string
    title: string
    project: { key, name }
  }
  metadata: any
  createdAt: Date
}>
```

**AI Use Cases**:
- **Activity pattern analysis**
- **Collaboration network mapping**
- **Productivity insights**
- **Anomaly detection**

---

### 1.5 Comment Router (`comment.*`)

#### `comment.create`
**Purpose**: Add comment to work item
```typescript
Input: {
  workItemId: string
  content: string
}
Output: Comment
```

**AI Use Cases**:
- **Auto-generated summaries**
- **Bot responses**
- **Status updates**

---

#### `comment.getByWorkItem`
**Purpose**: Get all comments for work item
```typescript
Input: { workItemId: string }
Output: Comment[] // With user relation
```

**AI Use Cases**:
- **Sentiment analysis**
- **Action item extraction**
- **Knowledge mining**

---

#### `comment.update`
**Purpose**: Edit comment
```typescript
Input: { id: string, content: string }
Output: Comment
```

---

#### `comment.delete`
**Purpose**: Delete comment
```typescript
Input: { id: string }
Output: Comment
```

---

### 1.6 Project Router (`project.*`)

#### `project.getAll`
**Purpose**: Get all projects user has access to
```typescript
Input: None (uses session)
Output: Project[]
```

---

#### `project.getById`
**Purpose**: Get project with details
```typescript
Input: { id: string }
Output: Project
```

**Relations**: `organization`, `team`, `workItemStates`, `components`, `boards`, `sprints`

---

#### `project.create`
**Purpose**: Create new project
```typescript
Input: {
  name: string
  key: string // Project key (e.g., "PROJ")
  description?: string
  organizationId: string
  teamId?: string
  settings?: Json
}
Output: Project
```

---

### 1.7 Organization Router (`organization.*`)

#### `organization.getAll`
**Purpose**: Get user's organizations
```typescript
Input: None
Output: Organization[]
```

---

#### `organization.getWithProjects`
**Purpose**: Get organizations with projects and task counts
```typescript
Input: None
Output: Array<{
  id: string
  name: string
  slug: string
  projects: Array<{
    id: string
    name: string
    key: string
    description?: string
    taskCount: number // Non-DONE tasks assigned to user
  }>
}>
```

**AI Use Cases**:
- **Portfolio overview**
- **Resource allocation analysis**
- **Multi-project insights**

---

### 1.8 Board Router (`board.*`)

#### `board.getForProject`
**Purpose**: Get all boards for project
```typescript
Input: { projectId: string }
Output: Board[] // With lanes
```

**Relations**: `lanes` with mapped states

---

#### `board.getById`
**Purpose**: Get board details
```typescript
Input: { id: string }
Output: Board
```

**Relations**: `lanes`, `project`

---

### 1.9 WorkItemState Router (`workItemState.*`)

#### `workItemState.getByProject`
**Purpose**: Get workflow states for project
```typescript
Input: { projectId: string }
Output: WorkItemState[]
```

**Fields**:
- `id`, `name`, `color`, `category` (TODO, IN_PROGRESS, DONE, ARCHIVED)
- `position` (order in workflow)

**AI Use Cases**:
- **Workflow analysis**
- **State transition patterns**
- **Custom workflow recommendations**

---

### 1.10 Component Router (`component.*`)

#### `component.getByProject`
**Purpose**: Get components (modules) for project
```typescript
Input: { projectId: string }
Output: Component[]
```

**Fields**: `id`, `name`, `description`, `color`

**AI Use Cases**:
- **Auto-tagging** tasks with components
- **Component health monitoring**
- **Architecture insights**

---

### 1.11 Dependency Router (`dependency.*`)

#### `dependency.create`
**Purpose**: Create dependency between work items
```typescript
Input: {
  fromWorkItemId: string
  toWorkItemId: string
  type: "BLOCKS" | "DEPENDS_ON" | "RELATES_TO"
}
Output: Dependency
```

**AI Use Cases**:
- **Implicit dependency detection**
- **Critical path calculation**
- **Circular dependency warnings**

---

#### `dependency.getByWorkItem`
**Purpose**: Get dependencies for work item
```typescript
Input: { workItemId: string }
Output: {
  blockedBy: Dependency[]
  blocking: Dependency[]
  related: Dependency[]
}
```

**AI Use Cases**:
- **Dependency graph visualization**
- **Impact analysis**
- **Scheduling optimization**

---

### 1.12 TimeLog Router (`timeLog.*`)

#### `timeLog.create`
**Purpose**: Log time spent on work item
```typescript
Input: {
  workItemId: string
  hours: number
  description?: string
  loggedAt?: Date
}
Output: TimeLog
```

**AI Use Cases**:
- **Effort tracking**
- **Estimation refinement**
- **Productivity analysis**

---

#### `timeLog.getByWorkItem`
**Purpose**: Get time logs for work item
```typescript
Input: { workItemId: string }
Output: TimeLog[]
```

---

### 1.13 Attachment Router (`attachment.*`)

#### `attachment.upload`
**Purpose**: Upload file to work item
```typescript
Input: {
  workItemId: string
  file: File
}
Output: Attachment
```

---

#### `attachment.getByWorkItem`
**Purpose**: Get attachments for work item
```typescript
Input: { workItemId: string }
Output: Attachment[]
```

---

## 2. Database Schema (Prisma)

### Direct Database Access (for AI training/analysis)

**Location**: `packages/db/prisma/schema.prisma`

### Key Tables for AI

#### WorkItem
```prisma
model WorkItem {
  id              String        @id @default(uuid())
  title           String
  description     String?
  type            WorkItemType  // EPIC, FEATURE, STORY, BUG, TASK, SUB_TASK
  priority        Priority      // CRITICAL, HIGH, MEDIUM, LOW
  stateId         String
  assigneeId      String?
  creatorId       String
  projectId       String
  sprintId        String?
  epicId          String?
  parentId        String?
  storyPoints     Int?
  estimatedHours  Float?
  remainingHours  Float?
  dueDate         DateTime?
  order           Int           @default(0)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relations for AI context
  state           WorkItemState
  assignee        User?
  creator         User
  project         Project
  sprint          Sprint?
  comments        Comment[]
  timeLogs        TimeLog[]
  attachments     Attachment[]
  details         WorkItemDetail?
  components      ComponentOnWorkItem[]
}
```

**AI Training Data**:
- Historical task patterns
- Effort vs. estimation correlation
- Priority distribution
- Type classification patterns

---

#### WorkItemDetail
```prisma
model WorkItemDetail {
  id                   String    @id @default(uuid())
  workItemId           String    @unique
  acceptanceCriteria   String?
  technicalNotes       String?
  reproSteps           String?   // For bugs
  businessValue        String?
  userPersona          String?
  customFields         Json?
  externalReferences   String?
  
  workItem             WorkItem
}
```

**AI Use Cases**:
- **Quality assessment** (missing acceptance criteria)
- **Template learning** (common patterns)
- **Auto-completion** suggestions

---

#### Comment
```prisma
model Comment {
  id          String   @id @default(uuid())
  content     String
  workItemId  String
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  workItem    WorkItem
  user        User
}
```

**AI Use Cases**:
- **Sentiment analysis**
- **Action item extraction**
- **Discussion summarization**
- **Collaboration patterns**

---

#### ActivityLog
```prisma
model ActivityLog {
  id         String   @id @default(uuid())
  entityType String   // "WorkItem", "Sprint", etc.
  entityId   String
  action     String   // "state_change", "assignment", "completion"
  actorId    String?
  changeDiff Json     // Before/after state
  context    Json     @default("{}")
  createdAt  DateTime @default(now())
}
```

**AI Training Data**:
- **Workflow patterns**
- **Team collaboration networks**
- **Productivity trends**
- **Anomaly detection**

---

#### Sprint
```prisma
model Sprint {
  id              String      @id @default(uuid())
  name            String
  goal            String?
  startDate       DateTime
  endDate         DateTime
  state           String      // "planned", "active", "completed"
  velocityHistory Json        @default("[]")
  projectId       String
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  project         Project
  workItems       WorkItem[]
}
```

**AI Use Cases**:
- **Velocity prediction**
- **Sprint success forecasting**
- **Capacity planning**

---

### Vector Embeddings (pgvector)

**Already Available**: PostgreSQL with pgvector extension

**AI Integration Points**:

```sql
-- Add embedding column to WorkItem
ALTER TABLE "WorkItem" ADD COLUMN embedding vector(1536);

-- Create index for similarity search
CREATE INDEX ON "WorkItem" USING ivfflat (embedding vector_cosine_ops);
```

**Use Cases**:
- **Semantic task search**: "Show me all authentication-related bugs"
- **Similar tasks**: Find tasks similar to current work item
- **Duplicate detection**: Identify potential duplicate tasks
- **Auto-tagging**: Suggest components based on description

**Embedding Pipeline**:
```typescript
// Background job to embed new/updated tasks
async function embedWorkItem(workItem: WorkItem) {
  const text = `${workItem.title} ${workItem.description} ${workItem.details?.technicalNotes}`;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text
  });
  
  await prisma.workItem.update({
    where: { id: workItem.id },
    data: { embedding: embedding.data[0].embedding }
  });
}
```

---

## 3. Authentication & Session Management

### Session-Based Auth (Better-Auth)

**Current User Endpoint**:
```typescript
// Get current session
import { getUser } from "@/functions/get-user";

const session = await getUser();
// Returns: { user: { id, email, name, ... } } | null
```

**AI Considerations**:
- AI actions must be performed **on behalf of authenticated users**
- Session cookies required for tRPC calls
- Bot accounts can be created as regular users

---

## 4. Frontend Integration Points

### 4.1 React Query Integration

**Query Keys Pattern**:
```typescript
// All queries use tRPC queryOptions for consistency
const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
```

**AI Cache Invalidation**:
```typescript
// After AI mutation, invalidate relevant queries
await queryClient.invalidateQueries({ 
  queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey 
});
```

---

### 4.2 Optimistic Updates Pattern

**AI should follow same pattern for UI responsiveness**:

```typescript
const mutation = useMutation({
  mutationFn: async (data) => await client.workItem.create.mutate(data),
  
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey });
    
    // Snapshot previous state
    const previous = queryClient.getQueryData(queryKey);
    
    // Optimistically update
    queryClient.setQueryData(queryKey, (old) => [...old, newData]);
    
    return { previous };
  },
  
  onError: (err, data, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(queryKey, context.previous);
    }
  },
  
  onSuccess: () => {
    // Invalidate to get server data
    queryClient.invalidateQueries({ queryKey });
  }
});
```

---

## 5. AI-Specific Integration Interfaces

### 5.1 AI Gateway API (Proposed)

**Endpoint**: `/api/ai/*`

```typescript
// Natural language task creation
POST /api/ai/create-task
Body: {
  naturalLanguage: string,
  projectId: string,
  context?: {
    sprint?: string,
    assignee?: string,
    priority?: string
  }
}
Response: WorkItem

// Task analysis
POST /api/ai/analyze-task
Body: { workItemId: string }
Response: {
  estimatedHours: number,
  suggestedComponents: string[],
  similarTasks: WorkItem[],
  riskScore: number,
  recommendations: string[]
}

// Sprint planning assistance
POST /api/ai/suggest-sprint
Body: {
  projectId: string,
  teamCapacity: number,
  sprintGoal?: string
}
Response: {
  suggestedTasks: WorkItem[],
  totalPoints: number,
  confidence: number,
  reasoning: string
}

// Smart assignment
POST /api/ai/suggest-assignee
Body: { workItemId: string }
Response: {
  userId: string,
  confidence: number,
  reasoning: string
}
```

---

### 5.2 Webhook Events (Proposed)

**For real-time AI reactions**:

```typescript
// Register webhook for AI listening
POST /api/webhooks/register
Body: {
  url: string,
  events: ["task.created", "task.updated", "comment.created", "sprint.started"]
}

// Webhook payload example
{
  event: "task.created",
  timestamp: "2026-01-03T15:00:00Z",
  data: {
    workItem: { ... },
    project: { ... },
    creator: { ... }
  }
}
```

**AI Actions on Webhooks**:
- Auto-enrich newly created tasks
- Detect missing information
- Suggest improvements
- Trigger automated workflows

---

### 5.3 Batch Operations (Proposed)

**For AI bulk processing**:

```typescript
POST /api/ai/batch/create-tasks
Body: {
  tasks: Array<CreateWorkItemInput>
}
Response: {
  created: WorkItem[],
  failed: Array<{ input, error }>
}

POST /api/ai/batch/update-tasks
Body: {
  updates: Array<{ id: string, data: UpdateWorkItemInput }>
}
Response: {
  updated: WorkItem[],
  failed: Array<{ id, error }>
}
```

---

## 6. Data Export Interfaces

### 6.1 Historical Data Export

**For AI training**:

```typescript
GET /api/export/work-items?projectId={id}&format=jsonl
Response: JSONL stream of work items with all relations

GET /api/export/activity-logs?from={date}&to={date}
Response: Activity log data for pattern analysis

GET /api/export/sprints?projectId={id}&completed=true
Response: Completed sprint data with velocity metrics
```

---

### 6.2 Analytics Aggregations

**Pre-computed metrics for AI**:

```typescript
GET /api/analytics/velocity?projectId={id}
Response: {
  avgVelocity: number,
  trend: "increasing" | "stable" | "decreasing",
  lastSprints: Array<{ name, velocity, completionRate }>
}

GET /api/analytics/team-performance?projectId={id}
Response: {
  members: Array<{
    userId: string,
    tasksCompleted: number,
    avgCompletionTime: number,
    velocity: number,
    skills: string[]
  }>
}
```

---

## 7. AI Function Calling Schema

### OpenAI/Anthropic Function Definitions

```json
{
  "name": "create_work_item",
  "description": "Create a new work item (task, bug, story, etc.) in the project",
  "parameters": {
    "type": "object",
    "properties": {
      "title": { "type": "string", "description": "Task title" },
      "description": { "type": "string", "description": "Detailed description" },
      "type": { 
        "type": "string", 
        "enum": ["TASK", "BUG", "STORY", "FEATURE", "EPIC", "SUB_TASK"],
        "description": "Type of work item"
      },
      "priority": {
        "type": "string",
        "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "description": "Task priority"
      },
      "projectId": { "type": "string", "description": "Project ID" },
      "assigneeId": { "type": "string", "description": "User ID to assign to" },
      "estimatedHours": { "type": "number", "description": "Estimated effort in hours" },
      "dueDate": { "type": "string", "format": "date", "description": "Due date ISO string" },
      "componentIds": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Component IDs to tag"
      },
      "details": {
        "type": "object",
        "properties": {
          "acceptanceCriteria": { "type": "string" },
          "technicalNotes": { "type": "string" },
          "reproSteps": { "type": "string" }
        }
      }
    },
    "required": ["title", "type", "projectId"]
  }
}
```

---

## 8. Error Handling for AI

### Standard Error Responses

```typescript
{
  error: {
    code: "UNAUTHORIZED" | "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR",
    message: string,
    details?: any
  }
}
```

**AI Error Recovery**:
- `VALIDATION_ERROR`: Retry with corrected input
- `UNAUTHORIZED`: Request user authentication
- `NOT_FOUND`: Verify entity exists before operation
- `INTERNAL_ERROR`: Log and alert, retry with backoff

---

## 9. Rate Limiting & Quotas

### Current Limits (to be implemented)

```typescript
// Per user/API key
{
  requests: {
    perMinute: 100,
    perHour: 1000,
    perDay: 10000
  },
  batch: {
    maxItemsPerRequest: 50
  }
}
```

**AI Considerations**:
- Implement request queuing for bulk operations
- Use batch endpoints when available
- Cache frequently accessed data
- Respect rate limit headers

---

## 10. AI Development Workflow

### Recommended Integration Flow

```
1. Authentication
   ↓ Get session/API token
   
2. Context Gathering
   ↓ Fetch project, user, team data via tRPC
   
3. AI Processing
   ↓ LLM analysis, predictions, generations
   
4. Action Execution
   ↓ Create/update entities via tRPC mutations
   
5. Validation
   ↓ Verify results, handle errors
   
6. Cache Invalidation
   ↓ Update React Query cache for UI sync
```

---

### Example: AI Task Creation from Natural Language

```typescript
// 1. User input
const input = "We need to fix the login bug where users are logged out after 5 mins";

// 2. AI processing (GPT-4)
const analysis = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a project management assistant..." },
    { role: "user", content: input }
  ],
  functions: [createWorkItemFunction],
  function_call: { name: "create_work_item" }
});

// 3. Extract function call
const functionCall = analysis.choices[0].message.function_call;
const args = JSON.parse(functionCall.arguments);

// 4. Execute via tRPC
const task = await client.workItem.create.mutate({
  ...args,
  projectId: currentProject,
  type: "BUG",
  priority: "HIGH"
});

// 5. Update UI cache
queryClient.invalidateQueries({
  queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey
});
```

---

## 11. Security Considerations

### Authentication Requirements
- **All AI operations** must be authenticated
- Use session cookies or API keys
- Implement per-user rate limiting

### Data Privacy
- **Sensitive data**: Never send to external AI without user consent
- **Embeddings**: Store locally, no external API calls for sensitive projects
- **Audit logs**: Track all AI-generated actions

### Permissions
- AI respects same permission model as users
- Cannot perform actions user doesn't have access to
- Organization/project isolation enforced

---

## 12. Testing & Development

### Mock Data Endpoints

```typescript
GET /api/dev/mock-data
Response: { projects, workItems, users, sprints }

POST /api/dev/seed-test-data
Body: { scenario: "sprint-planning" | "bug-tracking" | "epic-breakdown" }
Response: { created: { ... } }
```

### AI Testing Checklist
- [ ] Test with various natural language inputs
- [ ] Verify error handling and graceful degradation
- [ ] Check permission boundaries
- [ ] Validate data consistency
- [ ] Test concurrent operations
- [ ] Measure performance impact

---

## Appendix A: Complete tRPC Router Schema

```typescript
// Type definitions for all routers
export type AppRouter = {
  workItem: WorkItemRouter;
  sprint: SprintRouter;
  dashboard: DashboardRouter;
  activity: ActivityRouter;
  comment: CommentRouter;
  project: ProjectRouter;
  organization: OrganizationRouter;
  board: BoardRouter;
  workItemState: WorkItemStateRouter;
  component: ComponentRouter;
  dependency: DependencyRouter;
  timeLog: TimeLogRouter;
  attachment: AttachmentRouter;
  tag: TagRouter;
  team: TeamRouter;
  teamMembership: TeamMembershipRouter;
  organizationMembership: OrganizationMembershipRouter;
  milestone: MilestoneRouter;
  retrospective: RetrospectiveRouter;
  portfolio: PortfolioRouter;
};
```

---

## Appendix B: Database Connection for AI

### Direct Prisma Access (Server-side only)

```typescript
import { prisma } from "@my-better-t-app/db";

// AI training queries
const historicalTasks = await prisma.workItem.findMany({
  where: {
    createdAt: { gte: new Date("2024-01-01") },
    state: { category: "DONE" }
  },
  include: {
    details: true,
    timeLogs: true,
    comments: true
  }
});

// Analyze patterns
const taskDurations = historicalTasks.map(task => ({
  type: task.type,
  priority: task.priority,
  estimatedHours: task.estimatedHours,
  actualHours: task.timeLogs.reduce((sum, log) => sum + log.hours, 0),
  complexity: task.description?.length || 0
}));
```

---

## Next Steps for AI Integration

1. **Implement AI Gateway API** (`/api/ai/*` endpoints)
2. **Setup Embedding Pipeline** (background jobs for pgvector)
3. **Create Function Call Schemas** (for LLM integration)
4. **Build AI Testing Suite** (mock scenarios, validation)
5. **Add Webhook System** (real-time AI reactions)
6. **Implement Batch Operations** (bulk AI actions)
7. **Create Analytics Endpoints** (pre-computed metrics)
8. **Setup Monitoring** (AI action logging, performance tracking)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-03  
**Maintained By**: Development Team
