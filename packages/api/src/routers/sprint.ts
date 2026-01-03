import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const sprintRouter = router({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.sprint.findMany({
                where: { projectId: input.projectId },
                orderBy: { startDate: "desc" },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                goal: z.string().optional(),
                startDate: z.string().transform((str) => new Date(str)),
                endDate: z.string().transform((str) => new Date(str)),
                projectId: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.sprint.create({
                data: input,
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                goal: z.string().optional(),
                startDate: z.string().transform((str) => new Date(str)).optional(),
                endDate: z.string().transform((str) => new Date(str)).optional(),
                state: z.string().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.prisma.sprint.update({
                where: { id },
                data,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.sprint.delete({
                where: { id: input.id },
            });
        }),

    getWorkItems: protectedProcedure
        .input(z.object({ sprintId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.workItem.findMany({
                where: { sprintId: input.sprintId },
                include: {
                    assignee: true,
                    state: true,
                },
                orderBy: { order: "asc" },
            });
        }),

    getActive: protectedProcedure
        .input(z.object({ limit: z.number().default(3) }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Get user's projects
            const userProjects = await ctx.prisma.project.findMany({
                where: {
                    organization: {
                        users: {
                            some: {
                                userId: userId,
                            },
                        },
                    },
                },
                select: { id: true },
            });

            const projectIds = userProjects.map((p: { id: string }) => p.id);

            // Get active sprints with task counts
            const activeSprints = await ctx.prisma.sprint.findMany({
                where: {
                    projectId: { in: projectIds },
                    state: "active",
                },
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            key: true,
                        },
                    },
                    _count: {
                        select: {
                            workItems: true,
                        },
                    },
                },
                orderBy: { endDate: "asc" },
                take: input.limit,
            });

            // For each sprint, get task counts by state category
            const sprintsWithStats = await Promise.all(
                activeSprints.map(async (sprint: any) => {
                    const tasksByState = await ctx.prisma.workItem.groupBy({
                        by: ["stateId"],
                        where: { sprintId: sprint.id },
                        _count: true,
                    });

                    // Get state categories
                    const stateIds = tasksByState.map((t: any) => t.stateId);
                    const states = await ctx.prisma.workItemState.findMany({
                        where: { id: { in: stateIds } },
                        select: { id: true, category: true },
                    });

                    const stateMap = new Map(states.map((s: any) => [s.id, s.category]));

                    let todoCount = 0;
                    let inProgressCount = 0;
                    let doneCount = 0;

                    tasksByState.forEach((t: any) => {
                        const category = stateMap.get(t.stateId);
                        if (category === "DONE") doneCount += t._count;
                        else if (category === "IN_PROGRESS") inProgressCount += t._count;
                        else todoCount += t._count;
                    });

                    return {
                        ...sprint,
                        stats: {
                            total: sprint._count.workItems,
                            todo: todoCount,
                            inProgress: inProgressCount,
                            done: doneCount,
                        },
                    };
                }),
            );

            return sprintsWithStats;
        }),
});
