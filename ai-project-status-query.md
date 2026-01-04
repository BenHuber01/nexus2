# AI Project Status Query Tool

## Vision
User can ask natural language questions about project status/progress and get intelligent summaries based on real-time data.

---

## 🎯 Use Cases

### Primary Questions
- "Wie ist der aktuelle Stand in diesem Projekt?"
- "Wo stehen wir im Projekt?"
- "Gib mir eine Übersicht über den Stand des Projekts"
- "Was ist noch offen?"
- "Welche Aufgaben sind überfällig?"

### Advanced Queries
- "Wie viele Tasks sind noch im aktuellen Sprint offen?"
- "Wer hat die meisten offenen Tasks?"
- "Welche Bugs haben HIGH priority?"
- "Zeig mir die letzten Aktivitäten"
- "Was wurde diese Woche erledigt?"

---

## 🏗️ Architecture Options

### Option 1: AI Tool with Database Query (⭐ Recommended)
**Concept:** AI tool fetches structured data, AI formats response

```typescript
get_project_status: tool({
  description: "Get comprehensive project status and metrics",
  inputSchema: z.object({
    aspectsToInclude: z.array(z.enum([
      "summary",
      "work_items_by_state",
      "work_items_by_type",
      "work_items_by_priority",
      "sprint_progress",
      "team_workload",
      "recent_activity",
      "blockers"
    ])).optional()
  }),
  execute: async () => {
    // Query database for all relevant metrics
    const stats = await getProjectStats(projectId);
    return stats; // AI formats this into natural language
  }
})
```

**Pros:**
- ✅ Real-time accurate data
- ✅ AI formats output naturally
- ✅ Can answer follow-up questions
- ✅ Fast to implement

**Cons:**
- ⚠️ AI decides which metrics to include
- ⚠️ May need multiple tool calls for complex queries

---

### Option 2: Semantic Search (Advanced)
**Concept:** AI searches through project history with embeddings

**Pros:**
- ✅ Can find specific context/discussions
- ✅ "Why was X decision made?"

**Cons:**
- ❌ Requires pgvector setup
- ❌ Embedding cost
- ❌ Complex implementation

**Status:** Future enhancement

---

## 📊 Data Points to Include

### Core Metrics
```typescript
interface ProjectStatus {
  // Overview
  totalWorkItems: number;
  completionRate: number; // percentage
  
  // By State
  workItemsByState: {
    stateName: string;
    count: number;
    percentage: number;
  }[];
  
  // By Type
  workItemsByType: {
    type: "BUG" | "TASK" | "STORY" | "FEATURE" | "EPIC";
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
  }[];
  
  // By Priority
  workItemsByPriority: {
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    count: number;
    overdue: number;
  }[];
  
  // Sprint Info (if active sprint)
  currentSprint?: {
    name: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    totalPoints: number;
    completedPoints: number;
    velocity: number;
  };
  
  // Team Workload
  teamWorkload: {
    userId: string;
    userName: string;
    activeWorkItems: number;
    completedThisWeek: number;
  }[];
  
  // Recent Activity (last 7 days)
  recentActivity: {
    created: number;
    completed: number;
    updated: number;
  };
  
  // Blockers/Risks
  blockers: {
    id: string;
    title: string;
    priority: string;
    blockedDays: number;
  }[];
  
  // Overdue Items
  overdueItems: {
    id: string;
    title: string;
    assignee: string;
    dueDate: string;
    daysOverdue: number;
  }[];
}
```

---

## 🚀 Implementation Plan

### Phase 1: Basic Status Tool (Day 1)

#### Step 1: Create Stats Helper Function
**File:** `/packages/api/src/routers/project.ts`

```typescript
export const projectRouter = router({
  // ... existing routes
  
  getStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      
      // Get all work items for project
      const workItems = await ctx.prisma.workItem.findMany({
        where: { projectId },
        include: {
          state: true,
          assignee: true,
        }
      });
      
      // Calculate metrics
      const stats = calculateProjectStats(workItems);
      return stats;
    }),
});

function calculateProjectStats(workItems: WorkItem[]) {
  const total = workItems.length;
  const completed = workItems.filter(w => w.state.category === "DONE").length;
  
  // Group by state
  const byState = groupBy(workItems, "stateId");
  
  // Group by type
  const byType = groupBy(workItems, "type");
  
  // Group by priority
  const byPriority = groupBy(workItems, "priority");
  
  return {
    totalWorkItems: total,
    completionRate: (completed / total) * 100,
    workItemsByState: Object.entries(byState).map(([stateId, items]) => ({
      stateName: items[0].state.name,
      count: items.length,
      percentage: (items.length / total) * 100
    })),
    // ... more metrics
  };
}
```

#### Step 2: Add AI Tool
**File:** `/apps/server/src/index.ts`

```typescript
get_project_status: tool({
  description: `Get current project status, metrics and progress overview.
  
  Use this when user asks about:
  - Project status/stand
  - What's done/remaining
  - Team workload
  - Sprint progress
  - Blockers or overdue items
  
  The data includes work items by state, type, priority, team workload, and recent activity.`,
  
  inputSchema: z.object({
    includeDetails: z.enum([
      "brief",      // High-level overview only
      "detailed",   // Include breakdowns
      "full"        // All metrics + blockers/overdue
    ]).default("detailed")
  }),
  
  execute: async ({ includeDetails }: any) => {
    if (!projectId) {
      return { error: "Project context required" };
    }
    
    try {
      // Fetch stats via tRPC or direct Prisma query
      const stats = await getProjectStats(projectId);
      
      // Filter based on detail level
      if (includeDetails === "brief") {
        return {
          totalWorkItems: stats.totalWorkItems,
          completionRate: stats.completionRate,
          workItemsByState: stats.workItemsByState
        };
      }
      
      return stats; // AI will format naturally
    } catch (error: any) {
      console.error("[AI] Error fetching project stats:", error);
      return { error: error.message };
    }
  }
} as any),
```

#### Step 3: Direct Prisma Query Alternative
```typescript
async function getProjectStats(projectId: string) {
  // Get work items with relations
  const workItems = await prisma.workItem.findMany({
    where: { projectId },
    include: {
      state: true,
      assignee: { select: { id: true, name: true } },
    }
  });
  
  const total = workItems.length;
  const completed = workItems.filter(w => 
    w.state.name === "Done" || w.state.category === "DONE"
  ).length;
  
  // Group by state
  const stateGroups = workItems.reduce((acc, item) => {
    const key = item.state.name;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Group by type
  const typeGroups = workItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Team workload
  const assigneeWorkload = workItems
    .filter(w => w.assigneeId)
    .reduce((acc, item) => {
      const key = item.assigneeId!;
      if (!acc[key]) {
        acc[key] = {
          userId: key,
          userName: item.assignee?.name || "Unknown",
          activeWorkItems: 0,
        };
      }
      acc[key].activeWorkItems += 1;
      return acc;
    }, {} as Record<string, any>);
  
  return {
    totalWorkItems: total,
    completionRate: Math.round((completed / total) * 100),
    workItemsByState: Object.entries(stateGroups).map(([name, count]) => ({
      stateName: name,
      count,
      percentage: Math.round((count / total) * 100)
    })),
    workItemsByType: Object.entries(typeGroups).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100)
    })),
    teamWorkload: Object.values(assigneeWorkload),
  };
}
```

---

### Phase 2: Enhanced Metrics (Day 2)

#### Add Sprint Progress
```typescript
// If project has active sprint
const activeSprint = await prisma.sprint.findFirst({
  where: {
    projectId,
    startDate: { lte: new Date() },
    endDate: { gte: new Date() }
  },
  include: {
    workItems: {
      include: { state: true }
    }
  }
});

if (activeSprint) {
  const sprintTotal = activeSprint.workItems.length;
  const sprintCompleted = activeSprint.workItems.filter(w =>
    w.state.category === "DONE"
  ).length;
  
  stats.currentSprint = {
    name: activeSprint.name,
    startDate: activeSprint.startDate,
    endDate: activeSprint.endDate,
    daysRemaining: Math.ceil(
      (activeSprint.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
    totalPoints: sprintTotal, // or use story points if available
    completedPoints: sprintCompleted,
    progressPercentage: Math.round((sprintCompleted / sprintTotal) * 100)
  };
}
```

#### Add Recent Activity
```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const recentActivity = await prisma.activity.groupBy({
  by: ['type'],
  where: {
    projectId,
    createdAt: { gte: sevenDaysAgo }
  },
  _count: true
});

stats.recentActivity = {
  created: recentActivity.find(a => a.type === 'WORK_ITEM_CREATED')?._count || 0,
  completed: recentActivity.find(a => a.type === 'WORK_ITEM_COMPLETED')?._count || 0,
  updated: recentActivity.find(a => a.type === 'WORK_ITEM_UPDATED')?._count || 0,
};
```

#### Add Blockers
```typescript
// Find blocked items (could use tags, state, or custom field)
const blockers = await prisma.workItem.findMany({
  where: {
    projectId,
    // Option 1: State-based
    state: { name: "Blocked" },
    // Option 2: Tag-based
    // tags: { some: { name: "blocked" } }
  },
  select: {
    id: true,
    title: true,
    priority: true,
    updatedAt: true,
  },
  take: 10
});

stats.blockers = blockers.map(b => ({
  id: b.id,
  title: b.title,
  priority: b.priority,
  blockedDays: Math.floor((Date.now() - b.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
}));
```

---

### Phase 3: UI Enhancement (Optional)

#### Render Structured Status in Chat
```tsx
// In ai-chat-bubble.tsx
if (tool.type === "tool-get_project_status" && tool.output) {
  return (
    <div className="mt-2 p-4 bg-muted/30 rounded-lg">
      <h4 className="font-semibold mb-2">📊 Project Status</h4>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>Overall Progress</span>
          <span>{tool.output.completionRate}%</span>
        </div>
        <div className="w-full bg-secondary h-2 rounded">
          <div 
            className="bg-primary h-2 rounded"
            style={{ width: `${tool.output.completionRate}%` }}
          />
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-background p-2 rounded">
          <div className="text-muted-foreground">Total Items</div>
          <div className="text-lg font-bold">{tool.output.totalWorkItems}</div>
        </div>
        {tool.output.currentSprint && (
          <div className="bg-background p-2 rounded">
            <div className="text-muted-foreground">Sprint Progress</div>
            <div className="text-lg font-bold">
              {tool.output.currentSprint.completedPoints}/{tool.output.currentSprint.totalPoints}
            </div>
          </div>
        )}
      </div>
      
      {/* Let AI render the detailed text */}
      <div className="mt-3 text-sm text-muted-foreground">
        <Response>{/* AI text response here */}</Response>
      </div>
    </div>
  );
}
```

---

## 🎯 Expected AI Responses

### Example 1: Brief Status
**User:** "Wie ist der aktuelle Stand?"

**AI Response:**
```
Das Projekt hat aktuell 45 Work Items mit einer Completion Rate von 62%.

Verteilung nach Status:
• Done: 28 Items (62%)
• In Progress: 12 Items (27%)
• To Do: 5 Items (11%)

Der aktuelle Sprint läuft noch 3 Tage und wir haben 18 von 22 Punkten abgeschlossen (82%).
```

### Example 2: Detailed Overview
**User:** "Gib mir eine vollständige Übersicht"

**AI Response:**
```
📊 Projekt-Status Übersicht

Gesamt: 45 Work Items, 62% abgeschlossen

Nach Typ:
• Tasks: 25 (15 done, 8 in progress, 2 todo)
• Bugs: 12 (9 done, 3 in progress)
• Features: 8 (4 done, 1 in progress, 3 todo)

Nach Priorität:
• Critical: 2 (1 blocked)
• High: 8 (6 done, 2 in progress)
• Medium: 25
• Low: 10

Sprint Info:
• "Sprint 12" läuft bis 08.01.2026 (3 Tage verbleibend)
• 18/22 Punkte abgeschlossen (82%)
• Velocity: 7 Punkte/Woche

Team Workload:
• Max Mustermann: 5 aktive Tasks
• Anna Schmidt: 3 aktive Tasks
• ...

⚠️ Blockers:
1. "API Integration blocked" (3 Tage blockiert, HIGH priority)

Letzte Woche:
• 8 neue Items erstellt
• 12 Items abgeschlossen
• 23 Updates
```

---

## 🔧 Technical Details

### Database Queries
- **1 main query** - Fetch all work items with relations
- **1 sprint query** - If sprint context needed
- **1 activity query** - For recent changes
- Total: ~3 queries, <100ms

### Caching Strategy
```typescript
// Cache stats for 5 minutes
const cacheKey = `project-stats:${projectId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const stats = await calculateStats(projectId);
await redis.set(cacheKey, JSON.stringify(stats), 'EX', 300);
return stats;
```

### Performance
- ✅ Efficient - Single query with includes
- ✅ Fast - <100ms for typical project
- ✅ Scalable - Can add pagination for large projects

---

## 🚀 Implementation Timeline

### Day 1 - Core Implementation (4-5 hours)
- [ ] Create `getProjectStats` function in server
- [ ] Add `get_project_status` AI tool
- [ ] Test basic queries
- [ ] Verify AI response formatting

### Day 2 - Enhanced Metrics (3-4 hours)
- [ ] Add sprint progress tracking
- [ ] Add recent activity stats
- [ ] Add blocker detection
- [ ] Add overdue items tracking

### Day 3 - Polish (2-3 hours)
- [ ] Add caching layer
- [ ] Optimize database queries
- [ ] Test with large datasets
- [ ] Document AI prompt examples

**Total:** 2-3 days for full implementation

---

## 💡 Future Enhancements

### Phase 2+
1. **Historical Trends** - "Wie war der Stand letzte Woche?"
2. **Comparisons** - "Sind wir schneller als letzter Sprint?"
3. **Predictions** - "Wann werden wir fertig sein?"
4. **Custom Reports** - User-defined metrics
5. **Scheduled Reports** - Daily/weekly status emails
6. **Export** - PDF/CSV reports

### Advanced AI Features
- **Multi-project comparison** - "Wie steht Projekt A vs B?"
- **Risk analysis** - "Welche Risiken siehst du?"
- **Recommendations** - "Was sollten wir priorisieren?"

---

## ⚠️ Considerations

### Data Privacy
- ✅ Only show data user has access to
- ✅ Respect project permissions
- ✅ Filter sensitive work items

### Performance
- ✅ Cache stats (5min TTL)
- ✅ Limit to recent activity (last 30 days)
- ✅ Paginate large result sets

### AI Token Usage
- Stats object ~500 tokens
- AI response ~300 tokens
- Total: ~800 tokens per query (~$0.004)

---

## 🎯 Success Criteria

- [ ] User can ask status questions naturally
- [ ] AI responds with accurate, current data
- [ ] Response time < 2 seconds
- [ ] Covers 80% of common queries
- [ ] Works across all project sizes

---

**Status:** Ready for Implementation  
**Estimated Effort:** 2-3 days  
**Dependencies:** None (uses existing schema)  
**Next Step:** Approve approach and start Day 1 tasks
