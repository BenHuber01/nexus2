import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const dashboardRouter = router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        // Get count of open tasks assigned to user
        const openTasksCount = await ctx.prisma.workItem.count({
            where: {
                assigneeId: userId,
                state: {
                    category: {
                        notIn: ["DONE"],
                    },
                },
            },
        });

        // Get count of tasks due this week
        const now = new Date();
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(now.getDate() + 7);

        const dueThisWeekCount = await ctx.prisma.workItem.count({
            where: {
                assigneeId: userId,
                dueDate: {
                    gte: now,
                    lte: oneWeekFromNow,
                },
                state: {
                    category: {
                        notIn: ["DONE"],
                    },
                },
            },
        });

        // Get count of active sprints in user's projects
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

        const activeSprintsCount = await ctx.prisma.sprint.count({
            where: {
                projectId: { in: projectIds },
                state: "active",
            },
        });

        // Get count of recent comments on user's tasks (last 24h)
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        const recentCommentsCount = await ctx.prisma.comment.count({
            where: {
                workItem: {
                    assigneeId: userId,
                },
                createdAt: {
                    gte: yesterday,
                },
                userId: {
                    not: userId, // Exclude user's own comments
                },
            },
        });

        return {
            openTasksCount,
            dueThisWeekCount,
            activeSprintsCount,
            recentCommentsCount,
        };
    }),
});
