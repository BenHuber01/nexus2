# On-The-Fly AI Tooling - Dynamic Tool Creation

## Vision
Users can create custom AI tools through a UI without touching server code. Tools are stored in database and dynamically loaded at runtime.

---

## ✅ Feasibility Analysis

### Is it technically possible?
**YES** - AI SDK v6 supports dynamic tool registration. Tools can be loaded from database and added to `streamText()` at request time.

### Key Requirements
1. **Tool Definition Storage** - Store tool configs in database
2. **Dynamic Loading** - Load tools per user/project/organization
3. **Code Execution** - Safe execution of user-defined logic
4. **Schema Validation** - Zod schemas from JSON/UI

---

## 🏗️ Architecture Options

### Option 1: Template-Based Tools (⭐ Recommended)
**Concept:** Pre-defined tool templates with configurable parameters

**Example Templates:**
- `create_work_item` - Create any work item type (Bug, Task, Story, etc.)
- `update_field` - Update any field on any entity
- `query_data` - Query database with user-defined filters
- `send_notification` - Send notifications with custom messages

**How it works:**
```typescript
// User creates tool via UI:
{
  name: "create_feature",
  template: "create_work_item",
  config: {
    type: "FEATURE",
    defaultPriority: "HIGH",
    requiredFields: ["title", "description", "epic"],
    customInstructions: "Always ask for epic relationship"
  }
}

// Server dynamically creates tool:
tool({
  description: config.customInstructions,
  inputSchema: generateSchemaFromConfig(config),
  execute: async (input) => {
    return executeTemplate("create_work_item", input, config);
  }
})
```

**Pros:**
- ✅ Safe - No arbitrary code execution
- ✅ Fast to implement
- ✅ Easy to maintain
- ✅ UI can provide template-specific forms

**Cons:**
- ⚠️ Limited to predefined templates
- ⚠️ Less flexible than arbitrary code

**Security:** ✅ High - All logic is server-controlled

---

### Option 2: Scripted Tools (Advanced)
**Concept:** Users write JavaScript/TypeScript code that runs server-side

**Example:**
```typescript
// User creates tool via UI:
{
  name: "create_feature_with_subtasks",
  code: `
    async function execute(input) {
      const feature = await prisma.workItem.create({
        data: { 
          title: input.title,
          type: "FEATURE",
          projectId: context.projectId
        }
      });
      
      for (const subtask of input.subtasks) {
        await prisma.workItem.create({
          data: {
            title: subtask,
            type: "TASK",
            parentId: feature.id,
            projectId: context.projectId
          }
        });
      }
      
      return { success: true, featureId: feature.id };
    }
  `,
  inputSchema: {
    title: "string",
    subtasks: "string[]"
  }
}

// Server executes in sandboxed environment
```

**Pros:**
- ✅ Maximum flexibility
- ✅ Complex business logic possible
- ✅ Can combine multiple operations

**Cons:**
- ❌ **SECURITY RISK** - Code execution vulnerability
- ❌ Requires sandboxing (VM2, isolated-vm)
- ❌ Performance overhead
- ❌ Debugging nightmare

**Security:** ⚠️ Requires heavy sandboxing, still risky

---

### Option 3: Visual Workflow Builder (Modern SaaS Approach)
**Concept:** Drag-and-drop workflow builder like Zapier/n8n

**Example Flow:**
```
1. [AI extracts info]
2. [Create Work Item] → type: FEATURE
3. [Branch: If has subtasks]
   ├─ [Loop subtasks]
   │  └─ [Create Work Item] → type: TASK, parent: step2.id
4. [Send notification]
```

**Pros:**
- ✅ Visual - Non-technical users can create tools
- ✅ Safe - No code execution
- ✅ Auditable - Clear flow visualization
- ✅ Reusable - Save workflows as templates

**Cons:**
- ❌ Complex to build (like building Zapier)
- ❌ Time-consuming implementation
- ❌ Need workflow engine

**Security:** ✅ High - No code execution

---

## 📊 Comparison Matrix

| Feature | Template-Based | Scripted | Visual Workflow |
|---------|----------------|----------|-----------------|
| **Implementation Time** | 2-3 days | 1 week | 3-4 weeks |
| **Security** | ✅ High | ⚠️ Medium | ✅ High |
| **Flexibility** | Medium | ✅ High | Medium |
| **User-Friendliness** | ✅ Good | ❌ Technical | ✅ Excellent |
| **Maintenance** | ✅ Easy | ❌ Complex | Medium |
| **Debugging** | ✅ Easy | ❌ Hard | Medium |

---

## 🎯 Recommended Approach: Template-Based (Phase 1)

### Implementation Plan

#### 1. Database Schema
```prisma
model AITool {
  id          String   @id @default(cuid())
  name        String   // "create_feature"
  displayName String   // "Create Feature"
  template    String   // "create_work_item"
  config      Json     // Template-specific config
  instructions String  // Custom AI instructions
  
  // Scope
  organizationId String?
  projectId      String?
  userId         String?
  
  // Metadata
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 2. Template Registry
```typescript
// server/src/tool-templates/index.ts
export const TOOL_TEMPLATES = {
  create_work_item: {
    generateSchema: (config) => z.object({
      title: z.string(),
      description: z.string().optional(),
      // Dynamic fields based on config
    }),
    execute: async (input, config, context) => {
      // Generic work item creation logic
    }
  },
  
  update_work_item: { /* ... */ },
  query_work_items: { /* ... */ },
  send_notification: { /* ... */ },
};
```

#### 3. Dynamic Tool Loading
```typescript
// server/src/index.ts
.post("/ai", async (context: any) => {
  const session = await auth.api.getSession({ headers: context.request.headers });
  const userId = session?.user?.id;
  const { projectId } = await context.request.json();
  
  // Load custom tools
  const customTools = await prisma.aITool.findMany({
    where: {
      isActive: true,
      OR: [
        { projectId },
        { organizationId: project.organizationId },
        { userId },
      ]
    }
  });
  
  // Generate tools dynamically
  const tools = {
    ...DEFAULT_TOOLS, // create_organization, etc.
    ...generateToolsFromConfigs(customTools)
  };
  
  const result = await streamText({
    model: openai("gpt-4-turbo"),
    tools,
    // ...
  });
});
```

#### 4. Frontend UI (Admin Panel)
```
Tool Builder Form:
- Tool Name: [_______________]
- Template: [Dropdown: Create Work Item, Update Field, etc.]
- Display Name: [_______________]
- Custom Instructions: [Text Area]
- Template Config:
  [Template-specific form fields]
- Scope:
  [ ] Organization-wide
  [ ] Project-specific
  [ ] Personal tool
```

---

## 🚀 MVP Implementation (2-3 days)

### Day 1: Backend Foundation
- [ ] Create `AITool` Prisma model
- [ ] Implement 3 basic templates:
  - `create_work_item`
  - `update_work_item_field`
  - `assign_work_item`
- [ ] Dynamic tool loading in `/ai` endpoint
- [ ] Test with hardcoded tool configs

### Day 2: Frontend CRUD
- [ ] Tool management page
- [ ] Create/Edit/Delete tool forms
- [ ] Template selector with config forms
- [ ] Preview tool before activation

### Day 3: Testing & Polish
- [ ] Test all templates
- [ ] Error handling
- [ ] UI polish
- [ ] Documentation

---

## 🔮 Future Enhancements (Phase 2+)

1. **Tool Marketplace** - Share tools between organizations
2. **Version Control** - Track tool changes, rollback
3. **Analytics** - Track tool usage, success rates
4. **AI-Generated Tools** - AI helps create tool configs
5. **Multi-Step Workflows** - Chain multiple tools
6. **Conditional Logic** - If/else branches in templates

---

## ⚠️ Important Considerations

### Security
- **Input Validation** - All user input sanitized
- **Permission Checks** - Verify user can perform action
- **Rate Limiting** - Prevent abuse
- **Audit Logging** - Track all tool executions

### Performance
- **Caching** - Cache tool configs per request
- **Connection Pooling** - Don't create new Prisma client per tool
- **Timeouts** - Tool execution time limits

### UX
- **Clear Feedback** - Show tool execution status
- **Error Messages** - User-friendly error descriptions
- **Undo** - Ability to revert tool actions (where possible)

---

## 💡 Alternative: Tool Suggestions via AI

**Lighter approach:** Instead of custom tools, AI suggests actions based on context:

```typescript
// AI has built-in knowledge of available actions
systemPrompt: `
You can help users by suggesting tRPC mutations:
- workItem.create
- workItem.update
- workItem.delete
- sprint.createWithTasks
// etc.

When user asks for something, suggest the appropriate mutation 
and ask for required parameters.
`
```

**Pros:**
- ✅ No database/UI needed
- ✅ Uses existing tRPC APIs
- ✅ Simpler implementation

**Cons:**
- ⚠️ Less integrated (AI just suggests, user executes)
- ⚠️ Not fully automated

---

## 🎯 Recommendation

**Start with Template-Based Tools (Option 1)**

Why:
1. **Quick Win** - Can be done in 2-3 days
2. **Safe** - No security concerns
3. **Extensible** - Can add more templates over time
4. **User-Friendly** - Clear UI, no coding required
5. **Proven Pattern** - Used by Zapier, Make.com, etc.

**Next Steps:**
1. Validate with stakeholders - Is template-based sufficient?
2. Define initial template list (5-10 templates)
3. Design UI mockups for tool builder
4. Start implementation

---

**Status:** Ideation Phase  
**Decision Needed:** Approve approach before implementation  
**Estimated Effort:** 2-3 days for MVP
