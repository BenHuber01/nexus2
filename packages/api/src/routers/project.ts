import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const projectRouter = router({
    getAll: protectedProcedure
        .input(z.object({ organizationId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.project.findMany({
                where: { organizationId: input.organizationId },
                include: {
                    leadUser: true,
                    _count: {
                        select: {
                            workItems: true,
                            sprints: true,
                        },
                    },
                },
                orderBy: { name: "asc" },
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.project.findUnique({
                where: { id: input.id },
                include: {
                    workItems: {
                        take: 10,
                        orderBy: { updatedAt: "desc" },
                    },
                    sprints: true,
                    workItemStates: true,
                    organization: {
                        include: {
                            users: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },
                },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                key: z.string(),
                description: z.string().optional(),
                organizationId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const project = await ctx.prisma.project.create({
                data: {
                    ...input,
                    leadUserId: ctx.session.user.id,
                    workItemStates: {
                        create: [
                            { name: "Todo", category: "TODO", position: 0, isInitial: true },
                            { name: "In Progress", category: "IN_PROGRESS", position: 1 },
                            { name: "Done", category: "DONE", position: 2, isFinal: true },
                        ],
                    },
                },
                include: {
                    workItemStates: true,
                },
            });

            await ctx.prisma.board.create({
                data: {
                    name: "Default Board",
                    projectId: project.id,
                    isDefault: true,
                    lanes: {
                        create: project.workItemStates.map((state: any) => ({
                            name: state.name,
                            position: state.position,
                            mappedStates: [state.id],
                        })),
                    },
                },
            });

            return project;
        }),
});
