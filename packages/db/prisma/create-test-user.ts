import prisma from "@my-better-t-app/db/client";

async function createTestUser() {
  console.log("🔐 Creating test user with Better-Auth...");

  try {
    // Check if user already exists in Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email: "test@nexus.com" },
    });

    if (existingUser) {
      console.log("❌ User test@nexus.com already exists in database");
      process.exit(1);
    }

    // Get organization
    const org = await prisma.organization.findFirst({
      where: { slug: "nexus-corp" },
    });

    if (!org) {
      console.log("❌ Organization 'nexus-corp' not found. Run seed first!");
      process.exit(1);
    }

    // Create user in Prisma first
    const user = await prisma.user.create({
      data: {
        email: "test@nexus.com",
        firstName: "Test",
        lastName: "User",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
        availabilityHours: 40,
      },
    });

    // Add to organization as member
    await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "member",
      },
    });

    // Add to Engineering team
    const team = await prisma.team.findFirst({
      where: { organizationId: org.id, name: "Engineering" },
    });

    if (team) {
      await prisma.teamMembership.create({
        data: {
          userId: user.id,
          teamId: team.id,
        },
      });
    }

    console.log("✅ User created in Prisma");
    console.log("📧 Email: test@nexus.com");
    console.log("👤 Name: Test User");
    console.log("🏢 Organization: Nexus Corp (member)");
    console.log("");
    console.log("⚠️  IMPORTANT: You need to sign up with this email via the frontend first!");
    console.log("   1. Go to http://localhost:3001/sign-up");
    console.log("   2. Enter: test@nexus.com / password123");
    console.log("   3. Better-Auth will link to existing user");
    console.log("");
    console.log("   Or use existing member: jane@nexus.com (needs signup too)");

  } catch (error) {
    console.error("❌ Error creating user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
