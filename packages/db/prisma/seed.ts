import { PrismaClient, WorkItemType, Priority, WorkItemStateCategory } from "./generated";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const org = await prisma.organization.create({
    data: {
      name: "Nexus Corp",
      slug: "nexus-corp",
      description: "Innovation and Technology Company",
      planTier: "pro",
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: "john@nexus.com",
      firstName: "John",
      lastName: "Doe",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      availabilityHours: 40,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "jane@nexus.com",
      firstName: "Jane",
      lastName: "Smith",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
      availabilityHours: 40,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: "mike@nexus.com",
      firstName: "Mike",
      lastName: "Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
      availabilityHours: 32,
    },
  });

  await prisma.organizationMembership.createMany({
    data: [
      { userId: user1.id, organizationId: org.id, role: "admin" },
      { userId: user2.id, organizationId: org.id, role: "member" },
      { userId: user3.id, organizationId: org.id, role: "member" },
    ],
  });

  const team = await prisma.team.create({
    data: {
      name: "Engineering",
      description: "Core Engineering Team",
      organizationId: org.id,
      velocityHistory: {
        sprints: [
          { sprint: 1, velocity: 34 },
          { sprint: 2, velocity: 42 },
          { sprint: 3, velocity: 38 },
          { sprint: 4, velocity: 45 },
          { sprint: 5, velocity: 41 },
        ],
      },
    },
  });

  await prisma.teamMembership.createMany({
    data: [
      { userId: user1.id, teamId: team.id },
      { userId: user2.id, teamId: team.id },
      { userId: user3.id, teamId: team.id },
    ],
  });

  const portfolio = await prisma.portfolio.create({
    data: {
      name: "Product Development",
      description: "Main product development initiatives",
      strategicGoal: "Build industry-leading project management software",
      organizationId: org.id,
    },
  });

  const project = await prisma.project.create({
    data: {
      key: "NEX",
      name: "NexusPM v1.0",
      description: "Main project for the project management software development",
      projectType: "agile",
      organizationId: org.id,
      portfolioId: portfolio.id,
      leadUserId: user1.id,
    },
  });

  const sprint = await prisma.sprint.create({
    data: {
      name: "Sprint 6",
      goal: "Complete core authentication features",
      startDate: new Date("2024-12-01"),
      endDate: new Date("2024-12-14"),
      state: "active",
      committedPoints: 42,
      projectId: project.id,
    },
  });

  const states = await prisma.workItemState.createMany({
    data: [
      { projectId: project.id, name: "Backlog", category: WorkItemStateCategory.TODO, position: 0, isInitial: true, color: "#6B7280" },
      { projectId: project.id, name: "To Do", category: WorkItemStateCategory.TODO, position: 1, color: "#6B7280" },
      { projectId: project.id, name: "In Progress", category: WorkItemStateCategory.IN_PROGRESS, position: 2, color: "#3B82F6" },
      { projectId: project.id, name: "In Review", category: WorkItemStateCategory.IN_PROGRESS, position: 3, color: "#8B5CF6" },
      { projectId: project.id, name: "Done", category: WorkItemStateCategory.DONE, position: 4, isFinal: true, color: "#10B981" },
    ],
  });

  const createdStates = await prisma.workItemState.findMany({
    where: { projectId: project.id },
    orderBy: { position: "asc" },
  });

  const todoState = createdStates.find((s) => s.name === "To Do")!;
  const inProgressState = createdStates.find((s) => s.name === "In Progress")!;
  const reviewState = createdStates.find((s) => s.name === "In Review")!;
  const doneState = createdStates.find((s) => s.name === "Done")!;
  const backlogState = createdStates.find((s) => s.name === "Backlog")!;

  await prisma.board.create({
    data: {
      name: "Main Board",
      projectId: project.id,
      isDefault: true,
      lanes: {
        create: createdStates.map((state, index) => ({
          name: state.name,
          position: index,
          mappedStates: [state.id],
        })),
      },
    },
  });

  const epic1 = await prisma.workItem.create({
    data: {
      title: "Benutzer-Authentifizierung",
      description: "Implementierung des vollständigen Authentifizierungssystems",
      type: WorkItemType.EPIC,
      priority: Priority.HIGH,
      storyPoints: 13,
      projectId: project.id,
      stateId: inProgressState.id,
      assigneeId: user1.id,
      creatorId: user1.id,
      sprintId: sprint.id,
      details: {
        create: {
          acceptanceCriteria: "Benutzer können sich registrieren, anmelden und abmelden",
          businessValue: "Hoch - Kernfunktion für alle Benutzer",
        },
      },
    },
  });

  const story1 = await prisma.workItem.create({
    data: {
      title: "Login-Formular erstellen",
      description: "Ein benutzerfreundliches Login-Formular mit E-Mail und Passwort",
      type: WorkItemType.STORY,
      priority: Priority.HIGH,
      storyPoints: 5,
      projectId: project.id,
      stateId: inProgressState.id,
      assigneeId: user2.id,
      creatorId: user1.id,
      epicId: epic1.id,
      sprintId: sprint.id,
    },
  });

  await prisma.workItem.create({
    data: {
      title: "E-Mail-Feld validieren",
      type: WorkItemType.SUB_TASK,
      priority: Priority.MEDIUM,
      projectId: project.id,
      stateId: todoState.id,
      assigneeId: user2.id,
      creatorId: user2.id,
      parentId: story1.id,
    },
  });

  await prisma.workItem.create({
    data: {
      title: "Passwort-Feld validieren",
      type: WorkItemType.SUB_TASK,
      priority: Priority.MEDIUM,
      projectId: project.id,
      stateId: todoState.id,
      assigneeId: user2.id,
      creatorId: user2.id,
      parentId: story1.id,
    },
  });

  await prisma.workItem.create({
    data: {
      title: "API-Integration für Login",
      description: "Backend-API-Endpunkt für die Benutzeranmeldung",
      type: WorkItemType.TASK,
      priority: Priority.HIGH,
      storyPoints: 5,
      projectId: project.id,
      stateId: inProgressState.id,
      assigneeId: user1.id,
      creatorId: user1.id,
      epicId: epic1.id,
      sprintId: sprint.id,
    },
  });

  await prisma.workItem.create({
    data: {
      title: "Passwort-Reset-Funktion",
      description: "Funktionalität für vergessene Passwörter",
      type: WorkItemType.STORY,
      priority: Priority.MEDIUM,
      storyPoints: 8,
      projectId: project.id,
      stateId: backlogState.id,
      creatorId: user1.id,
      epicId: epic1.id,
    },
  });

  await prisma.workItem.create({
    data: {
      title: "Dashboard-Layout",
      description: "Haupt-Dashboard mit allen wichtigen Informationen",
      type: WorkItemType.EPIC,
      priority: Priority.HIGH,
      storyPoints: 8,
      projectId: project.id,
      stateId: todoState.id,
      assigneeId: user3.id,
      creatorId: user1.id,
      sprintId: sprint.id,
    },
  });

  const bug1 = await prisma.workItem.create({
    data: {
      title: "Bug: Login-Button reagiert nicht",
      description: "Der Login-Button auf der Startseite zeigt keine Reaktion beim Klicken",
      type: WorkItemType.BUG,
      priority: Priority.CRITICAL,
      storyPoints: 2,
      projectId: project.id,
      stateId: reviewState.id,
      assigneeId: user2.id,
      creatorId: user3.id,
      sprintId: sprint.id,
      details: {
        create: {
          reproSteps: "1. Öffne die Startseite\n2. Klicke auf den Login-Button\n3. Keine Reaktion sichtbar",
          businessValue: "Kritisch - blockt Benutzeranmeldung",
        },
      },
    },
  });

  await prisma.workItem.create({
    data: {
      title: "Console-Logs prüfen",
      type: WorkItemType.SUB_TASK,
      priority: Priority.HIGH,
      projectId: project.id,
      stateId: doneState.id,
      assigneeId: user2.id,
      creatorId: user2.id,
      parentId: bug1.id,
    },
  });

  await prisma.workItem.create({
    data: {
      title: "E-Mail-Benachrichtigungen",
      description: "System für automatische E-Mail-Benachrichtigungen",
      type: WorkItemType.FEATURE,
      priority: Priority.LOW,
      storyPoints: 13,
      projectId: project.id,
      stateId: backlogState.id,
      creatorId: user1.id,
    },
  });

  await prisma.tag.createMany({
    data: [
      { name: "frontend", color: "#3B82F6" },
      { name: "backend", color: "#10B981" },
      { name: "security", color: "#EF4444" },
    ],
  });

  await prisma.userSkillProfile.createMany({
    data: [
      {
        userId: user1.id,
        skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
        proficiencyScores: { React: 5, "Node.js": 5, TypeScript: 4, PostgreSQL: 4 },
        overallProficiency: 4.5,
      },
      {
        userId: user2.id,
        skills: ["React", "CSS", "UI/UX", "Testing"],
        proficiencyScores: { React: 4, CSS: 5, "UI/UX": 4, Testing: 3 },
        overallProficiency: 4.0,
      },
      {
        userId: user3.id,
        skills: ["DevOps", "AWS", "Docker", "CI/CD"],
        proficiencyScores: { DevOps: 5, AWS: 4, Docker: 5, "CI/CD": 5 },
        overallProficiency: 4.75,
      },
    ],
  });

  console.log("✅ Database seeded successfully!");
  console.log(`   - Organization: ${org.name}`);
  console.log(`   - Users: ${user1.email}, ${user2.email}, ${user3.email}`);
  console.log(`   - Project: ${project.name} (${project.key})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
