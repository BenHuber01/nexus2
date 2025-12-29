import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const teamRouter = router({
    /**
     * Get all teams for an organization
     */
    getAll: protectedProcedure
        .input(z.object({ organizationId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.team.findMany({
                where: { organizationId: input.organizationId },
                include: {
                    members: {
                        include: { user: true },
                    },
                },
            });
        }),

    /**
     * Get a single team by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.team.findUnique({
                where: { id: input.id },
                include: {
                    members: {
                        include: { user: true },
                    },
                    projects: true,
                },
            });
        }),

    /**
     * Create a new team
     */
    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1).max(100),
                description: z.string().optional(),
                organizationId: z.string(),
                velocityHistory: z.array(z.number()).optional(),
                settings: z.any().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.team.create({
                data: {
                    ...input,
                    velocityHistory: input.velocityHistory || [],
                    settings: input.settings || {},
                },
                include: {
                    members: {
                        include: { user: true },
                    },
                },
            });
        }),

    /**
     * Update an existing team
     */
    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).max(100).optional(),
                description: z.string().optional().nullable(),
                velocityHistory: z.array(z.number()).optional(),
                settings: z.any().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.prisma.team.update({
                where: { id },
                data,
                include: {
                    members: {
                        include: { user: true },
                    },
                    projects: true,
                },
            });
        }),

    /**
     * Delete a team
     * Note: Will cascade delete all team memberships
     */
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check if team has active projects
            const projectCount = await ctx.prisma.project.count({
                where: {
                    teams: {
                        some: { id: input.id },
                    },
                },
            });

            if (projectCount > 0) {
                throw new Error(
                    `Cannot delete team: ${projectCount} project(s) are assigned to this team. Please unassign projects first.`,
                );
            }

            return ctx.prisma.team.delete({
                where: { id: input.id },
            });
        }),
});
